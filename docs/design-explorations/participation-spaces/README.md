# Participation Spaces Exploration

Status: **platform direction converged; no implementation or canonical taxonomy changes authorized**

This exploration asks how Kwilt should support people who participate in several named parts of life without turning the app into a workspace switcher, social network, or family-administration product.

The working term is **Space**:

> A named, durable participation boundary in which people may have different relationships and explicitly scoped rights.

Examples include a direct household such as **The Watanabes**, an extended-family space such as **Watanabe Family**, or another durable context that repeatedly brings the same people together. A one-off share does not require a Space, and a scoped participant such as an accountability partner does not require a new two-person Space.

## Product rules already established

1. **Spaces are permission and provenance boundaries, not navigation modes.**
2. **My To-dos, Today, Plan, Search, Notifications, and Agent aggregate what is relevant to the signed-in person across Spaces.**
3. **Responsibility determines personal list membership. Space determines source and access.**
4. **Joining a Space does not reveal every capability or object in it.**
5. **Relationship labels describe people; explicit grants determine authority.**
6. **Payment entitlement never silently grants data access.**
7. **One-off copy, live sharing, and durable Space participation are different user promises.**

## Artifacts

- [Frame and system alignment](./00-frame.md)
- [Yes-and expansion](./01-yes-and.md)
- [Personas, jobs, job steps, and use cases](./jobs-personas-and-use-cases.md)
- [System-design rubric](./system-design-rubric.md)
- [Divergent system models](./02-diverge.md)
- [Lifecycle, ownership, and safety contract](./lifecycle-ownership-and-safety.md)
- [Sponsorship and entitlement contract](./sponsorship-and-entitlements.md)
- [Critical scenario walkthroughs](./critical-scenario-walkthroughs.md)
- [Leading-hypothesis coverage assessment](./leading-hypothesis-assessment.md)
- [Converged direction](./03-converge.md)
- [Current-plan pressure test](./current-plan-pressure-test.md)

## Decision discipline

These documents are a rubric for continuing design, not a decision to build a generic collaboration platform. Before a model converges, it must:

- serve the documented jobs without introducing a global active-Space switcher;
- preserve solo Kwilt with no participation setup;
- remain legible to a family rather than sounding like enterprise administration;
- keep private capability data private by default;
- distinguish direct household operation, extended-family contribution, and trusted individual support;
- separate membership, authority, object sharing, and payment;
- explain copy versus live sharing;
- survive removal, role change, offline use, and payment change; and
- earn any new canonical persona, JTBD, or job-flow node with evidence rather than architectural neatness.

## Current conclusion

The leading model now clears the documented convergence threshold as a platform direction. The lifecycle and sponsorship passes removed every score-1 case without adding a Space switcher, nesting, or a generic social layer.

The next review is narrower: reconcile the existing feature briefs and choose the first learning checkpoint. Family memories, adversarial co-parenting, dependent independence, and abuse recovery remain specialized workstreams rather than hidden gaps in the common architecture.
