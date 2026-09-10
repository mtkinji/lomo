# Four Home feed patterns

Status: implemented candidates for Andrew's review; not canonical. Updated to the accepted soft-card / metadata-below trial. September 9, 2026.

The accepted direction distinguishes reader intent from backend record type. Home has four compositions: **Moment**, **Contribution**, **Personal message**, and **Invitation / request**. The 11 content categories and 46 representative fixtures are coverage within those compositions.

| Pattern | Contract | Source adapters |
| --- | --- | --- |
| Moment | Soft card: media, words and source context → metadata below → cheer/comment/save → conversation preview | SharedLifePostCard; text/photo, goal, place, outing |
| Contribution | Soft card: factual work and approval state → compact metadata below → thanks/comment | SharedLifeChoreCard; no authored words or private evidence implied |
| Personal message | Soft card: message context, words and source continuation/outcome → sender metadata below | PersonalMessageItem; goal_note, goal_checkin |
| Invitation / request | Soft card: purpose, explanation and participation action/outcome → sender metadata below | InvitationRequestItem; goal_invitation, game_turn, meal_choice_round |

FeedItemParts owns a common metadata row, 44pt overflow target, DropdownMenu behavior, context grouping and social response row. All use existing Kwilt primitives and tokens. DeliveryCard remains a compatibility adapter, not a fifth pattern. Message/request actions retain exact existing source routing and authorization; this does not create direct messages, inline voting or new invitations.

## Composition rules

- Feed owns 32pt inter-item spacing and item adapters supply 16pt content gutters once. Every pattern uses the same soft content card with no shadow or border. The card-to-metadata gap is 8pt; the next item remains 32pt away.
- Content comes before metadata and response controls. Attached context uses a quiet leading rule rather than another card.
- Person names use the same typography/avatar implementation; contribution compactness is an explicit metadata variant. Audience/recipient context and time use shared secondary treatment and time formatting.
- Post author navigation exposes audience/time as accessibility context. Source senders are not given an invented profile destination.
- Every overflow uses the same menu; actions remain permission-dependent. Delete remains destructive and uses existing downstream ownership/confirmation.
- Social responses share spacing and selected semantics; thanks and cheer retain their different meanings. Save is optional and private. Action rows wrap with larger text.
- Requests use a neutral outline action; messages use a quiet source link. Pending does not automatically imply visual urgency. The feed does not repeat primary buttons.
- Outcomes only assert what source evidence supports. Accepted/declined invitation and responded/closed voting have known reason mappings; unknown settlement does not claim acceptance or completion. Unavailable source content has no open action.

## References and proof

Authority is the accepted Connected Moments PRD and current user decision, then native accessibility and Kwilt's constitution/components/tokens. Instagram screenshots supplied by Andrew inform stable anatomy and content emphasis, not Kwilt's four-pattern taxonomy or tokens. No external imagery or iconography was copied. RNR remains the generic native anatomy reference; no upstream component was localized or new dependency added.

Review: native Dev tools → Review Home feed items → Four patterns → Mixed feed. The browser manager also filters all 46 examples by pattern and retains reviews by stable ID. Fixture revisions were incremented so prior decisions require recheck. Storybook includes four individual candidates and their mixed composition. Backend publication, signed-device and release behavior are outside this visual implementation pass.

## Soft-card trial

The content surface uses Kwilt Card, shellAlt fill, existing card radius, zero margin and no elevation. Photos remain within the content boundary; text/context gets 16pt internal padding. Metadata sits below and outside the card: smaller avatar/name, audience/recipient context, timestamp and overflow. Social controls and conversation previews follow outside. Source participation actions stay inside their content card. Chore headlines and message/invitation wording preserve the identity needed to understand them without consulting the metadata. No new publication, audience or routing behavior.

## Purpose-led revision — September 9

Andrew accepted six working jobs: catch up, be seen, recognize, respond, participate, remember. The everyday-connection anchor remains provisional; these are the explicit design criteria for this revision.

- Moment: words/photo lead; light outlined surface; conversation preview only when real.
- Contribution: compact factual details with a leading boundary; acknowledge effort with Thanks. Approval meaning is preserved.
- Personal message: words receive quotation typography on a restrained neutral surface; source continuation stays quiet.
- Invitation/request: purpose and explanation precede one outline participation action or truthful outcome.

Metadata uses a 24pt avatar, inline name/time and explicit audience beneath. Reaction and conversation icons sit alongside it in 44pt targets. Saving and responder detail move into the existing menu; no empty response section or always-visible Save row. Capability labels are removed where source context already explains the content. All source callbacks, authorization and publication behavior remain unchanged.

Current user direction supersedes the earlier uniform soft-card and separate response-row rules. Card uses compactCard radius and semantic card/border tokens. Existing Card, Button, Icon, ProfileAvatar and DropdownMenu remain the implementation authorities; feed compositions remain candidates.

Reference ledger: shadcn Card documentation, Airbnb listing surface, Pinterest documentation and Andrew's Instagram screenshots reviewed September 9. Preserve distinct content/secondary/action hierarchy; translate spacing, radii, controls and typography through Kwilt; reject imported assets, dashboard footers and popularity emphasis. No new dependency.

## Canvas correction

Andrew requested an extremely light gray feed canvas with white cards. All four content surfaces now use white card tokens without outlines or shadows; gray50 defines the Home-local feed canvas. Metadata remains on the gray canvas. The distinct content and action hierarchies remain. This supersedes the message fill and contribution leading boundary in the prior trial.

Canvas token refinement: Andrew selected `colors.gray100` (#F5F5F4) in place of gray50 for clearer white-card separation.
