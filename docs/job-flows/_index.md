# Job Flows

Job flows are a product operating artifact. They map Kwilt's demand model to the actual product experience and keep a running score of how well Kwilt helps each audience accomplish its hero job.

```text
Audience
  -> Representative persona
    -> Hero JTBD
      -> Job steps
        -> Current Kwilt flow
          -> Offerings
            -> Delivery score
              -> Aspirational challenge
```

Use job flows to answer: "How well does Kwilt help this person accomplish the job today, where is delivery weak, and how might we do it better?"

## Where Job Flows Are Used

- **Roadmap prioritization** - pick work based on low delivery scores on important hero jobs.
- **Design-thinking** - frame new work around an underserved job step and ask how Kwilt could do it better.
- **feature brief authoring** - link each feature to `audiences:`, `personas:`, `hero_jtbd:`, `job_flow:`, and `serves:`.
- **Product review / QA** - check whether the shipped behavior actually improves the job step.
- **Analytics** - map events and funnels to job steps, not only screens.
- **Growth / positioning** - explain Kwilt by audience and hero job, not a feature list.
- **Reflect after ship** - update delivery scores, gaps, and evidence after a feature lands.

## Scoring

Use a 1-5 delivery score per job step:

- **1** - Kwilt does not really support this yet.
- **2** - Supported indirectly or awkwardly.
- **3** - Supported, but with clear friction or gaps.
- **4** - Strongly supported with minor gaps.
- **5** - Excellent, differentiated, and trustworthy.

## Current flows

- [Marcus: move the few things that matter](marcus-move-the-few-things-that-matter.md)
- [Sarah: see who I'm becoming](sarah-see-who-im-becoming.md)
- [Elena: recover when I drift](elena-recover-when-i-drift.md)
- [David: invite the right people in](david-invite-the-right-people-in.md)
- [Nina: trust AI with my life system](nina-trust-ai-with-my-life-system.md)

## How to use in design work

In `design-thinking-loop` Phase 1:

1. Select the target audience and named persona from `docs/personas/`.
2. Read the matching job flow here if one exists.
3. Identify the hero JTBD, underserved job step, current Kwilt offering, and delivery score.
4. Write the aspirational design challenge against the underserved step, not against a vague feature idea.

If no job flow exists for the selected audience/hero JTBD, create a provisional flow before Diverge.
