# Frame: Intelligent Chat Titles

## What the user said
> I also want chats to get named intelligently based on how they started. And if the chat history gets compressed, you can rename the chat based on the compressed understanding of it.

## Restated in user voice
When I return to a list of conversations, I want each name to reflect what the conversation is really about, so I can resume the right thread without rereading it or maintaining titles myself.

## Target audience and job
`audience-ai-native-life-operators`, represented by Nina. This serves `jtbd-trust-this-app-with-my-life` and `jtbd-get-help-without-retelling-my-life`: durable continuity is only useful when the correct thread is recognizable.

## Job-flow step
Nina's “keep using Kwilt across tools” and “undo or audit past actions” steps remain underserved. The durable thread exists, but repeated `New chat` labels make continuity difficult to navigate.

## System alignment
Constraint posture: `Fit the system`.

- Threads already have durable titles and a manual rename path.
- The shared coach service already compresses older turns into a local conversation summary.
- Opening and compression model calls can suggest a short title without adding a visible naming workflow.
- A durable title source is required so automation never overwrites a manual rename.

## Aspirational design challenge
How might we help Nina recognize and resume the right conversation at a glance, while preserving her authorship over any title she chooses herself?

## Out of scope
Title history, title editing inside the menu, cross-thread merging, and semantic folders.

