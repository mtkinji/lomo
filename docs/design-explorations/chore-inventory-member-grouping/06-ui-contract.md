# UI Contract: Chore Inventory Member Grouping

Job: When reviewing recurring household work, the caregiver needs to scan responsibility by participant, so they can understand and adjust the family rhythm without reading every row.

Authority chain: Andrew's explicit direction -> accepted Chores brief -> Kwilt Inventory/List Candidate pattern -> current `InventoryControlGroup` and `DropdownMenu` -> iOS accessibility conventions.

Three-second read: Charlie's chores, Olive's chores, and Household chores are three clear sections.

Primary action: open a chore row to edit its stable series.

Primary information: member/Household section identity and the chores inside it.

Secondary information: cadence and optional token value.

Reveal later: grouping choice in the layers menu; assignee pills only in the flat list.

Scan order: inventory controls -> member section -> chore rows -> next member section.

Must not add: toolbar copy, helper text, collapse affordances, counts as performance signals, sorting, saved views, comparison, or dashboard chrome.

Reuse map: filter/group rail -> `InventoryControlGroup`; choice -> `DropdownMenu`; grouping icon -> `layers`; rows -> `ActivityListItem`; identity -> `ChoreMemberPill` in flat mode.

Nearest precedent: To-dos inventory rail. Difference: the Chores grouping choice is a two-option immediate menu, so a full-height grouping drawer and Apply step would be disproportionate.

External exemplar ledger: N/A. The supplied screenshot is current-project runtime evidence, not an external product reference.

Behavior sources: Member default and section names -> Andrew's direction; Household-last ordering -> current Household/member model; None option -> reversible view control; filter behavior -> existing caregiver inventory.

Unresolved decisions: none for this slice.

Required states: all chores grouped; all chores flat; one child filtered and grouped; Household filtered and grouped; empty filtered result; tokens on/off; long chore names; smallest supported phone viewport.

Proof path: Settings -> Kwilt Labs -> Chores -> switch to Andrew on iPhone 17 Pro/iOS 26.5 Simulator; inspect grouped default, open grouping menu, choose None, apply Charlie and Household filters, and open a row. Physical-device, Android, Dynamic Type, and assistive-technology proof remain separate.
