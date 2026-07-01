# Deterministic Question Pressure Test: object-creation-ux-system

## Purpose

Pressure test the creation-question grammar against the activation constraint:

- mobile users should type as little as possible,
- the first screen should not feel like a cold blank page,
- visible options should sound like normal user language,
- hidden meanings can carry the academic/product precision,
- FTUX should activate the user into meaningful motion rather than complete their whole life architecture.

## Candidate Personas And First Inputs

| Persona | Situation | First input |
| --- | --- | --- |
| Charlie, 14 | Casual youth interest | Tennis |
| Lena, 16 | School pressure | School assignments |
| Marcus, 37 | Burned-out builder | Launch my side project |
| Sarah, 34 | Faith/values-driven | Prayer |
| Maya, 41 | Family organizer | Family dinners |
| Elena, 29 | Restarting after drift | Running again |
| David, 45 | Private accountability | Repair friendship with Sam |
| Nina, 31 | Life admin | Organize finances |
| Theo, 22 | Negative pattern | Stop scrolling at night |
| Priya, 39 | Creative re-entry | Painting |

## Question 1: Category Recognition

### Candidate

`What kind of thing is it?`

Options:

- A skill or hobby
- Health or energy
- School or work
- Money or home
- Relationships
- Faith or values
- A habit I want to change
- Something else

### Pressure Test

| Input | Best option | Fit |
| --- | --- | --- |
| Tennis | A skill or hobby | Strong |
| School assignments | School or work | Strong |
| Launch my side project | School or work | Medium; "project" is missing |
| Prayer | Faith or values | Strong |
| Family dinners | Relationships | Medium; family/home overlap |
| Running again | Health or energy | Strong |
| Repair friendship with Sam | Relationships | Strong |
| Organize finances | Money or home | Strong |
| Stop scrolling at night | A habit I want to change | Strong |
| Painting | A skill or hobby | Strong |

### Revision

Add `A project or creative thing` to cover side projects, painting, and build-oriented adults without forcing them into school/work.

### Recommended Question

`What kind of thing is it?`

Recommended options:

- A skill or hobby
- A project or creative thing
- Health or energy
- School or work
- Money or home
- Relationships
- Faith or values
- A habit I want to change
- Something else

Hidden meaning: broad arena signal for examples, generation tone, and later routing. This is recognition, not taxonomy education.

## Question 2: Typed Seed

### Candidate

`Name it in a few words.`

### Pressure Test

Works across all inputs because it asks for a short label, not a composed aspiration. The category selected in Question 1 can adapt placeholder examples.

Examples:

- Skill or hobby: `tennis, guitar, drawing`
- Project or creative thing: `side project, podcast, painting`
- Health or energy: `sleep, running, eating better`
- Money or home: `saving money, organizing my room`
- Relationships: `family dinners, friendship with Sam`
- Faith or values: `prayer, service, patience`
- Habit change: `less scrolling, earlier bedtime`

### Recommended Question

`Name it in a few words.`

Hidden meaning: user-authored concrete focus. This should be the only required typing before the first payoff.

## Question 3: Progress Intent

### Earlier Candidate

`What would progress look like in the next few weeks?`

Earlier options:

- Show up consistently
- Improve one part
- Prepare for something
- Make time for it
- Finish or complete something
- Make it easier to start
- Build confidence
- Change a pattern
- Something else

### Failure Mode

The question is accurate but a little unnatural. The options make the user do product-model reasoning. Charlie may want "get better at tennis" overall, not "improve one part." Youth users and concrete-first users need recognition language first; Kwilt can add structure later.

### Recommended Question

`What do you want to do with it?`

Recommended options:

- Get better at it
- Do it more often
- Get ready for something
- Feel more confident
- Make more time for it
- Get organized
- Work through something hard
- Finish or launch something
- Something else

### Pressure Test

| Input | Best option | Fit |
| --- | --- | --- |
| Tennis | Get better at it | Strong |
| School assignments | Finish or launch something | Medium; "finish" fits, "launch" does not |
| Launch my side project | Finish or launch something | Strong |
| Prayer | Do it more often / Make more time for it | Strong |
| Family dinners | Make more time for it | Strong |
| Running again | Do it more often | Strong |
| Repair friendship with Sam | Work through something hard | Strong |
| Organize finances | Get organized | Strong |
| Stop scrolling at night | Work through something hard | Medium; option fits but could sound heavy |
| Painting | Get better at it / Do it more often | Strong |

### Revision

`Finish or launch something` is too adult for school assignments. Use `Finish something` visibly and carry launch/ship in the hidden meaning.

`Work through something hard` covers relationships but may feel heavy for habit change. Keep it, because it is human-readable and broad, but the habit category can also map `A habit I want to change` + this option into pattern-change generation.

### Ideal Question

`What do you want to do with it?`

Ideal options:

- Get better at it
- Do it more often
- Get ready for something
- Feel more confident
- Make more time for it
- Get organized
- Work through something hard
- Finish something
- Something else

Hidden meanings:

- Get better at it -> improvement / skill growth
- Do it more often -> consistency
- Get ready for something -> preparation
- Feel more confident -> confidence
- Make more time for it -> availability / scheduling
- Get organized -> ordering / life admin
- Work through something hard -> repair / friction / pattern change
- Finish something -> completion / shipping / visible milestone

## Question 4: Meaning

### Candidate

`What matters most about it?`

Options:

- I enjoy it
- I want to get better
- It gives me energy
- It would make life better
- It helps me care for or serve others
- It connects to who I am
- I do not want to lose it
- Something else

### Pressure Test

