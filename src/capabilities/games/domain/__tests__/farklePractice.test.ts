import {
  bankPractice,
  confirmPracticeSelection,
  createFarklePractice,
  riskPractice,
  togglePracticeDie,
} from '../farklePractice';
import { analyzeFarkleRoll } from '../farkle';

describe('Farkle learn-in-one-turn practice', () => {
  it('opens on an authored roll that teaches the two single-die scores', () => {
    const practice = createFarklePractice();
    expect(practice).toEqual({
      phase: 'selecting',
      dice: [1, 5, 2, 2, 3, 4],
      selectedIndexes: [],
      points: 0,
      diceRemaining: 6,
    });
    expect(analyzeFarkleRoll(practice.dice).scoringIndexes).toEqual([0, 1]);
  });

  it('turns the 1 and 5 into a 150-point bank-or-risk decision', () => {
    const practice = createFarklePractice();
    const selected = togglePracticeDie(togglePracticeDie(practice, 0), 1);

    expect(confirmPracticeSelection(selected)).toEqual({
      phase: 'decision',
      dice: [1, 5, 2, 2, 3, 4],
      selectedIndexes: [0, 1],
      points: 150,
      diceRemaining: 4,
    });
  });

  it('does not advance when the selection includes a non-scoring die', () => {
    const practice = createFarklePractice();
    const selected = togglePracticeDie(togglePracticeDie(practice, 0), 2);

    expect(confirmPracticeSelection(selected)).toEqual(selected);
  });

  it('explains the safe consequence when the player banks', () => {
    const practice = confirmPracticeSelection(
      togglePracticeDie(togglePracticeDie(createFarklePractice(), 0), 1),
    );

    expect(bankPractice(practice)).toMatchObject({
      phase: 'banked',
      points: 150,
      diceRemaining: 4,
    });
  });

  it('uses an authored non-scoring roll to make the risk consequence visible', () => {
    const practice = confirmPracticeSelection(
      togglePracticeDie(togglePracticeDie(createFarklePractice(), 0), 1),
    );

    expect(riskPractice(practice)).toEqual({
      phase: 'farkled',
      dice: [2, 3, 4, 6],
      selectedIndexes: [],
      points: 0,
      diceRemaining: 4,
    });
  });
});
