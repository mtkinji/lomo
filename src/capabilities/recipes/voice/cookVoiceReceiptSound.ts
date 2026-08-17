import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const RECEIPT_SOURCE = require('../../../../assets/audio/sfx/list-tap.wav');
const RECEIPT_GAIN = 0.58;

let receiptPlayer: AudioPlayer | null = null;
let receiptPlayerLoading: Promise<void> | null = null;

async function configureReceiptAudioMode() {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
    shouldRouteThroughEarpiece: false,
  });
}

async function prepareReceiptPlayer() {
  if (receiptPlayer) return;
  if (receiptPlayerLoading) {
    await receiptPlayerLoading;
    return;
  }
  receiptPlayerLoading = (async () => {
    await configureReceiptAudioMode();
    const player = createAudioPlayer(RECEIPT_SOURCE);
    player.volume = RECEIPT_GAIN;
    receiptPlayer = player;
  })();
  try {
    await receiptPlayerLoading;
  } finally {
    receiptPlayerLoading = null;
  }
}

/** A single short acknowledgement that speech ended and Kwilt received the turn. */
export async function playCookVoiceReceiptSound(): Promise<void> {
  try {
    await prepareReceiptPlayer();
    if (!receiptPlayer) return;
    await configureReceiptAudioMode();
    receiptPlayer.volume = RECEIPT_GAIN;
    await receiptPlayer.seekTo(0);
    receiptPlayer.play();
  } catch {
    // Voice state and touch controls remain the dependable fallback.
  }
}
