# Frame: Unified Chat local-first inference

## What the user said

> Anything to save me money while preserving performance and quality will be great. On device is preferable if it can do that.

## Restated in user voice

When I ask Kwilt for a tiny conversational or text-help task, I want an immediate, private answer without paying for a cloud model, while keeping the stronger cloud path for work that needs Kwilt context, tools, current information, or deeper reasoning.

## Target audience and job

- Audience: `audience-ai-native-life-operators`
- Representative persona: Nina
- Hero JTBD: `jtbd-trust-this-app-with-my-life`
- Active anchors: `jtbd-get-help-without-retelling-my-life`, `jtbd-understand-why-ai-suggested-this`, and `jtbd-stay-in-control-of-ai-actions`
- Job-flow gap: step 2 of `job-flow-nina-trust-ai-with-my-life-system` remains score 3 because ordinary-language response reliability and latency still need runtime proof.

## Current system and constraints

Unified Chat already separates planning, bounded context authorization, capability-owned tools, and response execution. The current cloud model map remains useful for complex work, but a tiny social turn can still incur network latency and paid inference.

The local route must preserve these constraints:

- no private Kwilt records are sent into the first on-device slice;
- no capability action, current-information request, attachment, or evidence-grounded answer is delegated locally;
- capability policy and action authority remain deterministic and cloud/tool owned;
- unavailable, unsupported-locale, cancelled, or failed local generation falls back automatically;
- no user-facing model or provider selector;
- no app-launch prewarm.

## Aspirational design challenge

How might we make the smallest Chat interactions feel instant and private on a capable iPhone, while making local inference an invisible optimization rather than a second, less trustworthy assistant?
