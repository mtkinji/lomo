import { getSlanguageStartError } from '../slanguageStartError';

describe('getSlanguageStartError', () => {
  it('explains the existing-room limit returned as a Supabase error object', () => {
    expect(getSlanguageStartError({ code: 'P0001', message: 'anonymous_room_limit' }))
      .toBe('Finish or close your open table first.');
  });

  it('keeps unexpected backend details out of the player-facing message', () => {
    expect(getSlanguageStartError({ message: 'connection reset by peer' }))
      .toBe('Unable to open Slanguage right now.');
  });

  it('explains when the local preview has no shared-play configuration', () => {
    expect(getSlanguageStartError(new Error('Shared Kwilt sign-in is not configured in this build. Guest play is still available.')))
      .toBe('Remote play isn’t available in this preview build.');
  });
});
