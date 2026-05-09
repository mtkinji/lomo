---
feature: ai
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-trust-this-app-with-my-life
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-move-the-few-things-that-matter
  - jtbd-see-my-arcs-in-everyday-moments
  - jtbd-make-sense-of-the-season
  - jtbd-recover-when-i-drift-from-an-arc
briefs:
  - ai-proxy-and-quotas
  - external-ai-connector
status: shipped
last_reviewed: 2026-05-09
---

# ai

Helps Nina use AI near her life system while preserving inspection, permission, reversibility, and calm control.

## Surfaces in this folder

- `AiChatScreen.tsx` - conversational AI entry point.
- `AgentWorkspace.tsx` - inspectable workspace for AI-generated actions and proposals.
- `agentRuntime.ts`, `workflowRegistry.ts`, and `WorkflowRuntimeContext.ts` - runtime substrate for permissioned workflows.
- `systemPrompts.ts` - prompt contract that keeps AI behavior aligned with Kwilt's product posture.
- `ShareIntakeFlow.tsx` - intake path from shared or external contexts.

## Notes

AI should make the system easier to operate, not more mysterious. Preview, approval, and auditability are load-bearing product constraints for this folder.
