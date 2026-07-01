# Deterministic Question Pressure Test

## Purpose

Pressure test whether the proposed activity-to-identity deterministic questions can handle a wide variety of concrete first answers without relying on AI-generated survey options.

The target is not perfect wording for every case. The target is high coverage: most users should find a usable deterministic answer, and `Something else` should be an escape hatch rather than a common path.

## Current Proposed Questions

1. `What do you want to focus on first?`
2. `What would progress look like in the next few weeks?`
3. `What matters most about this?`
4. `What part of you is this helping grow?`
5. `Where does this usually get hard?`
6. `What kind of support would help most?`
7. `Want to add anything personal?`

## Test Cases

| Persona | First answer | Progress | Draw | Growth | Hard | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Charlie, 14 | Tennis | Get better at one part of it | I enjoy this | Getting better through practice | Feeling discouraged | Strong |
| Lena, 16 | School assignments | Finish or complete something | It would make life work better | Showing up consistently | Starting | Strong |
| Marcus, 37 | Launch my side project | Prepare for something coming up | It feels connected to who I am | Taking responsibility | Not knowing the next step | Strong |
| Sarah, 34 | Prayer | Show up more consistently | I do not want to lose it | Living what I value | Sticking with it | Strong |
| Maya, 41 | Family dinners | Make more time for it | It helps me serve or care for others | Being more present with people | Being tired or overloaded | Strong |
| Elena, 29 | Running again | Show up more consistently | It gives me energy | Recovering after setbacks | Feeling discouraged | Strong |
| David, 45 | Repair friendship with Sam | Change a pattern | It helps me serve or care for others | Being more present with people | Starting | Medium-strong |
| Nina, 31 | Organize finances | Make it easier to start | It would make life work better | Taking responsibility | Not knowing the next step | Strong |
| Theo, 22 | Stop scrolling at night | Change a pattern | It would make life work better | Staying steady when it is hard | Sticking with it | Strong |
| Priya, 39 | Painting | Make more time for it | I enjoy this | Getting better through practice | Comparing myself | Strong |

## Findings

The original deterministic set handled positive activities well, but it was weaker for negative-pattern answers such as "stop scrolling," relational repair such as "repair friendship," and practical life-admin answers such as "organize finances."

Two additions materially improve coverage:

- Progress option: `Change a pattern`
- Meaning option: `It would make life work better`

These preserve deterministic breadth without becoming domain-specific.

## Recommended V1 Option Sets

### What would progress look like in the next few weeks?

- `Show up more consistently`
- `Get better at one part of it`
- `Prepare for something coming up`
- `Make more time for it`
- `Finish or complete something`
- `Make it easier to start`
- `Feel more confident doing it`
- `Change a pattern`
- `Something else`

### What matters most about this?

- `I enjoy this`
- `I want to get better`
- `It gives me energy`
- `It would make life work better`
- `It helps me serve or care for others`
- `It feels connected to who I am`
- `I do not want to lose it`
- `Something else`

### What part of you is this helping grow?

- `Showing up consistently`
- `Staying steady when it is hard`
- `Getting better through practice`
- `Recovering after setbacks`
- `Taking responsibility`
- `Being more present with people`
- `Living what I value`
- `Something else`

### Where does this usually get hard?

- `Starting`
- `Sticking with it`
- `Getting distracted`
- `Feeling discouraged`
- `Comparing myself`
- `Not knowing the next step`
- `Being tired or overloaded`
- `Something else`

## Coverage Judgment

This set is broad enough for V1. It covers:

- skill growth,
- relationships,
- faith/values,
- health and energy,
- work and school,
- creative work,
- practical life admin,
- negative pattern change,
- family/community responsibilities.

The highest-risk edge cases are grief, trauma, addiction, and clinical mental-health concerns. Those should not be solved by adding more deterministic survey options; they require safety-aware product boundaries and likely should be gently redirected into lower-risk language.
