# Mountain Overlook loop

Source: Andrew's iCloud-shared `IMG_0447.MOV`, received 2026-09-11.

## Delivery asset

- Runtime URL: `https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/focus_environment_assets/v1/focus/mountain-overlook-loop-5c6b9596589d.mp4`
- SHA-256: `5c6b9596589df907362cae3420478674bd7e56303039a36746436b5146194ab4`
- Size: 20,951,252 bytes
- Duration: 55.56 seconds
- Video: H.264 High, 1280x720, 29.97 fps, yuv420p, approximately 3.0 Mbps
- Audio: none
- Metadata: source metadata removed
- Delivery: progressive MP4 with fast-start metadata and a 60-frame GOP

## Loop edit

The locked composition made a circular dissolve practical. The last two seconds were dissolved into the first two seconds, then the encoded timeline was rotated so the delivery boundary falls between adjacent frames at the midpoint of that dissolve. This avoids a hard end-to-start jump without reverse playback, a speed ramp, or a visible held frame.

The full file remains long enough that the dissolve should not become a frequent learned event. The background geometry stays fixed; only the wind-driven grasses and brush participate materially in the blend.

The original hard boundary measured `0.793670` whole-frame SSIM. The circular edit measured `0.936362`; ten ordinary adjacent-frame samples ranged from `0.907836` to `0.987445`, placing the edited boundary inside the clip's observed motion range rather than as an outlier.

## Paired windy-ridgeline audio

- Runtime path: `assets/audio/soundscapes/mountain-overlook-wind-5c273d4ddf9f.mp3`
- SHA-256: `5c273d4ddf9f165a862164d0ce94d51b344fc6b9aaa12f261d210355059c894f`
- Size: 4,927,724 bytes
- Source: the original MOV's default 48 kHz stereo soundtrack; no generated, library, or substitute ambience. The separate Apple cinematic multichannel representation is not used.
- Transform: a four-second equal-power tail-to-head dissolve, rotated into the file, with the 51.316-second unit tiled four times before the single MP3 delivery encode.
- Delivery: 205.264 seconds, 48 kHz stereo, 192 kbps MP3, normalized under the existing `focus.music` policy.
- Automated seam result: pass; 0 ms leading/trailing silence, 1.83 dB boundary-window delta, -45.79 dBFS endpoint, and 7.12 dB local outlier.

## Proof boundary

- Confirmed locally: decoded video duration/codec/size, first/last-frame inspection, removed embedded audio and source metadata, video and audio content hashes, six-second video seam audition, and automated audio seam admission.
- Confirmed on CDN: the public object returns `video/mp4`, Smart CDN is enabled, immutable one-year browser caching is configured, and the 20,951,252 downloaded bytes match the local SHA-256 exactly.
- Confirmed in Simulator before CDN migration: the bundled background changed across a four-second background-only comparison, proving moving video rather than the poster fallback; the native loop engine decoded `mountain-overlook-wind-5c273d4ddf9f.mp3` into a 205.264-second, 48 kHz stereo PCM cache for the active session.
- Still required: CDN-backed Simulator playback, repeated normal-speed perceptual audition across both boundaries, physical-iPhone loop continuity and audio balance, and thermal/battery observation.
