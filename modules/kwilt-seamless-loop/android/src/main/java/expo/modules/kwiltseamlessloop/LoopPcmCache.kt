package expo.modules.kwiltseamlessloop

import android.content.Context
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicLong

data class PreparedLoopFile(
  val file: File,
  val sampleRateHz: Int,
  val channelCount: Int,
  val frameCount: Long
)

class LoopPcmCache(private val context: Context) {
  private val generation = AtomicLong(0)
  private val directory = File(context.cacheDir, "kwilt-loop-pcm")

  fun prepare(uri: String, assetKey: String, expectedSampleRateHz: Int, expectedChannels: Int): PreparedLoopFile {
    val runGeneration = generation.incrementAndGet()
    val source = Uri.parse(uri)
    require(source.scheme == "file") { "non_local_source" }
    directory.mkdirs()
    val safeKey = assetKey.replace(Regex("[^a-zA-Z0-9-]"), "-")
    val destination = File(directory, "$safeKey.pcm")
    val partial = File(directory, "$safeKey.partial.pcm")
    directory.listFiles()?.filter { it != destination }?.forEach { it.delete() }
    val metadata = File(directory, "$safeKey.properties")
    if (destination.length() > 0 && metadata.exists()) {
      val values = metadata.readLines().associate { line -> line.substringBefore('=') to line.substringAfter('=') }
      val sampleRate = values["sampleRate"]?.toIntOrNull()
      val channels = values["channels"]?.toIntOrNull()
      if (sampleRate == expectedSampleRateHz && channels == expectedChannels) {
        return PreparedLoopFile(destination, sampleRate, channels, destination.length() / (channels * 2L))
      }
    }
    destination.delete()
    metadata.delete()
    partial.delete()

    val extractor = MediaExtractor()
    var codec: MediaCodec? = null
    try {
      extractor.setDataSource(context, source, null)
      val trackIndex = (0 until extractor.trackCount).firstOrNull { index ->
        extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
      } ?: error("decode_failed")
      extractor.selectTrack(trackIndex)
      val inputFormat = extractor.getTrackFormat(trackIndex)
      val mime = inputFormat.getString(MediaFormat.KEY_MIME) ?: error("decode_failed")
      inputFormat.setInteger(MediaFormat.KEY_PCM_ENCODING, AudioFormat.ENCODING_PCM_16BIT)
      codec = MediaCodec.createDecoderByType(mime)
      codec.configure(inputFormat, null, null, 0)
      codec.start()

      var outputSampleRate = 0
      var outputChannels = 0
      var inputEnded = false
      var outputEnded = false
      FileOutputStream(partial).use { output ->
        val info = MediaCodec.BufferInfo()
        while (!outputEnded) {
          check(generation.get() == runGeneration) { "cancelled" }
          if (!inputEnded) {
            val inputIndex = codec.dequeueInputBuffer(10_000)
            if (inputIndex >= 0) {
              val buffer = codec.getInputBuffer(inputIndex) ?: error("decode_failed")
              val size = extractor.readSampleData(buffer, 0)
              if (size < 0) {
                codec.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                inputEnded = true
              } else {
                codec.queueInputBuffer(inputIndex, 0, size, extractor.sampleTime, 0)
                extractor.advance()
              }
            }
          }
          val outputIndex = codec.dequeueOutputBuffer(info, 10_000)
          when {
            outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
              val format = codec.outputFormat
              outputSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
              outputChannels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
              val encoding = if (format.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                format.getInteger(MediaFormat.KEY_PCM_ENCODING)
              } else AudioFormat.ENCODING_PCM_16BIT
              require(
                outputSampleRate == expectedSampleRateHz &&
                  outputChannels == expectedChannels &&
                  encoding == AudioFormat.ENCODING_PCM_16BIT
              ) { "unsupported_format" }
            }
            outputIndex >= 0 -> {
              if (info.size > 0) {
                val buffer: ByteBuffer = codec.getOutputBuffer(outputIndex) ?: error("decode_failed")
                buffer.position(info.offset)
                buffer.limit(info.offset + info.size)
                val bytes = ByteArray(info.size)
                buffer.get(bytes)
                output.write(bytes)
              }
              outputEnded = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
              codec.releaseOutputBuffer(outputIndex, false)
            }
          }
        }
      }
      require(partial.length() > 0 && outputSampleRate > 0 && outputChannels > 0) { "empty_audio" }
      check(generation.get() == runGeneration) { "cancelled" }
      check(partial.renameTo(destination)) { "cache_write_failed" }
      metadata.writeText("sampleRate=$outputSampleRate\nchannels=$outputChannels\n")
      return PreparedLoopFile(
        destination,
        outputSampleRate,
        outputChannels,
        destination.length() / (outputChannels * 2L)
      )
    } finally {
      runCatching { codec?.stop() }
      codec?.release()
      extractor.release()
      if (generation.get() != runGeneration) partial.delete()
    }
  }

  fun clear() {
    generation.incrementAndGet()
    directory.listFiles()?.forEach { it.delete() }
  }
}
