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

#if canImport(FoundationModels)
@available(iOS 26.0, *)
private actor FoundationModelGenerationQueue {
  private var isGenerating = false
  private var waiters: [(id: UUID, continuation: CheckedContinuation<Bool, Never>)] = []

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

  func generate(
    prompt: String,
    instructions: String,
    maximumResponseTokens: Int
  ) async throws -> (text: String, durationMs: Int) {
    guard await acquire() else { throw CancellationError() }
    defer { release() }
    try Task.checkCancellation()
    let startedAt = ContinuousClock.now
    let session = LanguageModelSession(instructions: instructions)
    let response = try await session.respond(
      to: prompt,
      options: GenerationOptions(
        sampling: .greedy,
        maximumResponseTokens: min(max(maximumResponseTokens, 16), 256)
      )
    )
    let duration = startedAt.duration(to: .now)
    let milliseconds = Int(duration.components.seconds * 1_000) +
      Int(duration.components.attoseconds / 1_000_000_000_000_000)
    return (response.content, milliseconds)
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

    AsyncFunction("availability") { (localeIdentifier: String?) -> [String: String] in
      self.availability(localeIdentifier: localeIdentifier)
    }

    AsyncFunction("generateText") { (options: GenerateTextOptions, promise: Promise) in
      let handle = GenerationTaskHandle()
      self.storeGenerationTask(handle, requestId: options.requestId)
      let task = Task {
        defer { _ = self.takeGenerationTask(requestId: options.requestId) }
        do {
          let result = try await self.generate(options: options)
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

  private func generate(options: GenerateTextOptions) async throws -> (text: String, durationMs: Int) {
    #if canImport(FoundationModels)
    guard #available(iOS 26.0, *) else {
      throw FoundationModelsUnavailableException("Foundation Models requires iOS 26 or later.")
    }
    return try await Self.generationQueue.generate(
      prompt: options.prompt,
      instructions: options.instructions,
      maximumResponseTokens: options.maximumResponseTokens
    )
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
