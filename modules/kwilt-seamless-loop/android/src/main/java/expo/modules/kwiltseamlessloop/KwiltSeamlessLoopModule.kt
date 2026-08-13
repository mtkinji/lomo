package expo.modules.kwiltseamlessloop

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KwiltSeamlessLoopModule : Module() {
  private val player = LoopAudioTrack()
  private val cache by lazy {
    LoopPcmCache(requireNotNull(appContext.reactContext).applicationContext)
  }

  override fun definition() = ModuleDefinition {
    Name("KwiltSeamlessLoop")
    Events("onStateChanged")

    Function("isAvailable") { true }

    AsyncFunction("prepare") { options: Map<String, Any> ->
      val prepared = cache.prepare(
        uri = options["uri"] as String,
        assetKey = options["assetKey"] as String,
        expectedSampleRateHz = (options["expectedSampleRateHz"] as Number).toInt(),
        expectedChannels = (options["expectedChannels"] as Number).toInt()
      )
      player.prepare(prepared, options["assetKey"] as String).also { sendEvent("onStateChanged", it) }
    }

    AsyncFunction("play") { volume: Double, fadeDurationMs: Double ->
      player.play(volume, fadeDurationMs).also { sendEvent("onStateChanged", it) }
    }
    AsyncFunction("pause") { fadeDurationMs: Double ->
      player.pause(fadeDurationMs).also { sendEvent("onStateChanged", it) }
    }
    AsyncFunction("setVolume") { volume: Double, fadeDurationMs: Double ->
      player.setVolume(volume, fadeDurationMs).also { sendEvent("onStateChanged", it) }
    }
    AsyncFunction("unload") {
      cache.clear()
      player.unload().also { sendEvent("onStateChanged", it) }
    }
    Function("getDiagnostics") { player.diagnostics() }
    AsyncFunction("runContinuityProbe") { loopCount: Int -> unsupportedProbe(loopCount) }
    OnDestroy {
      cache.clear()
      player.unload()
    }
  }

  private fun unsupportedProbe(@Suppress("UNUSED_PARAMETER") loopCount: Int): Map<String, Any?> {
    throw IllegalStateException("Continuity probe is unavailable in this build")
  }
}
