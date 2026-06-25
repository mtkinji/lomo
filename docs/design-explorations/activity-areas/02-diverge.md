# Diverge: Activity Areas

Axis of variation: lightweight metadata vs scheduling-first setup vs recommendation-first intelligence.

## Alternative A: Field First

Add an optional **Area** picker to Activity detail and Quick Add refinement. Settings owns the Area list and intelligent defaults. Scheduling and Recommended can consume the field later, but V1 mostly proves whether users understand and use the label.

- Persona fit: Medium. It is easy to understand, but value may feel delayed.
- Design-challenge answer: Gives Maya a calm way to say where a to-do belongs.
- System fit: Strong. It extends Activity metadata and Settings without reshaping scheduling.
- Best when: the team wants the smallest data-model step and lowest implementation risk.
- Fails when: Area feels like another tag because scheduling does not use it yet.
- Anti-pattern check: Pass if Area remains optional and suggested, not required.

## Alternative B: Scheduling-First Areas

Settings introduces **Areas** and asks, "When do these areas usually fit?" Each Area has optional availability windows and a scheduling mode. Activities can be assigned an Area, and scheduling uses that Area to propose or validate time slots.

- Persona fit: Strong. The value is immediate: Work tasks fit work windows; Family tasks fit family windows.
- Design-challenge answer: Connects life-domain meaning directly to scheduling.
- System fit: Strong-medium. It generalizes existing Plan Availability and `schedulingDomain` logic.
- Best when: the highest-priority value is smarter scheduling.
- Fails when: setup feels like a scheduling matrix instead of a gentle preference.
- Anti-pattern check: Pass if setup is concise, defaults work without editing, and scheduling stays previewable.

## Alternative C: Recommended-First Areas

Areas are introduced primarily to improve Smart order and Recommended. The current moment, surface, or manually selected planning mode weights matching Area tasks higher. Scheduling uses Areas later.

- Persona fit: Medium-strong. It helps the list feel more relevant without asking for calendar setup.
- Design-challenge answer: Makes "what should I do now?" more aware of life mode.
- System fit: Strong. It builds on the existing recommendation scorer.
- Best when: the team wants visible value before touching scheduling preferences.
- Fails when: recommendations shift without an obvious scheduling reason and users wonder why.
- Anti-pattern check: Pass only if Area fit is bounded and explainable.

## Alternative D: AI-Suggested Areas Only

Kwilt infers an Area from title, notes, Goal, and prior behavior. The user sees suggestions and corrections, but Settings management is secondary.

- Persona fit: Medium. It reduces manual work but risks trust if it silently mislabels family commitments.
- Design-challenge answer: Helps if suggestions are obvious and reversible.
- System fit: Medium. AI suggestions can use existing metadata, but durable behavior needs confirmation rules.
- Best when: Activity titles are rich and the user rarely wants to manage Settings.
- Fails when: wrong suggestions affect scheduling.
- Anti-pattern check: Risky. Auto-labeling without confirmation would violate trust.

## Alternative E: Area Views

Add Areas as a primary list organization lens: Work, Personal, Family, Home, Health. Users can switch or group by Area in Activities.

- Persona fit: Medium. It helps scanning, but risks pulling the feature toward view management.
- Design-challenge answer: Helps when Maya wants to inspect a subset.
- System fit: Medium. It overlaps with grouping and saved views.
- Best when: users explicitly ask for one master list sectioned by life area.
- Fails when: Area becomes another visible taxonomy to maintain.
- Anti-pattern check: Pass only as follow-on inspection, not V1 center.

## Directional Read

Alternative B has the strongest product fit because the user explicitly connected Areas to scheduling setup. It should borrow Alternative A's small metadata step and Alternative C's bounded recommendation use, while deferring Area Views until there is evidence users want them.
