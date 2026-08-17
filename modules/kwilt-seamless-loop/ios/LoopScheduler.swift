import AVFAudio
import Foundation

enum LoopSchedulerError: String, Error {
  case notPrepared
  case engineStartFailed
  case invalidFrameLength
  case probeRenderFailed
}

final class LoopScheduler {
  typealias DiagnosticsHandler = ([String: Any]) -> Void

  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private let controlQueue = DispatchQueue(label: "app.kwilt.seamless-loop.scheduler")
  private let targetQueuedSegments = 3
  private var file: AVAudioFile?
  private var fileURL: URL?
  private var frameLength: AVAudioFramePosition = 0
  private var assetKey: String?
  private var state = "idle"
  private var queuedSegments = 0
  private var completedBoundaries = 0
  private var underrunCount = 0
  private var underrunEpisode = false
  private var lastErrorCode: String?
  private var generation: UInt64 = 0
  private var rampGeneration: UInt64 = 0
  private var pendingRampCancellation: (() -> Void)?
  private var isRebuilding = false
  private var desiredPlaying = false
  private var resumeAfterInterruption = false
  private var targetVolume: Float = 0
  private var diagnosticsHandler: DiagnosticsHandler?

  init() {
    engine.attach(player)
  }

  func setDiagnosticsHandler(_ handler: DiagnosticsHandler?) {
    controlQueue.async { [weak self] in self?.diagnosticsHandler = handler }
  }

  func prepare(_ prepared: PreparedLoopFile, assetKey: String) async throws -> [String: Any] {
    try await perform {
      self.unloadLocked(emit: false)
      self.generation &+= 1
      self.assetKey = assetKey
      self.state = "preparing"
      self.lastErrorCode = nil
      self.fileURL = prepared.url
      self.frameLength = prepared.frameLength
      guard prepared.frameLength > 0 else { throw LoopSchedulerError.invalidFrameLength }
      let file = try AVAudioFile(forReading: prepared.url)
      self.file = file
      self.engine.connect(self.player, to: self.engine.mainMixerNode, format: file.processingFormat)
      self.player.volume = 0
      try self.fillQueueLocked(generation: self.generation)
      self.state = "ready"
      self.emitDiagnosticsLocked()
      return self.diagnosticsLocked()
    }
  }

  func play(volume: Double, fadeDurationMs: Double) async throws -> [String: Any] {
    try await performAfterRamp(target: self.clampedVolume(volume), durationMs: fadeDurationMs) {
      guard self.file != nil else { throw LoopSchedulerError.notPrepared }
      try self.configureAudioSessionLocked()
      if !self.engine.isRunning {
        self.engine.prepare()
        do { try self.engine.start() }
        catch { throw LoopSchedulerError.engineStartFailed }
      }
      self.desiredPlaying = true
      if !self.player.isPlaying { self.player.play() }
      self.state = "playing"
      self.targetVolume = self.clampedVolume(volume)
      self.emitDiagnosticsLocked()
    }
  }

  func pause(fadeDurationMs: Double) async throws -> [String: Any] {
    try await performAfterRamp(target: 0, durationMs: fadeDurationMs) {
      self.desiredPlaying = false
      self.resumeAfterInterruption = false
      if self.player.isPlaying { self.player.pause() }
      self.state = self.file == nil ? "idle" : "paused"
      self.emitDiagnosticsLocked()
    }
  }

  func setVolume(volume: Double, fadeDurationMs: Double) async throws -> [String: Any] {
    try await performAfterRamp(target: self.clampedVolume(volume), durationMs: fadeDurationMs) {
      self.targetVolume = self.clampedVolume(volume)
      self.emitDiagnosticsLocked()
    }
  }

  func unload() async -> [String: Any] {
    await withCheckedContinuation { continuation in
      controlQueue.async {
        self.unloadLocked(emit: true)
        continuation.resume(returning: self.diagnosticsLocked())
      }
    }
  }

  func getDiagnostics() -> [String: Any] {
    controlQueue.sync { diagnosticsLocked() }
  }