| Input | Best option | Fit |
| --- | --- | --- |
| Tennis | I enjoy it / I want to get better | Strong |
| School assignments | It would make life better | Strong |
| Launch my side project | It connects to who I am | Strong |
| Prayer | I do not want to lose it / It connects to who I am | Strong |
| Family dinners | It helps me care for or serve others | Strong |
| Running again | It gives me energy | Strong |
| Repair friendship with Sam | It helps me care for or serve others | Strong |
| Organize finances | It would make life better | Strong |
| Stop scrolling at night | It would make life better | Strong |
| Painting | I enjoy it / It connects to who I am | Strong |

### Recommended Question

Keep it.

`What matters most about it?`

This question fixes the earlier repetition problem because it does not imply the user failed to explain their reason. It asks them to choose the primary meaning lens Kwilt should preserve.

## Question 5: Identity Bridge

### Candidate

`What kind of person does this help you become?`

Options:

- Someone who keeps showing up
- Someone who practices and improves
- Someone steady when it is hard
- Someone who bounces back
- Someone others can count on
- Someone more present with people
- Someone who lives what matters
- Something else

### Pressure Test

| Input | Best option | Fit |
| --- | --- | --- |
| Tennis | Someone who practices and improves | Strong |
| School assignments | Someone who keeps showing up | Strong |
| Launch my side project | Someone who keeps showing up / Someone who practices and improves | Medium |
| Prayer | Someone who lives what matters | Strong |
| Family dinners | Someone more present with people | Strong |
| Running again | Someone who bounces back | Strong |
| Repair friendship with Sam | Someone more present with people / Someone steady when it is hard | Strong |
| Organize finances | Someone others can count on | Medium |
| Stop scrolling at night | Someone steady when it is hard | Strong |
| Painting | Someone who practices and improves | Strong |

### Failure Mode

The question is the most "Kwilt" question, but it may be one question too many before payoff for some users. It is still valuable because it directly improves Arc quality.

### Recommendation

Keep this in FTUX if the flow still feels fast after the first four steps. If activation feels heavy, make this the first post-payoff refinement rather than pre-generation.

Preferred visible wording:

`Who is this helping you become?`

Ideal options:

- Someone who keeps showing up
- Someone who practices and improves
- Someone steady when it is hard
- Someone who bounces back
- Someone others can count on
- Someone more present with people
- Someone who lives what matters
- Something else

Hidden meaning: identity target for Arc naming and narrative.

## Question 6: Resistance

### Candidate

`Where does this usually get hard?`

Options:

- Starting
- Remembering
- Finding time or energy
- Distraction
- Discouragement
- Comparing myself
- Not knowing the next step
- Something else

### Pressure Test

This question is useful, but it is not necessary for first activation. Most inputs have a plausible answer, but asking it before the first payoff can make FTUX feel like diagnosis instead of momentum.

### Recommendation

Defer from FTUX. Ask when the user plans the first Activity, misses a day, or asks for help.

Preferred later wording:

`What usually gets in the way?`

Ideal options:

- Getting started
- Remembering
- Finding time or energy
- Distractions
- Feeling discouraged
- Comparing myself
- Not knowing the next step
- Something else

## Question 7: Support Style

### Candidate

`What kind of support would help most?`

Options:

- Simple checklist
- Reminders
- Put it on my calendar
- Encouragement
- Help choosing the next step
- Focus protection
- Something else

### Pressure Test

This is valuable later, but weak as a pre-activation question because many users do not yet know what support they want from Kwilt. It is more natural after Kwilt has shown the first Goal, Arc, and next step.

### Recommendation

Defer from FTUX unless generation quality depends on it. Ask contextually on the Arc or Goal detail surface.

Preferred later wording:

`What would help you keep going?`

Ideal options:

- A simple checklist
- Reminders
- Time on my calendar
- Encouragement
- Help choosing the next step
- Focus protection
- Something else

## Recommended FTUX Question Set

Activation-first FTUX should use five short steps:

1. `What kind of thing is it?`
   - A skill or hobby
   - A project or creative thing
   - Health or energy
   - School or work
   - Money or home
   - Relationships
   - Faith or values
   - A habit I want to change
   - Something else

2. `Name it in a few words.`
   - short text input with category-aware placeholder examples

3. `What do you want to do with it?`
   - Get better at it
   - Do it more often
   - Get ready for something
   - Feel more confident
   - Make more time for it
   - Get organized
   - Work through something hard
   - Finish something
   - Something else

4. `What matters most about it?`
   - I enjoy it
   - I want to get better
   - It gives me energy
   - It would make life better
   - It helps me care for or serve others
   - It connects to who I am
   - I do not want to lose it
   - Something else

5. `Who is this helping you become?`
   - Someone who keeps showing up
   - Someone who practices and improves
   - Someone steady when it is hard
   - Someone who bounces back
   - Someone others can count on
   - Someone more present with people
   - Someone who lives what matters
   - Something else

Then generate:

- first Goal,
- identity Arc,
- first next step.

Land on Arc detail with the Goal visible.

## Deferred Questions

Ask these after activation, not before it:

- `What usually gets in the way?`
- `What would help you keep going?`

These questions are still part of the creation grammar, but they should attach to planning, support, and re-entry moments rather than delaying first value.

## Charlie Walkthrough

1. `What kind of thing is it?` -> `A skill or hobby`
2. `Name it in a few words.` -> `Tennis`
3. `What do you want to do with it?` -> `Get better at it`
4. `What matters most about it?` -> `I enjoy it`
5. `Who is this helping you become?` -> `Someone who practices and improves`

Generated result:

- Goal: `Get better at tennis`
- Arc: `Becoming someone who grows through practice`
- Next step: `Pick one part of your game to practice for 10 minutes.`

This preserves Charlie's simple input while letting Kwilt add structure.
