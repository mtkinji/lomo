# Evaluate Learning: Activation Experiment Drafting Loop

## Learning questions

- Does the loop help Andrew move from activation evidence to a concrete experiment faster?
- Does mapping weak stages to job flows improve the quality of experiment framing?
- Is one experiment candidate enough, or does Andrew need alternatives before choosing?
- Does the Kwilt Goal draft feel like useful durable work or extra admin?
- Does the loop know when the data is too thin and recommend instrumentation instead?
- Does the process preserve trust by previewing assumptions and writes before mutation?

## Evidence that supports the bet

- Andrew accepts or lightly edits the recommended experiment.
- The Kwilt Goal draft is approved with minimal restructuring.
- The experiment ships or reaches a clear build decision.
- The follow-up reflection can compare the intended activation stage against actual movement.
- The loop produces less time spent re-deriving the same activation model.

## Evidence that disconfirms the bet

- The loop repeatedly recommends obvious or low-leverage experiments.
- The Goal draft is noisy, too granular, or misaligned with how Andrew wants to work.
- The opportunity score hides judgment rather than clarifying it.
- Andrew still has to redo the product framing manually after the loop runs.
- The loop overfits to small samples and invents false confidence.

## Instrumentation and notes

Track manually at first:

- Date the loop ran.
- Data window and exclusions used.
- Weak stage selected.
- Experiment candidate title.
- Whether Andrew accepted, edited, rejected, or deferred it.
- Whether a Kwilt Goal was created.
- Whether the experiment shipped.
- What decision was made after the learning window.

Do not track:

- Named user journeys in durable artifacts unless needed for debugging.
- Sensitive personal details from user records.
- Vanity metrics that do not connect to meaningful daily active use.

## Decision rule

After three loop runs or one complete experiment cycle, decide:

- **Proceed:** the loop produced a useful experiment and a reviewable Kwilt Goal.
- **Revise:** the diagnosis was useful but the experiment or Goal payload needed too much manual repair.
- **Simplify:** the audit brief was useful but the design-loop automation was premature.
- **Retire:** the loop created more ceremony than learning.

## Expected next action

Create the feature brief and define the V1 skill/script contract for the internal Activation Experiment Drafting Loop.