  func runContinuityProbe(loopCount: Int) async throws -> [String: Any] {
    try await perform {
      guard let fileURL = self.fileURL else { throw LoopSchedulerError.notPrepared }
      let requestedLoops = min(max(loopCount, 1), 12)
      let probeFile = try AVAudioFile(forReading: fileURL)
      let probeEngine = AVAudioEngine()
      let probePlayer = AVAudioPlayerNode()
      probeEngine.attach(probePlayer)
      probeEngine.connect(probePlayer, to: probeEngine.mainMixerNode, format: probeFile.processingFormat)
      try probeEngine.enableManualRenderingMode(
        .offline,
        format: probeFile.processingFormat,
        maximumFrameCount: 4_096
      )
      for _ in 0...requestedLoops {
        probePlayer.scheduleSegment(
          probeFile,
          startingFrame: 0,
          frameCount: AVAudioFrameCount(probeFile.length),
          at: nil
        )
      }
      try probeEngine.start()
      probePlayer.play()

      guard let buffer = AVAudioPCMBuffer(
        pcmFormat: probeEngine.manualRenderingFormat,
        frameCapacity: probeEngine.manualRenderingMaximumFrameCount
      ) else { throw LoopSchedulerError.invalidFrameLength }
      let totalFrames = probeFile.length * AVAudioFramePosition(requestedLoops + 1)
      var renderedFrames: AVAudioFramePosition = 0
      var previousSamples = Array(repeating: Float(0), count: Int(probeFile.processingFormat.channelCount))
      var worstBoundaryJump: Float = 0
      while renderedFrames < totalFrames {
        let remaining = totalFrames - renderedFrames
        let frames = AVAudioFrameCount(min(AVAudioFramePosition(buffer.frameCapacity), remaining))
        let renderStatus = try probeEngine.renderOffline(frames, to: buffer)
        guard renderStatus == .success, let channels = buffer.floatChannelData else {
          throw LoopSchedulerError.probeRenderFailed
        }
        for frame in 0..<Int(buffer.frameLength) {
          let absoluteFrame = renderedFrames + AVAudioFramePosition(frame)
          for channel in 0..<Int(buffer.format.channelCount) {
            let sample = channels[channel][frame]
            if absoluteFrame > 0 && absoluteFrame % probeFile.length == 0 {
              worstBoundaryJump = max(worstBoundaryJump, abs(sample - previousSamples[channel]))
            }
            previousSamples[channel] = sample
          }
        }
        renderedFrames += AVAudioFramePosition(buffer.frameLength)
      }
      probePlayer.stop()
      probeEngine.stop()
      var result = self.diagnosticsLocked()
      result["completedBoundaries"] = requestedLoops
      result["worstBoundaryJumpDbfs"] = worstBoundaryJump > 0
        ? 20 * log10(Double(worstBoundaryJump))
        : -160
      return result
    }
  }

  func handleInterruptionBegan() {
    controlQueue.async {
      self.resumeAfterInterruption = self.desiredPlaying
      if self.player.isPlaying { self.player.pause() }
      if self.file != nil { self.state = "paused" }
      self.emitDiagnosticsLocked()
    }
  }

  func handleInterruptionEnded(shouldResume: Bool) {
    controlQueue.async {
      guard shouldResume, self.resumeAfterInterruption, self.desiredPlaying, self.file != nil else {
        self.resumeAfterInterruption = false
        return
      }
      do {
        try self.configureAudioSessionLocked()
        if !self.engine.isRunning {
          self.engine.prepare()
          try self.engine.start()
        }
        self.player.play()
        self.player.volume = self.targetVolume
        self.state = "playing"
        self.resumeAfterInterruption = false
        self.emitDiagnosticsLocked()
      } catch {
        self.failLocked(error)
      }
    }
  }

  func rebuildAfterConfigurationChange() {
    controlQueue.async {
      guard !self.isRebuilding, let url = self.fileURL, self.frameLength > 0 else { return }
      self.isRebuilding = true
      defer { self.isRebuilding = false }
      let shouldResume = self.desiredPlaying
      let resumeVolume = self.targetVolume
      let offset: AVAudioFramePosition
      if let renderTime = self.player.lastRenderTime,
         let playerTime = self.player.playerTime(forNodeTime: renderTime) {
        offset = max(0, playerTime.sampleTime % self.frameLength)
      } else {
        offset = 0
      }
      do {
        self.generation &+= 1
        self.player.stop()
        self.engine.stop()
        self.engine.reset()
        self.queuedSegments = 0
        let file = try AVAudioFile(forReading: url)
        self.file = file
        self.engine.connect(self.player, to: self.engine.mainMixerNode, format: file.processingFormat)
        try self.scheduleRemainderLocked(from: offset, generation: self.generation)
        try self.fillQueueLocked(generation: self.generation)
        if shouldResume {
          try self.configureAudioSessionLocked()
          self.engine.prepare()
          try self.engine.start()
          self.player.volume = resumeVolume
          self.player.play()
          self.state = "playing"
        } else {
          self.state = "paused"
        }
        self.emitDiagnosticsLocked()
      } catch {
        self.failLocked(error)
      }
    }
  }

  func destroy() {
    controlQueue.sync { unloadLocked(emit: false) }
  }

  private func fillQueueLocked(generation: UInt64) throws {
    guard let file else { throw LoopSchedulerError.notPrepared }
    while queuedSegments < targetQueuedSegments {
      queuedSegments += 1
      player.scheduleSegment(
        file,
        startingFrame: 0,
        frameCount: AVAudioFrameCount(frameLength),
        at: nil,
        completionCallbackType: .dataRendered
      ) { [weak self] _ in
        self?.segmentRendered(generation: generation)
      }
    }
  }

