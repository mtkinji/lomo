import AVFAudio
import ExpoModulesCore

public final class KwiltCookVoiceProcessingModule: Module {
  private let engine = AVAudioEngine()
  private var isMonitoring = false
  private var thresholdDecibels: Float = -32
  private var requiredFrames = 6
  private var speechFrames = 0
  private var lastEventAt = Date.distantPast

  public func definition() -> ModuleDefinition {
    Name("KwiltCookVoiceProcessing")
    Events("onBargeIn")

    Function("isAvailable") { true }

    AsyncFunction("startMonitoring") { (threshold: Double, minimumSpeechMilliseconds: Double) in
      try self.startMonitoring(
        threshold: Float(min(max(threshold, -60), -10)),
        minimumSpeechMilliseconds: min(max(minimumSpeechMilliseconds, 80), 500)
      )
    }

    AsyncFunction("stopMonitoring") {
      self.stopMonitoring()
    }

    OnDestroy {
      self.stopMonitoring()
    }
  }

  private func startMonitoring(threshold: Float, minimumSpeechMilliseconds: Double) throws {
    stopMonitoring()
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .voiceChat,
      options: [.defaultToSpeaker, .allowBluetoothHFP]
    )
    try session.setActive(true)

    let input = engine.inputNode
    try input.setVoiceProcessingEnabled(true)
    thresholdDecibels = threshold
    // A 1024-frame input buffer is about 23 ms at 44.1 kHz.
    requiredFrames = max(3, Int(ceil(minimumSpeechMilliseconds / 23.0)))
    speechFrames = 0
    lastEventAt = .distantPast

    input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { [weak self] buffer, _ in
      guard let self else { return }
      self.analyze(buffer)
    }
    isMonitoring = true
    do {
      engine.prepare()
      try engine.start()
    } catch {
      stopMonitoring()
      throw error
    }
  }

  private func analyze(_ buffer: AVAudioPCMBuffer) {
    guard isMonitoring,
          let channels = buffer.floatChannelData,
          buffer.frameLength > 0 else { return }
    let samples = channels[0]
    var sum: Float = 0
    for index in 0..<Int(buffer.frameLength) {
      let value = samples[index]
      sum += value * value
    }
    let rms = sqrt(sum / Float(buffer.frameLength))
    let decibels = rms > 0 ? 20 * log10(rms) : -160
    if decibels >= thresholdDecibels {
      speechFrames += 1
    } else {
      speechFrames = max(0, speechFrames - 2)
    }
    guard speechFrames >= requiredFrames, Date().timeIntervalSince(lastEventAt) > 0.8 else { return }
    speechFrames = 0
    lastEventAt = Date()
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent("onBargeIn", ["level": Double(decibels)])
    }
  }

  private func stopMonitoring() {
    guard isMonitoring || engine.isRunning else { return }
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    try? engine.inputNode.setVoiceProcessingEnabled(false)
    speechFrames = 0
    isMonitoring = false
  }
}
