import { remoteRematchPresentation } from '../remoteGameLifecycle';

describe('remoteRematchPresentation', () => {
  it('lets the host keep the same group together', () => {
    expect(remoteRematchPresentation(true)).toEqual({
      canRestart: true,
      primaryCopy: 'Play again with this group',
    });
  });

  it('tells guests who controls the rematch', () => {
    expect(remoteRematchPresentation(false)).toEqual({
      canRestart: false,
      primaryCopy: 'Waiting for the host to start another game',
    });
  });
});
