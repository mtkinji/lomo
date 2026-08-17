import { createAudioPlayer } from 'expo-audio';

import { createConversationStateAudio } from './conversationStateAudio';

const TURN_RECEIVED_SOURCE = require('../../../assets/audio/sfx/list-tap.wav');

export const conversationStateAudio = createConversationStateAudio({
  source: TURN_RECEIVED_SOURCE,
  gain: 0.42,
  createPlayer: (source, options) => createAudioPlayer(source, options),
});
