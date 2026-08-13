import AVFAudio
import ExpoModulesCore

struct LoopPrepareOptions: Record {
  @Field var uri: String = ""
  @Field var assetKey: String = ""
  @Field var expectedSampleRateHz: Double = 48_000
  @Field var expectedChannels: Int = 2
}

public final class KwiltSeamlessLoopModule: Module {
  private let cache = LoopPCMCache()
  private let scheduler = LoopScheduler()
  private var notificationTokens: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("KwiltSeamlessLoop")
    Events("onStateChanged")

    OnCreate {
      self.scheduler.setDiagnosticsHandler { [weak self] diagnostics in
        DispatchQueue.main.async { self?.sendEvent("onStateChanged", diagnostics) }
      }
      self.installAudioNotifications()
    }

    Function("isAvailable") { true }

    AsyncFunction("prepare") { (options: LoopPrepareOptions) async throws -> [String: Any] in
      let prepared = try await self.cache.prepare(
        uri: options.uri,
        assetKey: options.assetKey,
        expectedSampleRateHz: options.expectedSampleRateHz,
        expectedChannels: AVAudioChannelCount(options.expectedChannels)
      )
      return try await self.scheduler.prepare(prepared, assetKey: options.assetKey)
    }

    AsyncFunction("play") { (volume: Double, fadeDurationMs: Double) async throws -> [String: Any] in
      try await self.scheduler.play(volume: volume, fadeDurationMs: fadeDurationMs)
    }

    AsyncFunction("pause") { (fadeDurationMs: Double) async throws -> [String: Any] in
      try await self.scheduler.pause(fadeDurationMs: fadeDurationMs)
    }

    AsyncFunction("setVolume") { (volume: Double, fadeDurationMs: Double) async throws -> [String: Any] in
      try await self.scheduler.setVolume(volume: volume, fadeDurationMs: fadeDurationMs)
    }

    AsyncFunction("unload") { () async -> [String: Any] in
      self.cache.clear()
      return await self.scheduler.unload()
    }

    Function("getDiagnostics") { () -> [String: Any] in
      self.scheduler.getDiagnostics()
    }

    AsyncFunction("runContinuityProbe") { (_: Int) throws -> [String: Any] in
      throw NSError(
        domain: "KwiltSeamlessLoop",
        code: 10,
        userInfo: [NSLocalizedDescriptionKey: "Continuity probe is unavailable in this build"]
      )
    }

    OnDestroy {
      self.removeAudioNotifications()
      self.cache.clear()
      self.scheduler.destroy()
    }
  }

  private func installAudioNotifications() {
    let center = NotificationCenter.default
    notificationTokens.append(center.addObserver(
      forName: AVAudioSession.interruptionNotification,
      object: AVAudioSession.sharedInstance(),
      queue: nil
    ) { [weak self] notification in
      guard let typeValue = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
            let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
      if type == .began {
        self?.scheduler.handleInterruptionBegan()
      } else {
        let optionValue = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
        self?.scheduler.handleInterruptionEnded(
          shouldResume: AVAudioSession.InterruptionOptions(rawValue: optionValue).contains(.shouldResume)
        )
      }
    })
    notificationTokens.append(center.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: AVAudioSession.sharedInstance(),
      queue: nil
    ) { [weak self] _ in self?.scheduler.rebuildAfterConfigurationChange() })
    notificationTokens.append(center.addObserver(
      forName: .AVAudioEngineConfigurationChange,
      object: nil,
      queue: nil
    ) { [weak self] _ in self?.scheduler.rebuildAfterConfigurationChange() })
    notificationTokens.append(center.addObserver(
      forName: AVAudioSession.mediaServicesWereResetNotification,
      object: AVAudioSession.sharedInstance(),
      queue: nil
    ) { [weak self] _ in self?.scheduler.rebuildAfterConfigurationChange() })
  }

  private func removeAudioNotifications() {
    let center = NotificationCenter.default
    notificationTokens.forEach(center.removeObserver)
    notificationTokens.removeAll()
  }
}
