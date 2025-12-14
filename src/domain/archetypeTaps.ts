/**
 * Tap-centric role model / archetype signal sets.
 *
 * These are shared between:
 * - FTUE (`IdentityAspirationFlow`)
 * - General Arc creation (`ArcCreationFlow`)
 * - (Optionally) dev testing harnesses
 *
 * Goal: capture Archetype signal without requiring typing, especially for teens.
 */

export type ArchetypeRoleModelTypeId =
  | 'builders_makers'
  | 'artists_creatives'
  | 'leaders_founders'
  | 'teachers_mentors'
  | 'helpers_carers'
  | 'athletes_competitors'
  | 'calm_steady_people'
  | 'brave_truth_tellers';

export type ArchetypeSpecificRoleModelId =
  | 'parent_guardian'
  | 'coach_teacher'
  | 'older_sibling_friend'
  | 'local_leader'
  | 'artist_creator'
  | 'builder_maker'
  | 'founder_builder'
  | 'public_figure';

export type ArchetypeRoleModelWhyId =
  | 'how_they_treat_people'
  | 'how_they_handle_pressure'
  | 'how_they_work'
  | 'how_they_live'
  | 'how_they_create'
  | 'how_they_lead'
  | 'how_they_stay_calm'
  | 'how_they_speak_truth';

export type ArchetypeAdmiredQualityId =
  | 'steady'
  | 'courageous'
  | 'disciplined'
  | 'kind'
  | 'honest'
  | 'creative'
  | 'skilled'
  | 'patient'
  | 'confident'
  | 'humble'
  | 'generous'
  | 'curious';

export const ARCHETYPE_ROLE_MODEL_TYPES: Array<{ id: ArchetypeRoleModelTypeId; label: string }> = [
  { id: 'builders_makers', label: 'Builders & makers' },
  { id: 'artists_creatives', label: 'Artists & creatives' },
  { id: 'leaders_founders', label: 'Leaders & founders' },
  { id: 'teachers_mentors', label: 'Teachers & mentors' },
  { id: 'helpers_carers', label: 'Helpers & carers' },
  { id: 'athletes_competitors', label: 'Athletes & competitors' },
  { id: 'calm_steady_people', label: 'Calm, steady people' },
  { id: 'brave_truth_tellers', label: 'Brave truth-tellers' },
];

export const ARCHETYPE_SPECIFIC_ROLE_MODELS: Array<{ id: ArchetypeSpecificRoleModelId; label: string }> =
  [
    { id: 'parent_guardian', label: 'A parent / guardian' },
    { id: 'coach_teacher', label: 'A coach / teacher' },
    { id: 'older_sibling_friend', label: 'An older sibling / friend' },
    { id: 'local_leader', label: 'Someone I know who leads well' },
    { id: 'artist_creator', label: 'An artist / creator I like' },
    { id: 'builder_maker', label: 'A builder / maker I like' },
    { id: 'founder_builder', label: 'A founder / builder I like' },
    { id: 'public_figure', label: 'A public figure' },
  ];

export const ARCHETYPE_ROLE_MODEL_WHY: Array<{ id: ArchetypeRoleModelWhyId; label: string }> = [
  { id: 'how_they_treat_people', label: 'How they treat people' },
  { id: 'how_they_handle_pressure', label: 'How they handle pressure' },
  { id: 'how_they_work', label: 'How they work' },
  { id: 'how_they_live', label: 'How they live day-to-day' },
  { id: 'how_they_create', label: 'How they create / express' },
  { id: 'how_they_lead', label: 'How they lead' },
  { id: 'how_they_stay_calm', label: 'How they stay calm / steady' },
  { id: 'how_they_speak_truth', label: 'How they speak truth / stand up' },
];

export const ARCHETYPE_ADMIRED_QUALITIES: Array<{ id: ArchetypeAdmiredQualityId; label: string }> =
  [
    { id: 'steady', label: 'Steady' },
    { id: 'courageous', label: 'Courageous' },
    { id: 'disciplined', label: 'Disciplined' },
    { id: 'kind', label: 'Kind' },
    { id: 'honest', label: 'Honest' },
    { id: 'creative', label: 'Creative' },
    { id: 'skilled', label: 'Skilled' },
    { id: 'patient', label: 'Patient' },
    { id: 'confident', label: 'Confident' },
    { id: 'humble', label: 'Humble' },
    { id: 'generous', label: 'Generous' },
    { id: 'curious', label: 'Curious' },
  ];


