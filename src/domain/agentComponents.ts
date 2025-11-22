// Central catalog for components that an agent can ask the client to render
// inside the shared AgentWorkspace surface.
//
// This file is intentionally light-weight and focused on **stable IDs** and
// human-readable descriptions so that:
// - prompts can reference component IDs without depending on implementation
//   details, and
// - future JSON handoff formats can use these IDs as `componentId` values.
//
// The actual rendering and endpoint wiring for these components lives in
// feature-level presenters (e.g., onboarding flows) and can evolve
// independently of this catalog.

export type AgentComponentKind =
  | 'formField'
  | 'actionButton'
  | 'instructionCard'
  | 'progressIndicator'
  | 'inlineCapability'
  | 'composite';

/**
 * Stable identifiers for the component types the Agent can reference.
 *
 * These are deliberately capitalized to match the mental model in prompts and
 * docs (e.g., "FormField", "ActionButton").
 */
export type AgentComponentId =
  | 'FormField'
  | 'ActionButton'
  | 'InstructionCard'
  | 'ProgressIndicator'
  | 'InlineCapability'
  | 'Composite';

export type AgentComponentDefinition = {
  /**
   * Stable identifier used in prompts and (eventually) JSON handoffs.
   */
  id: AgentComponentId;
  /**
   * Coarse-grained kind used for grouping and future rendering decisions.
   */
  kind: AgentComponentKind;
  /**
   * Human-readable label for docs and admin tooling.
   */
  label: string;
  /**
   * Short description of what this component is for at the UX level.
   */
  description: string;
  /**
   * Optional example of the primary endpoint or tool this component tends to
   * talk to. This is purely descriptive and does not drive routing.
   */
  exampleEndpoint?: string;
};

/**
 * V1 component catalog. This mirrors the "Component Catalog (V1 scope)" section
 * of `docs/agent-onboarding-flow.md` and is the single source of truth for
 * component IDs the agent can reference.
 *
 * Rendering code is free to ignore entries that are not yet implemented; this
 * catalog is about naming and intent, not enforcement.
 */
export const AGENT_COMPONENT_CATALOG: Record<AgentComponentId, AgentComponentDefinition> = {
  FormField: {
    id: 'FormField',
    kind: 'formField',
    label: 'Form field',
    description:
      'Collects a single field of structured input (text, number, date, image, select, multi-select, or toggle) and sends it to a well-defined endpoint.',
    exampleEndpoint: '/user/name',
  },
  ActionButton: {
    id: 'ActionButton',
    kind: 'actionButton',
    label: 'Action button',
    description:
      'Triggers a single, focused action such as enabling notifications or generating an Arc from existing preferences.',
    exampleEndpoint: '/settings/notifications',
  },
  InstructionCard: {
    id: 'InstructionCard',
    kind: 'instructionCard',
    label: 'Instruction card',
    description:
      'Provides short, static orientation copy that sits inline with the conversation to explain what will happen next.',
  },
  ProgressIndicator: {
    id: 'ProgressIndicator',
    kind: 'progressIndicator',
    label: 'Progress indicator',
    description:
      'Mirrors onboarding or workflow progress (step out of total) so the agent and UI can reinforce momentum.',
  },
  InlineCapability: {
    id: 'InlineCapability',
    kind: 'inlineCapability',
    label: 'Inline capability',
    description:
      'Lightweight inline actions embedded in text, such as small “Enable” / “Skip” affordances backed by ActionButton-style endpoints.',
  },
  Composite: {
    id: 'Composite',
    kind: 'composite',
    label: 'Composite card (future)',
    description:
      'Multi-field cards or checklists that bundle several related fields or actions into one cohesive unit. Reserved for future flows.',
  },
};


