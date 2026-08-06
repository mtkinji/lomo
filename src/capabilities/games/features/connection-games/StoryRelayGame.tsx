import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { HapticsService } from '@/src/services/HapticsService';
import {
  applyStoryKeepsake,
  createIncludedStoryPlan,
  createStoryCharacters,
  getStoryOutcome,
  resolveStoryScene,
  STORY_TROUBLE_MAX,
  type StoryAdventurePlan,
  type StoryCommitment,
  type StoryFlavor,
  type StoryOutcome,
  type StorySceneResult,
} from '@/src/capabilities/games/domain/storyAdventure';
import {
  generateStoryEnding,
  generateStoryPlan,
  generateStoryTwist,
  type GeneratedStoryEnding,
} from '@/src/capabilities/games/ai/storyAdventureAI';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { useGameMusic } from '@/src/capabilities/games/audio/useGameMusic';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';

type Phase = 'flavor' | 'characters' | 'scene' | 'countdown' | 'record' | 'result' | 'ending';

const flavors: Array<{ id: StoryFlavor; label: string; copy: string; mark: string }> = [
  { id: 'wonder', label: 'Wonder', copy: 'Stars, lanterns, and impossible places.', mark: '✦' },
  { id: 'mystery', label: 'Mystery', copy: 'Clues, secrets, and a ticking clock.', mark: '?' },
  { id: 'wild', label: 'Wild', copy: 'Ridiculous danger and heroic nonsense.', mark: '!' },
];

