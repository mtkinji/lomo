import AVFAudio
import Foundation

struct PreparedLoopFile {
  let url: URL
  let frameLength: AVAudioFramePosition
  let format: AVAudioFormat
}

enum LoopPCMCacheError: String, Error {
  case nonLocalSource
  case unsupportedFormat
  case emptyAudio
  case decodeFailed
}

final class LoopPCMCache {
  private let fileManager = FileManager.default
  private let queue = DispatchQueue(label: "app.kwilt.seamless-loop.pcm-cache", qos: .utility)
  private var generation: UInt64 = 0

  func prepare(
    uri: String,
    assetKey: String,
    expectedSampleRateHz: Double,
    expectedChannels: AVAudioChannelCount
  ) async throws -> PreparedLoopFile {
    try await withCheckedThrowingContinuation { continuation in
      queue.async { [weak self] in
        guard let self else {
          continuation.resume(throwing: LoopPCMCacheError.decodeFailed)
          return
        }
        do {
          self.generation &+= 1
          let generation = self.generation
          let prepared = try self.prepareSync(
            uri: uri,
            assetKey: assetKey,
            expectedSampleRateHz: expectedSampleRateHz,
            expectedChannels: expectedChannels,
            generation: generation
          )
          continuation.resume(returning: prepared)
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  func clear() {
    queue.async { [weak self] in
      guard let self else { return }
      self.generation &+= 1
      try? self.removeCachedFiles(keeping: nil)
    }
  }

  private func prepareSync(
    uri: String,
    assetKey: String,
    expectedSampleRateHz: Double,
    expectedChannels: AVAudioChannelCount,
    generation: UInt64
  ) throws -> PreparedLoopFile {
    guard let sourceURL = URL(string: uri), sourceURL.isFileURL else {
      throw LoopPCMCacheError.nonLocalSource
    }
    let safeKey = assetKey.replacingOccurrences(
      of: "[^a-zA-Z0-9-]",
      with: "-",
      options: .regularExpression
    )
    let directory = try cacheDirectory()
    let destination = directory.appendingPathComponent("\(safeKey).caf")
    let partial = directory.appendingPathComponent("\(safeKey).partial.caf")
    try removeCachedFiles(keeping: destination)
    try? fileManager.removeItem(at: partial)

    if let existing = try? validate(
      url: destination,
      expectedSampleRateHz: expectedSampleRateHz,
      expectedChannels: expectedChannels
    ) {
      return existing
    }
    try? fileManager.removeItem(at: destination)

    do {
      let source = try AVAudioFile(forReading: sourceURL)
      let format = source.processingFormat
      guard abs(format.sampleRate - expectedSampleRateHz) < 0.5,
            format.channelCount == expectedChannels else {
        throw LoopPCMCacheError.unsupportedFormat
      }
      guard source.length > 0 else { throw LoopPCMCacheError.emptyAudio }

      let output = try AVAudioFile(
        forWriting: partial,
        settings: format.settings,
        commonFormat: format.commonFormat,
        interleaved: format.isInterleaved
      )
      guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 32_768) else {
        throw LoopPCMCacheError.decodeFailed
      }
      var framesWritten: AVAudioFramePosition = 0
      while true {
        guard generation == self.generation else { throw CancellationError() }
        buffer.frameLength = 0
        try source.read(into: buffer, frameCount: buffer.frameCapacity)
        if buffer.frameLength == 0 { break }
        try output.write(from: buffer)
        framesWritten += AVAudioFramePosition(buffer.frameLength)
      }
      guard framesWritten > 0 else { throw LoopPCMCacheError.emptyAudio }

      try fileManager.moveItem(at: partial, to: destination)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      var mutableDestination = destination
      try? mutableDestination.setResourceValues(values)
      return try validate(
        url: destination,
        expectedSampleRateHz: expectedSampleRateHz,
        expectedChannels: expectedChannels
      )
    } catch let error as LoopPCMCacheError {
      try? fileManager.removeItem(at: partial)
      throw error
    } catch is CancellationError {
      try? fileManager.removeItem(at: partial)
      throw CancellationError()
    } catch {
      try? fileManager.removeItem(at: partial)
      throw LoopPCMCacheError.decodeFailed
    }
  }

  private func validate(
    url: URL,
    expectedSampleRateHz: Double,
    expectedChannels: AVAudioChannelCount
  ) throws -> PreparedLoopFile {
    let file = try AVAudioFile(forReading: url)
    let format = file.processingFormat
    guard abs(format.sampleRate - expectedSampleRateHz) < 0.5,
          format.channelCount == expectedChannels else {
      throw LoopPCMCacheError.unsupportedFormat
    }
    guard file.length > 0 else { throw LoopPCMCacheError.emptyAudio }
    return PreparedLoopFile(url: url, frameLength: file.length, format: format)
  }

  private func cacheDirectory() throws -> URL {
    let base = try fileManager.url(
      for: .cachesDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let directory = base.appendingPathComponent("kwilt-loop-pcm", isDirectory: true)
    try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var mutableDirectory = directory
    try? mutableDirectory.setResourceValues(values)
    return directory
  }

  private func removeCachedFiles(keeping destination: URL?) throws {
    let directory = try cacheDirectory()
    for file in try fileManager.contentsOfDirectory(
      at: directory,
      includingPropertiesForKeys: nil
    ) where file != destination {
      try? fileManager.removeItem(at: file)
    }
  }
}
