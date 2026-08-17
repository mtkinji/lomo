import ExpoModulesCore
import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

private struct GenerateTextOptions: Record {
  @Field var requestId: String = ""
  @Field var prompt: String = ""
  @Field var instructions: String = ""
  @Field var maximumResponseTokens: Int = 192
}

private struct BenchmarkInput: Decodable {
  struct Case: Decodable {
    let id: String
    let prompt: String
    let instructions: String
    let maximumResponseTokens: Int
  }
  let repetitions: Int
  let prewarmDelayMs: Int
  let variants: [String]
  let cases: [Case]
}

private struct BenchmarkResult: Codable {
  let caseId: String
  let variant: String
  let repetition: Int
  let queueWaitMs: Int
  let sessionCreateMs: Int
  let prewarmCallMs: Int
  let firstOutputMs: Int?
  let totalMs: Int
  let output: String?
  let error: String?
}

@available(iOS 16.0, *)
private func elapsedMilliseconds(since start: ContinuousClock.Instant) -> Int {
  let duration = start.duration(to: .now)
  return Int(duration.components.seconds * 1_000) +
    Int(duration.components.attoseconds / 1_000_000_000_000_000)
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
private actor FoundationModelGenerationQueue {
  private var isGenerating = false
  private var waiters: [(id: UUID, continuation: CheckedContinuation<Bool, Never>)] = []
  private var prewarmSession: LanguageModelSession?

  private func acquire() async -> Bool {
    if !isGenerating {
      isGenerating = true
      return true
    }
    let waiterId = UUID()
    return await withTaskCancellationHandler {
      await withCheckedContinuation { continuation in
        waiters.append((waiterId, continuation))
      }
    } onCancel: {
      Task { await self.cancelWaiter(waiterId) }
    }
  }

  private func cancelWaiter(_ waiterId: UUID) {
    guard let index = waiters.firstIndex(where: { $0.id == waiterId }) else { return }
    waiters.remove(at: index).continuation.resume(returning: false)
  }

  private func release() {
    if waiters.isEmpty {
      isGenerating = false
    } else {
      waiters.removeFirst().continuation.resume(returning: true)
    }
  }

  func prewarm() {
    guard prewarmSession == nil else { return }
    let session = LanguageModelSession(instructions: "")
    prewarmSession = session
    session.prewarm()
  }

  func generate(
    prompt: String,
    instructions: String,
    maximumResponseTokens: Int,
    onSnapshot: @escaping (String, Int) -> Void
  ) async throws -> (text: String, durationMs: Int) {
    guard await acquire() else { throw CancellationError() }
    defer { release() }
    try Task.checkCancellation()
    let startedAt = ContinuousClock.now
    let session = LanguageModelSession(instructions: instructions)
    let stream = session.streamResponse(
      to: prompt,
      options: GenerationOptions(
        sampling: .greedy,
        maximumResponseTokens: min(max(maximumResponseTokens, 16), 256)
      )
    )
    var output = ""
    for try await snapshot in stream {
      try Task.checkCancellation()
      guard snapshot.content != output else { continue }
      output = snapshot.content
      if !output.isEmpty {
        onSnapshot(output, elapsedMilliseconds(since: startedAt))
      }
    }
    return (output, elapsedMilliseconds(since: startedAt))
  }

  func benchmark(_ input: BenchmarkInput) async -> [BenchmarkResult] {
    var results: [BenchmarkResult] = []
    for benchmarkCase in input.cases {
      for variant in input.variants {
        for repetition in 1...max(1, input.repetitions) {
          let queuedAt = ContinuousClock.now
          guard await acquire() else { continue }
          let queueWaitMs = elapsedMilliseconds(since: queuedAt)
          let totalStartedAt = ContinuousClock.now
          do {
            let sessionStartedAt = ContinuousClock.now
            let session = LanguageModelSession(instructions: benchmarkCase.instructions)
            let sessionCreateMs = elapsedMilliseconds(since: sessionStartedAt)
            var prewarmCallMs = 0
            if variant.contains("prewarmed") {
              let prewarmStartedAt = ContinuousClock.now
              session.prewarm(promptPrefix: Prompt(benchmarkCase.prompt))
              prewarmCallMs = elapsedMilliseconds(since: prewarmStartedAt)
              if input.prewarmDelayMs > 0 {
                try await Task.sleep(for: .milliseconds(input.prewarmDelayMs))
              }
            }
            let options = GenerationOptions(
              sampling: .greedy,
              maximumResponseTokens: min(max(benchmarkCase.maximumResponseTokens, 16), 256)
            )
            var firstOutputMs: Int?
            var output = ""
            if variant.hasPrefix("stream") {
              let stream = session.streamResponse(to: benchmarkCase.prompt, options: options)
              for try await snapshot in stream {
                output = snapshot.content
                if firstOutputMs == nil && !output.isEmpty {
                  firstOutputMs = elapsedMilliseconds(since: totalStartedAt)
                }
              }
            } else {
              let response = try await session.respond(to: benchmarkCase.prompt, options: options)
              output = response.content
            }
            results.append(BenchmarkResult(
              caseId: benchmarkCase.id,
              variant: variant,
              repetition: repetition,
              queueWaitMs: queueWaitMs,
              sessionCreateMs: sessionCreateMs,
              prewarmCallMs: prewarmCallMs,
              firstOutputMs: firstOutputMs,
              totalMs: elapsedMilliseconds(since: totalStartedAt),
              output: output,
              error: nil
            ))
          } catch {
            results.append(BenchmarkResult(
              caseId: benchmarkCase.id,
              variant: variant,
              repetition: repetition,
              queueWaitMs: queueWaitMs,
              sessionCreateMs: 0,
              prewarmCallMs: 0,
              firstOutputMs: nil,
              totalMs: elapsedMilliseconds(since: totalStartedAt),
              output: nil,
              error: String(describing: error)
            ))
          }
          release()
        }
      }
    }
    return results
  }
}
#endif

private final class GenerationTaskHandle {
  private let lock = NSLock()
  private var task: Task<Void, Never>?
  private var wasCancelled = false

  func install(_ task: Task<Void, Never>) {
    lock.lock()
    self.task = task
    let shouldCancel = wasCancelled
    lock.unlock()
    if shouldCancel { task.cancel() }
  }

  func cancel() {
    lock.lock()
    wasCancelled = true
    let task = task
    lock.unlock()
    task?.cancel()
  }
}

public final class KwiltFoundationModelsModule: Module {
  #if canImport(FoundationModels)
  @available(iOS 26.0, *)
  private static let generationQueue = FoundationModelGenerationQueue()
  #endif
  private let generationTasksLock = NSLock()
  private var generationTasks: [String: GenerationTaskHandle] = [:]

  private func storeGenerationTask(_ handle: GenerationTaskHandle, requestId: String) {
    generationTasksLock.lock()
    generationTasks[requestId] = handle
    generationTasksLock.unlock()
  }

  private func takeGenerationTask(requestId: String) -> GenerationTaskHandle? {
    generationTasksLock.lock()
    defer { generationTasksLock.unlock() }
    return generationTasks.removeValue(forKey: requestId)
  }

  private func takeAllGenerationTasks() -> [GenerationTaskHandle] {
    generationTasksLock.lock()
    defer { generationTasksLock.unlock() }
    let tasks = Array(generationTasks.values)
    generationTasks.removeAll()
    return tasks
  }

  public func definition() -> ModuleDefinition {
    Name("KwiltFoundationModels")
    Events("onGenerationSnapshot")

    AsyncFunction("availability") { (localeIdentifier: String?) -> [String: String] in
      self.availability(localeIdentifier: localeIdentifier)
    }

    AsyncFunction("generateText") { (options: GenerateTextOptions, promise: Promise) in
      let handle = GenerationTaskHandle()
      self.storeGenerationTask(handle, requestId: options.requestId)
      let task = Task {
        defer { _ = self.takeGenerationTask(requestId: options.requestId) }
        do {
          let result = try await self.generate(options: options) { text, durationMs in
            self.sendEvent("onGenerationSnapshot", [
              "requestId": options.requestId,
              "text": text,
              "durationMs": durationMs,
            ])
          }
          guard !Task.isCancelled else {
            promise.reject(FoundationModelsCancelledException("On-device generation was cancelled."))
            return
          }
          promise.resolve(["text": result.text, "durationMs": result.durationMs])
        } catch is CancellationError {
          promise.reject(FoundationModelsCancelledException("On-device generation was cancelled."))
        } catch {
          promise.reject(FoundationModelsGenerationException(error.localizedDescription))
        }
      }
      handle.install(task)
    }

    AsyncFunction("prewarm") { (promise: Promise) in
      Task {
        do {
          try await self.prewarm()
          promise.resolve(nil)
        } catch {
          promise.reject(FoundationModelsGenerationException(error.localizedDescription))
        }
      }
    }

    AsyncFunction("runBenchmark") { (payload: String, promise: Promise) in
      #if canImport(FoundationModels)
      guard #available(iOS 26.0, *) else {
        promise.reject(FoundationModelsUnavailableException("Foundation Models requires iOS 26 or later."))
        return
      }
      Task {
        do {
          let input = try JSONDecoder().decode(BenchmarkInput.self, from: Data(payload.utf8))
          let results = await Self.generationQueue.benchmark(input)
          let data = try JSONEncoder().encode(results)
          let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
          let url = directory.appendingPathComponent("kwilt-foundation-models-benchmark.json")
          try data.write(to: url, options: .atomic)
          NSLog("KWILT_FOUNDATION_MODELS_BENCHMARK %@", url.path)
          promise.resolve(url.path)
        } catch {
          promise.reject(FoundationModelsGenerationException(error.localizedDescription))
        }
      }
      #else
      promise.reject(FoundationModelsUnavailableException("Foundation Models is not present in this SDK."))
      #endif
    }

    Function("cancelGeneration") { (requestId: String) in
      self.takeGenerationTask(requestId: requestId)?.cancel()
    }

    OnDestroy {
      self.takeAllGenerationTasks().forEach { $0.cancel() }
    }
  }

  private func availability(localeIdentifier: String?) -> [String: String] {
    #if canImport(FoundationModels)
    guard #available(iOS 26.0, *) else {
      return ["state": "unavailable", "reason": "os_unavailable"]
    }
    let model = SystemLanguageModel.default
    let locale = localeIdentifier.map(Locale.init(identifier:)) ?? Locale.current
    guard model.supportsLocale(locale) else {
      return ["state": "unavailable", "reason": "unsupported_locale"]
    }
    switch model.availability {
    case .available:
      return ["state": "available"]
    case .unavailable(.deviceNotEligible):
      return ["state": "unavailable", "reason": "device_not_eligible"]
    case .unavailable(.appleIntelligenceNotEnabled):
      return ["state": "unavailable", "reason": "apple_intelligence_not_enabled"]
    case .unavailable(.modelNotReady):
      return ["state": "unavailable", "reason": "model_not_ready"]
    @unknown default:
      return ["state": "unavailable", "reason": "model_not_ready"]
    }
    #else
    return ["state": "unavailable", "reason": "os_unavailable"]
    #endif
  }

  private func generate(
    options: GenerateTextOptions,
    onSnapshot: @escaping (String, Int) -> Void
  ) async throws -> (text: String, durationMs: Int) {
    #if canImport(FoundationModels)
    guard #available(iOS 26.0, *) else {
      throw FoundationModelsUnavailableException("Foundation Models requires iOS 26 or later.")
    }
    return try await Self.generationQueue.generate(
      prompt: options.prompt,
      instructions: options.instructions,
      maximumResponseTokens: options.maximumResponseTokens,
      onSnapshot: onSnapshot
    )
    #else
    throw FoundationModelsUnavailableException("Foundation Models is not present in this SDK.")
    #endif
  }

  private func prewarm() async throws {
    #if canImport(FoundationModels)
    guard #available(iOS 26.0, *) else {
      throw FoundationModelsUnavailableException("Foundation Models requires iOS 26 or later.")
    }
    guard case .available = SystemLanguageModel.default.availability else {
      throw FoundationModelsUnavailableException("Foundation Models is not currently available.")
    }
    await Self.generationQueue.prewarm()
    #else
    throw FoundationModelsUnavailableException("Foundation Models is not present in this SDK.")
    #endif
  }
}

private final class FoundationModelsUnavailableException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}

private final class FoundationModelsGenerationException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}

private final class FoundationModelsCancelledException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}