export function StoryRelayGame({ players, soundEnabled }: { players: string[]; soundEnabled: boolean }) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const feedback = useGameFeedback(soundEnabled);
  const [phase, setPhase] = useState<Phase>('flavor');
  const [seed, setSeed] = useState(0);
  const [plan, setPlan] = useState<StoryAdventurePlan>(() => createIncludedStoryPlan('wonder', 0));
  const [sceneIndex, setSceneIndex] = useState(0);
  const [trouble, setTrouble] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [recordSeatIndex, setRecordSeatIndex] = useState(0);
  const [commitments, setCommitments] = useState<StoryCommitment[]>([]);
  const [usePower, setUsePower] = useState(false);
  const [spentPowerSeatIndexes, setSpentPowerSeatIndexes] = useState<number[]>([]);
  const [spentKeepsakeSeatIndexes, setSpentKeepsakeSeatIndexes] = useState<number[]>([]);
  const [currentResult, setCurrentResult] = useState<StorySceneResult | null>(null);
  const [sceneResults, setSceneResults] = useState<StorySceneResult[]>([]);
  const [costDecisionMade, setCostDecisionMade] = useState(true);
  const [twist, setTwist] = useState(plan.twist);
  const [outcome, setOutcome] = useState<StoryOutcome | null>(null);
  const [ending, setEnding] = useState<GeneratedStoryEnding | null>(null);
  const generationToken = useRef(0);
  const generationOpen = useRef(false);
  const phaseRef = useRef<Phase>(phase);

  const characters = useMemo(() => createStoryCharacters(players, seed), [players, seed]);
  const scene = plan.scenes[sceneIndex];
  const spotlight = characters[sceneIndex % characters.length];
  const activeCharacter = characters[recordSeatIndex];
  const powerAvailable = activeCharacter && !spentPowerSeatIndexes.includes(activeCharacter.seatIndex);

  useGameMusic(phase === 'flavor' ? null : 'game.story-relay', soundEnabled);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    const timeout = setTimeout(() => {
      if (countdown <= 1) {
        void HapticsService.trigger('canvas.primary.confirm');
        setRecordSeatIndex(0);
        setPhase('record');
      } else {
        void HapticsService.trigger('canvas.selection');
        setCountdown((value) => value - 1);
      }
    }, 650);
    return () => clearTimeout(timeout);
  }, [countdown, phase]);

  const chooseFlavor = (flavor: StoryFlavor) => {
    const fallback = createIncludedStoryPlan(flavor, seed);
    const token = ++generationToken.current;
    generationOpen.current = true;
    setPlan(fallback);
    setTwist(fallback.twist);
    phaseRef.current = 'characters';
    setPhase('characters');
    feedback.select();
    void generateStoryPlan({ fallback, playerCount: players.length }).then((generated) => {
      if (!generated || token !== generationToken.current || !generationOpen.current) return;
      setPlan(generated);
      setTwist(generated.twist);
    });
  };

  const beginAdventure = () => {
    generationOpen.current = false;
    phaseRef.current = 'scene';
    setPhase('scene');
  };

  const beginReveal = () => {
    setCountdown(3);
    setCommitments([]);
    setRecordSeatIndex(0);
    setUsePower(false);
    setPhase('countdown');
  };

  const recordChoice = (choiceId: string) => {
    if (!activeCharacter) return;
    const nextCommitments = [...commitments, {
      seatIndex: activeCharacter.seatIndex,
      choiceId,
      usePower: powerAvailable && usePower,
    }];
    feedback.select();
    if (recordSeatIndex < characters.length - 1) {
      setCommitments(nextCommitments);
      setRecordSeatIndex((value) => value + 1);
      setUsePower(false);
      return;
    }

    const result = resolveStoryScene({
      sceneIndex,
      currentTrouble: trouble,
      commitments: nextCommitments,
      characters,
      spentPowerSeatIndexes,
    });
    const nextSpentPowers = [...new Set([...spentPowerSeatIndexes, ...result.newlySpentPowerSeatIndexes])].sort((a, b) => a - b);
    const hasAvailableKeepsake = characters.some((character) => !spentKeepsakeSeatIndexes.includes(character.seatIndex));
    setCommitments(nextCommitments);
    setCurrentResult(result);
    setSceneResults((results) => [...results, result]);
    setSpentPowerSeatIndexes(nextSpentPowers);
    setTrouble(result.nextTrouble);
    setCostDecisionMade(result.troubleAdded === 0 || !hasAvailableKeepsake);
    phaseRef.current = 'result';
    setPhase('result');
    if (result.troubleAdded === 0) void feedback.success('sparkle');
    else void feedback.skip();

    if (sceneIndex === 0) {
      const token = ++generationToken.current;
      void generateStoryTwist({ plan, result }).then((generatedTwist) => {
        if (!generatedTwist || token !== generationToken.current || phaseRef.current !== 'result') return;
        setTwist(generatedTwist);
      });
    }
  };

  const spendKeepsake = (seatIndex: number) => {
    if (!currentResult) return;
    const applied = applyStoryKeepsake(currentResult, seatIndex, spentKeepsakeSeatIndexes);
    if (!applied.applied) return;
    setCurrentResult(applied.result);
    setSceneResults((results) => [...results.slice(0, -1), applied.result]);
    setSpentKeepsakeSeatIndexes(applied.spentKeepsakeSeatIndexes);
    setTrouble(applied.result.nextTrouble);
    setCostDecisionMade(true);
    void HapticsService.trigger('canvas.destructive.confirm');
  };

  const continueAfterResult = () => {
    generationToken.current += 1;
    if (sceneIndex < plan.scenes.length - 1) {
      setSceneIndex((value) => value + 1);
      setCommitments([]);
      setCurrentResult(null);
      setUsePower(false);
      phaseRef.current = 'scene';
      setPhase('scene');
      return;
    }

    const finalOutcome = getStoryOutcome(trouble);
    const localEnding = localStoryEnding(plan, finalOutcome, sceneResults, characters);
    const token = ++generationToken.current;
    setOutcome(finalOutcome);
    setEnding(localEnding);
    phaseRef.current = 'ending';
    setPhase('ending');
    if (finalOutcome.kind === 'bright-victory') {
      void feedback.success('fanfare');
      void HapticsService.trigger('outcome.bigSuccess');
    } else if (finalOutcome.kind === 'costly-victory') {
      void feedback.success('chime');
    } else {
      void HapticsService.trigger('outcome.warning');
    }
    void generateStoryEnding({ plan, outcome: finalOutcome, results: sceneResults }).then((generatedEnding) => {
      if (!generatedEnding || token !== generationToken.current || phaseRef.current !== 'ending') return;
      setEnding(generatedEnding);
    });
  };

  const newAdventure = () => {
    generationToken.current += 1;
    generationOpen.current = false;
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    setPlan(createIncludedStoryPlan('wonder', nextSeed));
    setSceneIndex(0);
    setTrouble(0);
    setCommitments([]);
    setSpentPowerSeatIndexes([]);
    setSpentKeepsakeSeatIndexes([]);
    setCurrentResult(null);
    setSceneResults([]);
    setOutcome(null);
    setEnding(null);
    phaseRef.current = 'flavor';
    setPhase('flavor');
  };

  if (phase === 'flavor') {
    return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
      <Text style={styles.eyebrow}>NEW ADVENTURE</Text>
      <Text style={styles.heroTitle}>Choose a story</Text>
      <View style={[styles.flavorGrid, landscape ? styles.flavorGridLandscape : null]}>
        {flavors.map((flavor) => <Pressable
          key={flavor.id}
          accessibilityRole="button"
          accessibilityLabel={flavor.label}
          onPress={() => chooseFlavor(flavor.id)}
          style={({ pressed }) => [styles.flavorCard, pressed ? styles.pressed : null]}
        >
          <Text style={styles.flavorMark}>{flavor.mark}</Text>
          <Text style={styles.flavorTitle}>{flavor.label}</Text>
          <Text style={styles.flavorCopy}>{flavor.copy}</Text>
        </Pressable>)}
      </View>
    </View>;
  }

  if (phase === 'characters') {
    return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
      <View style={styles.storyHeading}>
        <Text style={styles.eyebrow}>YOUR ADVENTURE</Text>
        <Text style={styles.heroTitle}>{plan.title}</Text>
        <Text style={styles.opening}>{plan.opening}</Text>
      </View>
      <StoryContract plan={plan} trouble={0} />
      <View style={styles.characterGrid}>
        {characters.map((character) => <View
          key={character.seatIndex}
          accessible
          accessibilityLabel={`${character.playerName}, ${character.title}`}
          style={styles.characterCard}
        >
          <Text numberOfLines={1} style={styles.characterName}>{character.playerName}</Text>
          <Text style={styles.characterTitle}>{character.title}</Text>
          <Text numberOfLines={2} style={styles.characterTrait}>{character.trait}</Text>
          <Text numberOfLines={1} style={styles.characterResource}>{character.power.label} · {character.keepsake.label}</Text>
        </View>)}
      </View>
      <Text style={styles.aiNote}>AI may shape the fiction from game choices. The adventure still works offline.</Text>
      <GameButton accessibilityLabel="Begin adventure" onPress={beginAdventure}>Begin adventure</GameButton>
    </View>;
  }

  if (phase === 'countdown') {
    return <View style={[styles.stage, styles.countdownStage]}>
      <Text style={styles.eyebrow}>SHOW YOUR NUMBER</Text>
      <Text accessibilityLiveRegion="assertive" style={styles.countdown}>{countdown}</Text>
      <Text style={styles.countdownCopy}>Choose together. Keep your own answer.</Text>
    </View>;
  }

  if (phase === 'record' && activeCharacter) {
    return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
      <StoryContract plan={plan} trouble={trouble} compact />
      <Text style={styles.eyebrow}>RECORD {recordSeatIndex + 1} OF {characters.length}</Text>
      <Text style={styles.recordTitle}>What did {activeCharacter.playerName} choose?</Text>
      {powerAvailable ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Use ${activeCharacter.playerName}’s ${activeCharacter.power.label} Power`}
        accessibilityState={{ selected: usePower }}
        onPress={() => {
          setUsePower((value) => !value);
          void HapticsService.trigger(usePower ? 'canvas.toggle.off' : 'canvas.toggle.on');
        }}
        style={[styles.powerButton, usePower ? styles.powerButtonSelected : null]}
      >
        <Text style={styles.powerLabel}>{usePower ? 'POWER READY' : 'USE POWER'}</Text>
        <Text style={styles.powerName}>{activeCharacter.power.label}</Text>
        <Text style={styles.powerCopy}>{activeCharacter.power.description}</Text>
      </Pressable> : <Text style={styles.spentCopy}>{activeCharacter.power.label} has been used.</Text>}
      <View style={[styles.choiceGrid, landscape ? styles.choiceGridLandscape : null]}>
        {scene.commitments.map((choice) => <Pressable
          key={choice.id}
          accessibilityRole="button"
          accessibilityLabel={`Record ${choice.label} for ${activeCharacter.playerName}`}
          onPress={() => recordChoice(choice.id)}
          style={({ pressed }) => [styles.choiceCard, pressed ? styles.pressed : null]}
        >
          <Text style={styles.choiceNumber}>{choice.number}</Text>
          <View style={styles.choiceCopyWrap}>
            <Text style={styles.choiceLabel}>{choice.label}</Text>
            <Text style={styles.choiceHint}>{choice.hint}</Text>
          </View>
        </Pressable>)}
      </View>
    </View>;
  }

  if (phase === 'result' && currentResult) {
    const resultCopy = currentResult.coverage >= 3
      ? scene.cleanResult
      : currentResult.coverage === 2
        ? scene.strainedResult
        : scene.dangerousResult;
    const resultTitle = currentResult.coverage >= 3
      ? 'Every angle covered.'
      : currentResult.coverage === 2
        ? 'One gap remains.'
        : 'The danger closes in.';
    const availableKeepsakes = characters.filter((character) => !spentKeepsakeSeatIndexes.includes(character.seatIndex));
    return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
      <StoryContract plan={plan} trouble={currentResult.nextTrouble} compact />
      <Text style={styles.eyebrow}>SCENE {sceneIndex + 1} COMPLETE</Text>
      <Text style={styles.heroTitle}>{resultTitle}</Text>
      <Text style={styles.opening}>{resultCopy}</Text>
      <View style={styles.resultStrip}>
        <Text style={styles.resultMetric}>{currentResult.coverage}/3 approaches</Text>
        <Text style={[styles.resultTrouble, currentResult.troubleAdded > 0 ? styles.resultTroubleHot : null]}>Trouble +{currentResult.troubleAdded}</Text>
      </View>
      {!costDecisionMade && currentResult.troubleAdded > 0 ? <View style={styles.costBox}>
        <Text style={styles.costTitle}>Pay the cost?</Text>
        <Text style={styles.costCopy}>One player may give up their Keepsake to remove 1 Trouble.</Text>
        <View style={styles.costChoices}>
          {availableKeepsakes.map((character) => <GameButton
            key={character.seatIndex}
            tone="paper"
            accessibilityLabel={`${character.playerName} gives up ${character.keepsake.label}`}
            onPress={() => spendKeepsake(character.seatIndex)}
            style={styles.costButton}
          >{character.playerName}: {character.keepsake.label}</GameButton>)}
          <GameButton tone="ghost" accessibilityLabel="Take the trouble" onPress={() => setCostDecisionMade(true)}>Take the Trouble</GameButton>
        </View>
      </View> : <GameButton
        accessibilityLabel={sceneIndex === 0 ? 'Next scene' : sceneIndex === 1 ? 'Final scene' : 'See our ending'}
        onPress={continueAfterResult}
      >{sceneIndex === 0 ? 'Next scene' : sceneIndex === 1 ? 'Final scene' : 'See our ending'}</GameButton>}
    </View>;
  }

  if (phase === 'ending' && outcome && ending) {
    return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
      <Text style={styles.eyebrow}>THE END</Text>
      <Text style={styles.heroTitle}>{outcome.title}</Text>
      <Text style={styles.endingText}>{ending.ending}</Text>
      <View style={styles.callbackBox}>
        <Text style={styles.callbackLabel}>HOW YOU DID IT</Text>
        {ending.callbacks.map((callback, index) => <Text key={`${callback}-${index}`} style={styles.callback}>• {callback}</Text>)}
      </View>
      <Text style={styles.outcomeSummary}>{outcome.summary}</Text>
      <GameButton accessibilityLabel="New adventure" onPress={newAdventure}>New adventure</GameButton>
    </View>;
  }

  return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
    <StoryContract plan={plan} trouble={trouble} compact />
    <Text style={styles.eyebrow}>SCENE {sceneIndex + 1} OF 3 · {spotlight?.playerName.toUpperCase()}</Text>
    <Text style={styles.heroTitle}>{scene.title}</Text>
    {sceneIndex === 1 ? <Text style={styles.twist}>{twist}</Text> : null}
    <Text style={styles.sceneFrame}>{scene.frame}</Text>
    <Text style={styles.spotlight}>{spotlight?.playerName}, say what you try.</Text>
    <View style={[styles.choicePreview, landscape ? styles.choicePreviewLandscape : null]}>
      {scene.commitments.map((choice) => <View key={choice.id} style={styles.previewChoice}>
        <Text style={styles.previewNumber}>{choice.number}</Text>
        <Text style={styles.previewLabel}>{choice.label}</Text>
      </View>)}
    </View>
    <Text style={styles.revealInstruction}>Everyone choose 1, 2, or 3 with your fingers.</Text>
    <GameButton accessibilityLabel="Reveal together" onPress={beginReveal}>Reveal together</GameButton>
  </View>;
}

function StoryContract({ plan, trouble, compact = false }: { plan: StoryAdventurePlan; trouble: number; compact?: boolean }) {
  return <View style={[styles.contract, compact ? styles.contractCompact : null]}>
    <View style={styles.contractCopy}>
      <Text style={styles.contractLabel}>GOAL</Text>
      <Text numberOfLines={compact ? 1 : 2} style={styles.contractText}>{plan.goal}</Text>
      {!compact ? <><Text style={styles.contractLabel}>PROMISE</Text><Text numberOfLines={2} style={styles.contractText}>{plan.promise}</Text></> : null}
    </View>
    <View accessibilityLabel={`Trouble ${trouble} of ${STORY_TROUBLE_MAX}`} style={styles.troubleBox}>
      <Text style={styles.troubleLabel}>TROUBLE</Text>
      <View style={styles.troubleTrack}>{Array.from({ length: STORY_TROUBLE_MAX }, (_, index) => <View key={index} style={[styles.troublePip, index < trouble ? styles.troublePipFilled : null]} />)}</View>
      <Text style={styles.troubleCount}>{trouble}/{STORY_TROUBLE_MAX}</Text>
    </View>
  </View>;
}

function localStoryEnding(
  plan: StoryAdventurePlan,
  outcome: StoryOutcome,
  results: StorySceneResult[],
  characters: ReturnType<typeof createStoryCharacters>,
): GeneratedStoryEnding {
  const ending = outcome.kind === 'bright-victory'
    ? plan.endings.bright
    : outcome.kind === 'costly-victory'
      ? plan.endings.costly
      : plan.endings.heroic;
  const callbacks = results.slice(0, 3).map((result) => {
    const commitment = result.commitments[0];
    const character = commitment ? characters.find(({ seatIndex }) => seatIndex === commitment.seatIndex) : null;
    const choice = commitment ? plan.scenes[result.sceneIndex]?.commitments.find(({ id }) => id === commitment.choiceId) : null;
    if (result.newlySpentPowerSeatIndexes.length) {
      const powerCharacter = characters.find(({ seatIndex }) => seatIndex === result.newlySpentPowerSeatIndexes[0]);
      return `${powerCharacter?.playerName ?? 'A player'} used ${powerCharacter?.power.label ?? 'a Power'} when the group needed another way.`;
    }
    return `${character?.playerName ?? 'The group'} chose to ${choice?.label.toLowerCase() ?? 'act'} when it mattered.`;
  });
  return { ending, callbacks: callbacks.length ? callbacks : ['You made every choice together.'] };
}

const styles = StyleSheet.create({
  stage: { flexGrow: 1, minHeight: 500, borderRadius: 30, padding: 22, gap: 16, justifyContent: 'center', backgroundColor: 'rgba(255,249,237,0.9)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  stageLandscape: { minHeight: 0, paddingHorizontal: 28, paddingVertical: 16, gap: 11 },
  eyebrow: { textAlign: 'center', fontFamily: gamesTheme.type.utility, fontSize: 11, letterSpacing: 1.8, color: 'rgba(32,29,24,0.55)' },
  heroTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: gamesTheme.colors.ink },
  opening: { textAlign: 'center', alignSelf: 'center', maxWidth: 720, fontFamily: gamesTheme.type.body, fontSize: 16, lineHeight: 22, color: 'rgba(32,29,24,0.7)' },
  storyHeading: { gap: 7 },
  flavorGrid: { gap: 11 },
  flavorGridLandscape: { flexDirection: 'row' },
  flavorCard: { flex: 1, minHeight: 126, borderRadius: 24, padding: 18, justifyContent: 'center', backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  flavorMark: { fontFamily: gamesTheme.type.display, fontSize: 23, color: gamesTheme.colors.coral },
  flavorTitle: { marginTop: 5, fontFamily: gamesTheme.type.display, fontSize: 22, color: gamesTheme.colors.ink },
  flavorCopy: { marginTop: 3, fontFamily: gamesTheme.type.body, fontSize: 13, lineHeight: 17, color: 'rgba(32,29,24,0.58)' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  contract: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 20, backgroundColor: gamesTheme.colors.felt },
  contractCompact: { paddingVertical: 10 },
  contractCopy: { flex: 1, gap: 3 },
  contractLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.3, color: gamesTheme.colors.turmeric },
  contractText: { marginBottom: 4, fontFamily: gamesTheme.type.body, fontSize: 12, lineHeight: 16, color: gamesTheme.colors.white },
  troubleBox: { width: 105, alignItems: 'center', justifyContent: 'center', gap: 5 },
  troubleLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.2, color: gamesTheme.colors.turmeric },
  troubleTrack: { flexDirection: 'row', gap: 4 },
  troublePip: { width: 15, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)' },
  troublePipFilled: { backgroundColor: gamesTheme.colors.coral },
  troubleCount: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.white },
  characterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  characterCard: { flexBasis: '30%', flexGrow: 1, minWidth: 145, borderRadius: 17, padding: 12, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  characterName: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
  characterTitle: { fontFamily: gamesTheme.type.utility, fontSize: 12, color: gamesTheme.colors.coralDark },
  characterTrait: { marginTop: 3, fontFamily: gamesTheme.type.body, fontSize: 12, lineHeight: 16, color: 'rgba(32,29,24,0.62)' },
  characterResource: { marginTop: 6, fontFamily: gamesTheme.type.utility, fontSize: 10, color: gamesTheme.colors.felt },
  aiNote: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.48)' },
  countdownStage: { alignItems: 'center' },
  countdown: { fontFamily: gamesTheme.type.display, fontSize: 150, lineHeight: 160, color: gamesTheme.colors.coral },
  countdownCopy: { fontFamily: gamesTheme.type.body, fontSize: 17, color: 'rgba(32,29,24,0.62)' },
  recordTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 30, color: gamesTheme.colors.ink },
  powerButton: { alignSelf: 'center', width: '100%', maxWidth: 460, borderRadius: 18, padding: 11, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(32,29,24,0.16)', backgroundColor: gamesTheme.colors.paper },
  powerButtonSelected: { borderColor: gamesTheme.colors.coral, backgroundColor: 'rgba(255,104,75,0.12)' },
  powerLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.2, color: gamesTheme.colors.coralDark },
  powerName: { fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.ink },
  powerCopy: { fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.55)' },
  spentCopy: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 12, color: 'rgba(32,29,24,0.45)' },
  choiceGrid: { gap: 9 },
  choiceGridLandscape: { flexDirection: 'row' },
  choiceCard: { flex: 1, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, padding: 13, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  choiceNumber: { width: 40, height: 40, borderRadius: 20, textAlign: 'center', textAlignVertical: 'center', fontFamily: gamesTheme.type.display, fontSize: 21, lineHeight: 40, color: gamesTheme.colors.ink, backgroundColor: gamesTheme.colors.turmeric },
  choiceCopyWrap: { flex: 1 },
  choiceLabel: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
  choiceHint: { fontFamily: gamesTheme.type.body, fontSize: 11, lineHeight: 15, color: 'rgba(32,29,24,0.55)' },
  sceneFrame: { alignSelf: 'center', maxWidth: 760, textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 18, lineHeight: 25, color: 'rgba(32,29,24,0.74)' },
  spotlight: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 20, color: gamesTheme.colors.coralDark },
  twist: { alignSelf: 'center', maxWidth: 680, textAlign: 'center', fontFamily: gamesTheme.type.utility, fontSize: 13, lineHeight: 18, color: gamesTheme.colors.felt, backgroundColor: 'rgba(248,207,82,0.25)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  choicePreview: { gap: 7 },
  choicePreviewLandscape: { flexDirection: 'row', justifyContent: 'center' },
  previewChoice: { flex: 1, maxWidth: 220, minHeight: 54, flexDirection: 'row', gap: 9, alignItems: 'center', borderRadius: 16, paddingHorizontal: 12, backgroundColor: 'rgba(18,76,61,0.08)' },
  previewNumber: { fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.coralDark },
  previewLabel: { flex: 1, fontFamily: gamesTheme.type.utility, fontSize: 13, color: gamesTheme.colors.ink },
  revealInstruction: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 12, color: 'rgba(32,29,24,0.5)' },
  resultStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  resultMetric: { fontFamily: gamesTheme.type.utility, fontSize: 13, color: gamesTheme.colors.felt },
  resultTrouble: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontFamily: gamesTheme.type.display, fontSize: 14, color: gamesTheme.colors.felt, backgroundColor: 'rgba(18,76,61,0.1)' },
  resultTroubleHot: { color: gamesTheme.colors.danger, backgroundColor: 'rgba(197,63,43,0.1)' },
  costBox: { gap: 9, padding: 14, borderRadius: 20, backgroundColor: 'rgba(248,207,82,0.18)' },
  costTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 19, color: gamesTheme.colors.ink },
  costCopy: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 12, color: 'rgba(32,29,24,0.6)' },
  costChoices: { gap: 9 },
  costButton: { minHeight: 50 },
  endingText: { alignSelf: 'center', maxWidth: 720, textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 22, lineHeight: 29, color: gamesTheme.colors.felt },
  callbackBox: { alignSelf: 'center', width: '100%', maxWidth: 680, gap: 7, borderRadius: 20, padding: 16, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  callbackLabel: { fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.4, color: gamesTheme.colors.coralDark },
  callback: { fontFamily: gamesTheme.type.body, fontSize: 14, lineHeight: 19, color: gamesTheme.colors.ink },
  outcomeSummary: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.55)' },
});
