## Goal creation best practices (research-backed) — 30–90 day goals

This doc translates well-supported goal-setting and behavior-change research into **practical guidance for creating great 30–90 day goals in Kwilt**.

It is written to be usable for:
- **Product + UX**: what the UI should ask for and validate
- **Prompting**: what the Goal Creation agent should produce
- **Users**: what “good” sounds like in plain language

---

## Core ideas (the “why” in one page)

### 1) “Specific + challenging” beats “vague + inspiring”

Research in Goal-Setting Theory consistently finds that goals that are **specific and appropriately challenging** tend to outperform “do your best” style goals—especially when paired with commitment and feedback loops.

- Key reference: Locke & Latham, 2002 ([doi:10.1037/0003-066X.57.9.705](https://doi.org/10.1037/0003-066X.57.9.705))

**Kwilt translation**: your goal must define an **observable outcome** and be **right-sized** (hard enough to matter, small enough to finish in 30–90 days).

### 2) “If–then plans” help bridge the intention → action gap

Implementation intentions (“If situation X happens, then I will do Y”) are a proven method to increase follow-through by tying action to a cue.

- Key reference: Gollwitzer, 1999 ([doi:10.1037/0003-066X.54.7.493](https://doi.org/10.1037/0003-066X.54.7.493))

**Kwilt translation**: keep the Goal itself outcome-focused, but ensure the Goal implies an obvious next step for activities and can be easily supported with “if–then” Activities in the Plan.

### 3) Monitoring progress improves attainment (but only if it’s not too heavy)

Monitoring progress against a goal tends to improve goal attainment in experimental evidence, especially when paired with feedback/adjustment.

- Key reference: Harkin et al., 2016 ([doi:10.1037/bul0000025](https://doi.org/10.1037/bul0000025))

**Kwilt translation**: goals should have a **simple progress signal** (even if it’s a proxy), and the UI should encourage lightweight weekly check-ins.

### 4) Intrinsic motivation and need support matter for persistence

Self-Determination Theory highlights autonomy, competence, and relatedness as foundational psychological needs that support sustained motivation and wellbeing.

- Key reference: Ryan & Deci, 2000 ([doi:10.1037/0003-066X.55.1.68](https://doi.org/10.1037/0003-066X.55.1.68))

**Kwilt translation**: great goals feel **chosen**, help the user feel **capable**, and often involve **people** (or service/connection) when relevant.

### 5) Habits form with repetition in a stable context—and it can take longer than people think

Habit formation in everyday life tends to follow an asymptotic curve (fast early gains, then slower), with substantial individual variability.

- Key reference: Lally et al., 2010 ([doi:10.1002/ejsp.674](https://doi.org/10.1002/ejsp.674))

**Kwilt translation**: when a goal depends on habit formation, the goal should specify a **repeatable behavior in a stable context**, but still anchor on an outcome the user cares about.

---

## A “Kwilt great goal” definition

A great 30–90 day goal in Kwilt is:

- **One focus**: not a bundle of unrelated projects
- **Outcome-shaped**: defines what “done” looks like, not just a recurring task
- **Timeboxed**: implicitly or explicitly 4–12 weeks
- **Measurable or checkable**: has a clear indicator (metric or “did it happen?”)
- **Arc-aligned**: fits the storyline of the chosen Arc (if any)
- **Human language**: grounded and personal; avoids corporate jargon
- **Activity-ready**: implies obvious next actions without listing them inside the goal text

---

## Goal types (and how to write each well)

### Outcome goals (preferred default)

**Definition**: “By the end of this window, X exists / is true.”

**Best for**: shipping, finishing, completing, launching, making, producing.

**Template**
- **Title**: Verb + object + scope boundary
- **Description**: “Over the next \<timeframe>, \<deliverable/outcome> so that \<why it matters>.”

**Example**
- Title: Ship Kwilt MVP to TestFlight
- Description: Over the next 6–8 weeks, ship a TestFlight build that supports onboarding, creating one Arc + one Goal, and adding activities—so I can get real feedback from a small group of early users.

### Performance goals (useful when the outcome is fuzzy)

**Definition**: “Improve a measurable indicator by X.”

**Best for**: fitness metrics, money metrics, content cadence, skill reps.

**Template**
- Title: Improve \<metric> (or reach \<threshold>)
- Description: “Over the next \<timeframe>, move \<metric> from ~\<baseline> to \<target> by \<general approach>.”

**Example**
- Title: Publish 6 short essays
- Description: Over the next 8 weeks, publish 6 essays (500–900 words) so I’m practicing the full loop from idea → draft → share without waiting for perfect.

### Process goals (when the process *is* the product)

**Definition**: “Do X consistently.”

**Risk**: easy to turn into a brittle “task list” that doesn’t create meaning.

**When to use**: skill-building, habit-building, health routines—when the process is the best available proxy.

**Template**
- Title: Build a \<cadence> of \<behavior>
- Description: “Over the next \<timeframe>, do \<behavior> \<frequency> in \<stable context> so that \<outcome/identity benefit>.”

**Example**
- Title: Build a weekly writing rhythm
- Description: Over the next 8 weeks, write for 45 minutes every Tue/Thu morning so writing feels normal again and I have material worth sharing.

---

## The “quality checklist” (for prompting + UI validation)

Use this when generating or editing a goal draft:

- **Single focus**: Is there exactly one main outcome?
- **Done-ness**: Could a stranger tell if it happened?
- **Timebox**: Does it clearly fit 30–90 days?
- **Scope boundary**: Is it sized to the user’s reality (time/energy/season)?
- **Progress signal**: Do we have a metric/proxy/check?
- **Arc fit**: If placed in an Arc, does it belong there?
- **Language**: Would a real person say this? Is it free of vague abstractions?

Common failure modes:
- Vague (“reflect more”, “be healthier”, “level up my career”)
- Too big (“change my life”, “become a great leader”)
- Not a goal (it’s an activity list)
- Not anchored in the user’s prompt (feels generic)

---

## Translating a fuzzy desire into a strong 30–90 day goal (recipe)

### Step 1: Clarify the “wanted change”

Prompt: “In 8 weeks, what would be different enough that you’d feel this was worth it?”

Output: one sentence capturing the change.

### Step 2: Choose a progress signal (metric or proxy)

Pick one:
- A count (publish 6 essays)
- A milestone (TestFlight build shipped)
- A threshold (run 5K without stopping)
- A “checkable event” (have 4 intentional catch-ups)

### Step 3: Right-size the scope

Shrink until it’s plausible:
- reduce breadth
- reduce quality bar
- reduce dependencies
- shorten the definition of done

### Step 4: Add one constraint boundary (optional but powerful)

Examples:
- “No more than 5 hours/week”
- “Must fit family evenings”
- “Only weekdays”

### Step 5: Keep motivation self-concordant (make it *theirs*)

Ensure the description includes a natural “so that” that reflects autonomy/meaning:
- “so I can…”
- “so it feels…”
- “so we…”

(This aligns with SDT’s emphasis on autonomy/competence/relatedness.)

---

## Kwilt field mapping (what the agent should output)

Kwilt’s current `GOAL_PROPOSAL_JSON` expects:

- **title**: short, concrete, human
- **description**: 1–2 sentences, includes timeframe and “why + what”
- **status**: default `planned`
- **forceIntent**: optional 0–3 sketch across:
  - `force-activity`
  - `force-connection`
  - `force-mastery`
  - `force-spirituality`

Practical mapping guidance:
- If the goal is mostly “make/ship/build”: raise **mastery** and **activity**
- If it’s relational: raise **connection**
- If it’s reflective/devotional: raise **spirituality**

---

## Examples: weak → strong rewrites

### “Reflect on my experiences…”

- Weak: “I want to reflect on and document my experiences from the first time I played with my team.”
- Stronger (outcome): **Title**: Write a first-season reflection for my team  
  **Description**: Over the next 6 weeks, write and share a 2–3 page reflection capturing the biggest lessons and moments from my first season playing with my team, so those memories become part of my story instead of fading.

### “Ship Kwilt app”

- Weak: “Shipping Kwilt app”
- Strong: **Title**: Ship Kwilt MVP to TestFlight  
  **Description**: Over the next 6–8 weeks, ship a TestFlight build that supports onboarding, creating one Arc + one Goal, and adding activities—so I can get real feedback from a small group of early users.

---

## References (primary)

- Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation: A 35-year odyssey. *American Psychologist.* ([doi:10.1037/0003-066X.57.9.705](https://doi.org/10.1037/0003-066X.57.9.705))
- Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. *American Psychologist.* ([doi:10.1037/0003-066X.54.7.493](https://doi.org/10.1037/0003-066X.54.7.493))
- Harkin, B., Webb, T. L., Chang, B. P. I., Prestwich, A., Conner, M., Kellar, I., Benn, Y., & Sheeran, P. (2016). Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence. *Psychological Bulletin.* ([doi:10.1037/bul0000025](https://doi.org/10.1037/bul0000025))
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist.* ([doi:10.1037/0003-066X.55.1.68](https://doi.org/10.1037/0003-066X.55.1.68))
- Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). How are habits formed: Modelling habit formation in the real world. *European Journal of Social Psychology.* ([doi:10.1002/ejsp.674](https://doi.org/10.1002/ejsp.674))