  private func scheduleRemainderLocked(from offset: AVAudioFramePosition, generation: UInt64) throws {
    guard let file else { throw LoopSchedulerError.notPrepared }
    let safeOffset = min(max(0, offset), frameLength - 1)
    queuedSegments += 1
    player.scheduleSegment(
      file,
      startingFrame: safeOffset,
      frameCount: AVAudioFrameCount(frameLength - safeOffset),
      at: nil,
      completionCallbackType: .dataRendered
    ) { [weak self] _ in
      self?.segmentRendered(generation: generation)
    }
  }

  private func segmentRendered(generation: UInt64) {
    controlQueue.async {
      guard generation == self.generation, self.file != nil else { return }
      self.queuedSegments = max(0, self.queuedSegments - 1)
      self.completedBoundaries += 1
      if self.state == "playing" && self.queuedSegments < 2 {
        if !self.underrunEpisode { self.underrunCount += 1 }
        self.underrunEpisode = true
      } else if self.queuedSegments >= 2 {
        self.underrunEpisode = false
      }
      do { try self.fillQueueLocked(generation: generation) }
      catch { self.failLocked(error) }
      #if DEBUG
      self.emitDiagnosticsLocked()
      #endif
    }
  }

  private func perform<T>(_ operation: @escaping () throws -> T) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
      controlQueue.async {
        do { continuation.resume(returning: try operation()) }
        catch {
          self.failLocked(error)
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func performAfterRamp(
    target: Float,
    durationMs: Double,
    completion: @escaping () throws -> Void
  ) async throws -> [String: Any] {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[String: Any], Error>) in
      controlQueue.async {
        var resolved = false
        let resolve: (Result<[String: Any], Error>) -> Void = { result in
          guard !resolved else { return }
          resolved = true
          continuation.resume(with: result)
        }
        do {
          if target > 0 { try completion() }
          self.rampLocked(to: target, durationMs: durationMs, onCancel: {
            resolve(.success(self.diagnosticsLocked()))
          }) {
            do {
              if target == 0 { try completion() }
              resolve(.success(self.diagnosticsLocked()))
            } catch {
              self.failLocked(error)
              resolve(.failure(error))
            }
          }
        } catch {
          self.failLocked(error)
          resolve(.failure(error))
        }
      }
    }
  }

  private func rampLocked(
    to target: Float,
    durationMs: Double,
    onCancel: @escaping () -> Void,
    completion: @escaping () -> Void
  ) {
    cancelRampLocked()
    rampGeneration &+= 1
    let ramp = rampGeneration
    pendingRampCancellation = onCancel
    let start = player.volume
    let duration = max(0, durationMs)
    if duration == 0 || abs(start - target) < 0.001 {
      player.volume = target
      pendingRampCancellation = nil
      completion()
      return
    }
    let steps = max(8, Int(duration / 20))
    let interval = duration / Double(steps) / 1_000
    var step = 0
    func tick() {
      self.controlQueue.asyncAfter(deadline: .now() + interval) {
        guard ramp == self.rampGeneration else { return }
        step += 1
        let progress = Double(step) / Double(steps)
        let eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - pow(-2 * progress + 2, 3) / 2
        self.player.volume = start + (target - start) * Float(eased)
        if step >= steps {
          self.player.volume = target
          self.pendingRampCancellation = nil
          completion()
        } else {
          tick()
        }
      }
    }
    tick()
  }

  private func configureAudioSessionLocked() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playback, mode: .default, options: [.duckOthers])
    try session.setActive(true)
  }

  private func unloadLocked(emit: Bool) {
    generation &+= 1
    cancelRampLocked()
    desiredPlaying = false
    resumeAfterInterruption = false
    player.stop()
    engine.stop()
    engine.reset()
    engine.disconnectNodeOutput(player)
    file = nil
    fileURL = nil
    frameLength = 0
    assetKey = nil
    state = "idle"
    queuedSegments = 0
    completedBoundaries = 0
    underrunCount = 0
    underrunEpisode = false
    lastErrorCode = nil
    targetVolume = 0
    isRebuilding = false
    player.volume = 0
    if emit { emitDiagnosticsLocked() }
  }

  private func failLocked(_ error: Error) {
    state = "error"
    lastErrorCode = (error as? LoopSchedulerError)?.rawValue
      ?? (error as? LoopPCMCacheError)?.rawValue
      ?? "native_failure"
    emitDiagnosticsLocked()
  }

  private func diagnosticsLocked() -> [String: Any] {
    [
      "state": state,
      "assetKey": assetKey ?? NSNull(),
      "queuedSegments": queuedSegments,
      "completedBoundaries": completedBoundaries,
      "underrunCount": underrunCount,
      "lastErrorCode": lastErrorCode ?? NSNull(),
    ]
  }

  private func emitDiagnosticsLocked() {
    diagnosticsHandler?(diagnosticsLocked())
  }

  private func clampedVolume(_ volume: Double) -> Float {
    Float(min(max(volume.isFinite ? volume : 0, 0), 1))
  }

  private func cancelRampLocked() {
    rampGeneration &+= 1
    let cancellation = pendingRampCancellation
    pendingRampCancellation = nil
    cancellation?()
  }
}
