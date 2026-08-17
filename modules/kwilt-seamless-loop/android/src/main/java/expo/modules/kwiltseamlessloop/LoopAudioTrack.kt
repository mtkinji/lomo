package expo.modules.kwiltseamlessloop

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Process
import java.io.RandomAccessFile
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.max
import kotlin.math.min

class LoopAudioTrack {
  private val lock = Any()
  private var audioTrack: AudioTrack? = null
  private var playbackThread: Thread? = null
  private var prepared: PreparedLoopFile? = null
  private val writerGeneration = AtomicLong(0)
  private var state = "idle"
  private var assetKey: String? = null
  private var completedBoundaries = 0
  private var underrunCount = 0
  private var lastErrorCode: String? = null
  private var targetVolume = 0f

  fun prepare(file: PreparedLoopFile, key: String): Map<String, Any?> = synchronized(lock) {
    unloadLocked()
    val channelMask = if (file.channelCount == 1) AudioFormat.CHANNEL_OUT_MONO else AudioFormat.CHANNEL_OUT_STEREO
    val minimum = AudioTrack.getMinBufferSize(file.sampleRateHz, channelMask, AudioFormat.ENCODING_PCM_16BIT)
    require(minimum > 0) { "audio_track_unavailable" }
    val bufferBytes = max(minimum * 4, file.sampleRateHz * file.channelCount * 2)
    audioTrack = AudioTrack.Builder()
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build()
      )
      .setAudioFormat(
        AudioFormat.Builder()
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .setSampleRate(file.sampleRateHz)
          .setChannelMask(channelMask)
          .build()
      )
      .setTransferMode(AudioTrack.MODE_STREAM)
      .setBufferSizeInBytes(bufferBytes)
      .build()
    require(audioTrack?.state == AudioTrack.STATE_INITIALIZED) { "audio_track_unavailable" }
    prepared = file
    assetKey = key
    state = "ready"
    lastErrorCode = null
    startWriterLocked(bufferBytes / 4)
    diagnosticsLocked()
  }

  fun play(volume: Double, fadeDurationMs: Double): Map<String, Any?> = synchronized(lock) {
    val track = audioTrack ?: error("not_prepared")
    state = "playing"
    track.play()
    rampLocked(volume.toFloat(), fadeDurationMs)
    diagnosticsLocked()
  }

  fun pause(fadeDurationMs: Double): Map<String, Any?> = synchronized(lock) {
    rampLocked(0f, fadeDurationMs)
    audioTrack?.pause()
    state = if (prepared == null) "idle" else "paused"
    diagnosticsLocked()
  }

  fun setVolume(volume: Double, fadeDurationMs: Double): Map<String, Any?> = synchronized(lock) {
    rampLocked(volume.toFloat(), fadeDurationMs)
    diagnosticsLocked()
  }

  fun unload(): Map<String, Any?> = synchronized(lock) {
    unloadLocked()
    diagnosticsLocked()
  }

  fun diagnostics(): Map<String, Any?> = synchronized(lock) { diagnosticsLocked() }

  private fun startWriterLocked(chunkSize: Int) {
    val file = prepared?.file ?: return
    val track = audioTrack ?: return
    val generation = writerGeneration.incrementAndGet()
    playbackThread = Thread({
      Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO)
      val buffer = ByteArray(max(4096, chunkSize))
      try {
        RandomAccessFile(file, "r").use { input ->
          while (writerGeneration.get() == generation) {
            var filled = 0
            while (filled < buffer.size && writerGeneration.get() == generation) {
              val count = input.read(buffer, filled, buffer.size - filled)
              if (count < 0) {
                input.seek(0)
                synchronized(lock) { completedBoundaries += 1 }
              } else {
                filled += count
              }
            }
            var written = 0
            while (written < filled && writerGeneration.get() == generation) {
              val count = track.write(buffer, written, filled - written, AudioTrack.WRITE_BLOCKING)
              if (count < 0) error("audio_write_failed")
              written += count
            }
          }
        }
      } catch (error: Throwable) {
        synchronized(lock) {
          if (writerGeneration.get() == generation) {
            state = "error"
            lastErrorCode = error.message ?: "native_failure"
          }
        }
      }
    }, "KwiltLoopAudio")
    playbackThread?.start()
  }

  private fun rampLocked(rawTarget: Float, durationMs: Double) {
    val track = audioTrack ?: return
    val target = min(1f, max(0f, if (rawTarget.isFinite()) rawTarget else 0f))
    val start = targetVolume
    val steps = max(1, (max(0.0, durationMs) / 20.0).toInt())
    for (step in 1..steps) {
      val progress = step.toFloat() / steps.toFloat()
      val eased = if (progress < 0.5f) {
        4f * progress * progress * progress
      } else {
        val shifted = -2f * progress + 2f
        1f - shifted * shifted * shifted / 2f
      }
      track.setVolume(start + (target - start) * eased)
      if (steps > 1) Thread.sleep(max(1L, (durationMs / steps).toLong()))
    }
    targetVolume = target
    track.setVolume(target)
  }

  private fun unloadLocked() {
    writerGeneration.incrementAndGet()
    audioTrack?.pause()
    audioTrack?.flush()
    audioTrack?.release()
    playbackThread?.interrupt()
    playbackThread = null
    audioTrack = null
    prepared = null
    state = "idle"
    assetKey = null
    completedBoundaries = 0
    underrunCount = 0
    lastErrorCode = null
    targetVolume = 0f
  }

  private fun diagnosticsLocked(): Map<String, Any?> = mapOf(
    "state" to state,
    "assetKey" to assetKey,
    "queuedSegments" to if (prepared == null) 0 else 3,
    "completedBoundaries" to completedBoundaries,
    "underrunCount" to max(underrunCount, audioTrack?.underrunCount ?: 0),
    "lastErrorCode" to lastErrorCode
  )
}
