# Kwilt: a $2,000 outside-user acquisition experiment

Research date: September 14, 2026

Decision: how to attract people outside Andrew's existing circle who actually use Kwilt, return, and eventually bring other people with them.

Status: recommendation only. No campaigns, purchases, outreach, or deployments authorized or executed.

## Executive recommendation

**Put most of the budget into a small creator-led acquisition experiment, with paid amplification of the strongest demonstration—not a broad influencer campaign and not five small advertising campaigns.**

My first audience would be U.S. iPhone users responsible for everyday household budgeting. The first promise is narrow: **check your household budget before making a spending decision.** Creators should show their actual experience accomplishing that job. Kwilt's broader capabilities and Pro Perpetual are supporting reasons to choose it, not the opening feature list.

This is a provisional product-and-channel judgment, not a finding that budgeting already has superior retention. First qualify the current App Store experience with six outsiders. If people cannot reach a trustworthy budgeting decision without substantial rescue, hold the acquisition money. Personal Screen Time—completing a chosen step before opening a distracting app—is the strongest alternative demonstration to qualify next. Do not advertise an unproven Money-to-Screen-Time combination.

Allocate up to $300 to independent user sessions, $900 to creator work, $400 to paid amplification, $200 to one conditional challenger, and $200 to fees/rights/contingency. Start with only the user sessions and one creator. Release the rest when actual behavior supports it.

**What this can reasonably buy:** an initial external cohort, reusable demonstrations, a clearer audience/promise, and evidence about repeat use. It cannot guarantee a self-sustaining growth loop or profitable acquisition. At the proposed $19.99 Perpetual price, immediate advertising payback is a demanding bar.

## 1. What the evidence does—and does not—establish

### Current public evidence

The live pricing page retrieved for this research still presents Free and subscription Pro; it does not display Perpetual. The public U.S. App Store listing shows version 2.0.0 dated September 4, describes Money and household capabilities, and lists monthly/annual subscription purchases. Perpetual was not shown among the visible purchases. These observations establish a public messaging mismatch, **not definitive proof of what every customer can buy inside the app**. [Live pricing](https://www.kwilt.app/pricing), [U.S. App Store listing](https://apps.apple.com/us/app/kwilt/id6755990439).

The launch cannot rely on the local pricing preview. Before spending, verify the live ad destination, App Store download, first use, actual Apple purchase sheet, entitlement, and restore on the customer-facing release.

### Local evidence

The existing [creator pilot brief](../feature-briefs/creator-acquisition-pilot.md) already proposes a concrete personal Screen Time demonstration, creator attribution, and retained paid outcomes. Its [evaluation document](../design-explorations/creator-acquisition-pilot/05-evaluate-learning.md) has no recorded experiment results. That is a useful predecessor, not evidence that this channel works for Kwilt.

Creator campaign resolve/claim and subscription-event code exists in `supabase/functions/_shared/creatorAcquisition.ts`, behind a pilot flag. This review did not establish a working production install-to-claim path or live payout ledger. A targeted native-source search did not locate a caller for the creator resolve/claim routes. Do not promise payout-grade attribution on this basis.

The [Perpetual runbook](../operations/kwilt-founding-lifetime-runbook.md) records a $19.99 initial price, the same Pro entitlement, and price reviews around every 50 valid purchases. Its September 10 launch checklist still lists outstanding purchase/release proof. That dated status may have changed; it is not a live console audit.

The [Money job flow](../job-flows/maya-review-budget-reality-before-spending.md), last updated July 31, distinguishes category/budget functionality from acquisition continuity, signed-device provider proof, and repeated trusted decisions. Its older gaps must be rechecked, not assumed to remain broken. The public September release is newer than this document.

### Important unknowns

- Prior Apple Ads spend, placements, keywords, country mix, first-time downloads, usage, and purchases.
- Current non-test activation, week-two retention, paid conversion, refund rate, and actual service cost per cohort.
- Live Perpetual availability and exact purchase terms.
- Advertising-account eligibility, estimated auction costs, creator quotes, and usage rights.

Channel mechanics below come primarily from official platform documentation. The budget, audience ranking, thresholds, and forecast scenarios are my recommendations. Marketplace averages are contextual, not a prediction of Kwilt's results.

## 2. Choose a job before choosing a platform

Kwilt's breadth is valuable after someone understands one reason to use it. It makes a cold advertisement harder to understand if every capability appears at once.

The project persona **Maya**, an aspirational family organizer, wants ordinary family decisions to become easier without becoming a productivity or finance administrator. Her umbrella job is moving the few things that matter; the specific entry here is reviewing budget reality before spending. That is a more actionable acquisition promise than introducing Arcs, Goals, AI, Money, meals, and household tools together.

| Entry promise | Why it could work | Main friction | Recommendation |
| --- | --- | --- | --- |
| Review the household budget before spending | Recurring real-world decision; an understandable reason to pay for connected money | Financial trust, setup, data freshness, possible purchase before first value | First qualification candidate; fund distribution only after customer-release proof |
| Complete a chosen step before scrolling | Visually demonstrable; clear connection between intention and action | iOS permissions and reliable enforcement; correct Free/Pro boundary | Strong fallback; existing creator plan supplies a starting point |
| Plan meals and build the grocery list | Frequent practical job; easy to explain without a finance claim | Crowded category; free value may not lead to Pro purchases | Good longer-term usage/sharing route, not another simultaneous paid campaign |
| One app for life / general AI productivity | Communicates the long-term product vision | Many promises, unfamiliar vocabulary, unclear first action | Brand umbrella, not the first paid hook |

This prioritizes a **specific moment**, not a demographic stereotype. Recruit anyone who owns the household budgeting job, not only mothers. Start with people dissatisfied with their present routine, not people who are already deeply committed to a specialist and require full migration parity.

Budgeting is not uncontested. Copilot Money currently advertises $95/year and $13/month. YNAB pairs budgeting with an established method, education, and a trial. These are evidence of alternatives and purchase models—not evidence of their acquisition costs or Kwilt's feature parity. A lower one-time price is interesting, but cannot substitute for trust and product fit. [Copilot Money](https://www.copilot.money/), [YNAB](https://www.ynab.com/pricing).

## 3. Channel comparison

Ratings are qualitative judgments for Kwilt's present $2,000 experiment, not measured channel rankings.

| Route | Best use | Principal risk at this budget | Decision |
| --- | --- | --- | --- |
| Small relevant creators who use and demonstrate Kwilt | Explanation, credible lived experience, audience access, reusable content | Paying for followers or generic videos that produce no qualified users | Primary bet, in stages |
| Meta/Instagram amplification of creator content | Give a useful demonstration additional distribution | Cheap views/clicks can disguise weak activation; attribution limitations | $400 ceiling after qualification |
| Apple Ads search results | Reach iPhone users already looking for a specific app category | Repeating the previous test without changing intent, listing, or activation | Conditional $200 challenger |
| Google keyword Search | Capture a narrow explicit need | Auction cost, web-to-store friction, low niche volume | Hold; test later if intent and quoted economics justify it |
| Google automated App campaigns | Acquire volume once a meaningful conversion signal exists | Small budget and sparse useful events constrain learning | Not the first experiment |
| ChatGPT/OpenAI ads | Reach people actively discussing a relevant problem | New-to-Kwilt channel; context matching and click-to-app-use are unproven | Optional challenger replacing, not adding to, Apple test |
| Founder-led communities and demonstrations | Recruit initial users, learn language, build earned trust | Time cost; promotional posts can damage community trust | Run alongside with permission; $0 media allocation |
| Relevant newsletter or community sponsorship | Concentrated trusted audience | Distribution quality and click promises need verification | Possible substitute for one creator, not an added channel |
| SEO, App Store optimization, useful evergreen content | Longer-term discovery and conversion | Slow feedback; content volume is not demand | Maintain basics; no outsourced SEO retainer in this budget |
| Launch directories, deal sites, broad giveaways | Short-lived attention | Deal collectors/install spikes may not become repeat users | Do not make these the core experiment |

### Creators: buy the right thing

Three distinct products are often mixed together:

1. **Content production:** a creator makes a video; distribution is not included.
2. **Audience distribution:** a creator posts to their own audience.
3. **Paid amplification rights:** permission to advertise the content, sometimes using the creator's identity.

For this pilot, prefer a package combining actual product use, one relevant post, and narrowly specified reuse rights. Paying a creator makes it sponsored acquisition even if the post's distribution is organic. It is not an unpaid endorsement.

Collabstr's 2026 marketplace report analyzed more than 21,000 collaborations and reports average actual costs of $193 for Instagram, $186 for TikTok, and $154 for UGC. This supports seeking modest individual packages. It does **not** establish that a proven creator, posting, revisions, paid usage rights, and platform fees will all fit in $300. Obtain itemized quotes; buy two stronger packages within $900 if three appropriate packages do not fit. [Collabstr report](https://collabstr.com/2026-influencer-marketing-report).

My default distribution surface would be Instagram Reels for the household-routine concept, subject to finding creators with a genuinely relevant audience. This is a test hypothesis, not a claim that Instagram always beats TikTok. If the best-qualified creator is elsewhere, follow the evidence and concentrate there. Meta supports amplifying eligible creator content through partnership ads; permission and eligibility must be established separately from the production contract. [Meta creator partnerships](https://about.fb.com/news/2024/02/creator-marketplace-for-brands-and-creators-to-collaborate-on-instagram/).

### Apple Ads deserves a changed test, not automatic rejection

First distinguish what disappointed Andrew:

- Few impressions: examine relevance, bids, targeting, and search volume.
- Taps but few downloads: examine listing/message fit and credibility.
- Downloads but no useful action: examine first-use delivery before buying more traffic.
- Useful repeat users but few purchases: examine paid boundary and offer.
- Cheap downloads in unsuitable markets: correct geography and audience assumptions.

The proposed retry is U.S. search results only, a handful of relevant exact-match terms, and a Money-specific custom product page. Apple supports custom-page ad variations and closer matching with exact keywords, although exact match still includes variants. This is materially different from broad discovery or sending everyone to a general-purpose listing. [Search results](https://ads.apple.com/app-store/help/ad-placements/0082-search-results), [match types](https://ads.apple.com/app-store/help/keywords/0059-understand-keyword-match-types).

Candidate themes to inspect—not verified-volume keywords—include “household budget,” “family budget planner,” and “budget tracker.” Keep competitor and brand terms separate so preexisting demand does not masquerade as new audience discovery. Use manual bid control, inspect actual search terms, and exclude irrelevant terms. Set an end date and spending controls before launch. Do not force delivery by widening targeting when the hypothesis has insufficient volume.

At $200, this is a diagnostic challenger, not a statistically powered verdict on Apple Ads. Do not run it if the prior failure was retention and retention remains poor.

### Google Search and Google App campaigns are different decisions

Keyword Search can be narrowly scoped. Google recommends using Keyword Planner to estimate clicks and CPCs; actual account estimates are still missing here. Even exact matching is intent-based rather than necessarily literal. Inspect queries instead of assuming a bracketed keyword prevents irrelevant traffic. [Budget planning](https://support.google.com/google-ads/answer/2375454?hl=en), [matching](https://support.google.com/google-ads/answer/7478529?hl=en).

Before a later Search pilot, verify relevant search demand, restrict to supported locations/devices, and land on the demonstrated use case. Exclude obvious mismatches such as spreadsheet/template seekers if the ad offers an app. Do not pay broadly for “AI,” “productivity,” or an ambiguous “budget” query without evidence of fit. A mobile web click still has to become an App Store download and a useful session.

For automated App campaigns, Google's own install-volume guidance recommends a daily budget at least 50 times target CPI and allowing 7–14 days for learning. Its $2 target-CPI example therefore implies $100/day. Those are recommendations, not a platform minimum, and they do not apply to ordinary keyword Search. They explain why I would not make automated App campaigns the first use of this particular budget. [Google App campaign guidance](https://support.google.com/google-ads/answer/6167156?hl=en).

### OpenAI advertising is accessible enough to consider—but not my lead bet

Current official documentation describes self-service ChatGPT advertising, including CPC buying. Its campaign guide lists a $25 USD minimum daily budget. Account verification, billing, ad review, and available targeting still need checking for Kwilt. This recommendation does not rely on early large-advertiser beta minimums. [Self-service announcement](https://openai.com/index/new-ways-to-buy-chatgpt-ads/), [campaign setup](https://help.openai.com/en/articles/20001210-create-campaigns-for-chatgpt-ads).

There is a plausible fit: someone discussing household budgeting could encounter a concrete next step in Kwilt. However, context hints are not exact-match keywords or guaranteed conversation placements. OpenAI's current suggested starting **maximum bid** is $3–$5/click; that is not an observed average CPC or a quote for Kwilt. The documentation also excludes Plus, Pro, and Business users from ad delivery, so this is not access to every ChatGPT user. [Ads basics](https://help.openai.com/en/articles/20001207).

I would allocate **$0 initially**. If Andrew wants an emerging-channel test, replace the $200 Apple challenger with a capped ChatGPT CPC experiment after the same landing/purchase/activation checks. Verify supported mobile/platform targeting. Measure useful users, not just web conversions. Do not assume a web pixel follows somebody through an iOS installation.

Daily budgets are averages: OpenAI documents up to twice the selected budget on an individual day and a seven-day limit based on the daily budget. Use a verified campaign-total cap if supported for the chosen setup; otherwise configure the displayed limits/end date conservatively and leave fee/tax headroom. “$25/day” is not a hard $25 daily spending ceiling. [Daily budgets](https://help.openai.com/en/articles/20001413-daily-budgets).

### Other routes worth preserving

Founder-led participation in relevant communities can recruit people with an immediate need. Ask moderators before recruitment or promotional posts; disclose the founder relationship. An opt-in live demonstration or useful answer can teach more than a generic launch announcement. Do not use fabricated customers, covert endorsements, or repetitive promotional posting.

Reddit paid ads permit community/interest targeting, but that capability does not establish demand for Kwilt. I would first learn from genuine conversations and permission-based recruitment, rather than fund another parallel advertising test. [Reddit targeting](https://www.business.reddit.com/advertise/targeting/community-and-interest).

A small newsletter or community organizer could substitute for a creator if they have a closer-fit audience. Request recent comparable sponsorship clicks, audience geography, actual placement, and a fixed quote. Opens/followers alone are not adequate. Keep SEO and App Store listing improvements founder-led in this experiment; their cash cost should not consume the learning budget.

## 4. Exact budget and release conditions

All figures are spending ceilings, not purchase commitments. The $2,000 includes marketplace fees, rights, and applicable taxes; unused money stays unspent. Andrew's time is not included in the cash budget.

| Allocation | Maximum | Release condition |
| --- | ---: | --- |
| Six independent user sessions, up to $50 each | $300 | Recruit qualified outsiders; compensate time and honest feedback, not purchases, retention, or reviews |
| Creator demonstrations and posting/rights | $900 | First package up to $300 after release-path qualification; remaining $600 after first pilot evidence |
| Paid amplification on one platform | $400 | Begin with up to $100; release the balance only after qualified traffic/activation evidence and matured early cohort review |
| One challenger: Apple search by default | $200 | Prior-campaign diagnosis, message-matched listing, and measurable useful usage; OpenAI may replace this allocation |
| Fees, rights adjustments, taxes, or follow-up contingency | $200 | Only a documented need; do not treat it as compulsory ad spend |
| **Total ceiling** | **$2,000** | **No automatic refill** |

The default is one creator-led channel and one optional search challenger. Production, audience posting, and amplification are distinct costs within the same strategy, not reasons to open additional platforms.

If good creator quotes exceed $300, reduce the number of creators instead of underfunding rights or lowering audience quality. If meaningful instrumentation or release repair needs an outside contractor, pause and re-budget with Andrew; that expense is not silently assumed to fit here.

## 5. Creator selection and brief

Shortlist roughly 12–15 prospects and request a few relevant quotes before choosing the first. No individual creator has been vetted or contacted in this research.

Prefer creators who already demonstrate weekly budgeting, household decisions, or practical organization. Review the median reach of their last ten relevant posts, not their best viral post. Ask for audience geography and evidence of audience interest in the demonstrated job. Phone/platform fit matters; do not assume an audience is primarily iPhone-based.

Look for specific comments and questions from viewers, credible demonstrations, clear speech, and a willingness to explain limitations. Avoid generic app-listicle accounts, suspicious engagement, guaranteed-install packages, or creators who will endorse a product without using it.

Request an itemized package:

- Actual hands-on use before deciding whether a public recommendation is appropriate.
- One short vertical demonstration of one real decision or completed task.
- One audience post with a clear route to the matching destination.
- Defined revision allowance, caption, and clean licensed audio.
- Explicit duration/platform/scope of paid reuse rights; no assumed perpetual ownership.
- Aggregate performance report after posting, including link activity where available.

At this budget, extras such as multiple hooks, raw footage, permanent rights, or account-level ad access may need separate quotes. Never ask for login credentials; use the platform's scoped permissions.

Pay for the agreed work, not a predetermined positive opinion. Sponsorship needs clear disclosure, and claims must reflect real experience. The FTC's guidance expressly emphasizes honest endorsements and disclosure of material connections. [FTC endorsement guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking).

### Illustrative demonstration direction—not a script for invented experience

For Money: show a real question, open the relevant budget/category, check the evidence, and explain what decision the creator made. Suggested opening: **“Before I make this purchase, I check it against our household budget.”** Only use personal-experience language if it is true for that creator.

For the Screen Time fallback: show the selected app waiting, the actual Kwilt condition being satisfied, and the app becoming available. Describe precisely which condition and Pro feature were used. Avoid guarantees about blocking or a universal phone-addiction cure.

Do not claim that a budget number guarantees cash safety, that Kwilt saves a particular amount of money, or that Money automatically optimizes grocery shopping. Demonstrate the supported behavior rather than extrapolating from the feature list.

## 6. Landing experience and Perpetual messaging

Send each demonstration to a matching landing page or custom App Store page—not directly to a generic pricing comparison without context.

The first screen should repeat the creator's concrete promise, show the relevant product, identify iPhone availability, and offer one next step. Then explain the paid boundary and the choices. Do not suggest connected budgeting is included in Free if it requires Pro.

The pricing section can make Pro Perpetual the preferred purchase while stating that subscription Pro and Perpetual unlock the same Pro capabilities. The distinction is how access is purchased, not a different feature bundle.

Proposed offer disclosure, subject to the actual terms and live availability:

> Limited-time offer. Price and availability may change at any time. The current price is shown before purchase.

If displaying $19.99, keep the ad, website, and actual U.S. purchase sheet synchronized. Use the creator's durable demonstration without a hardcoded price where practical; keep current pricing in editable copy or the destination. Updating a caption may not update an already-running ad, so include ad review in the price-change checklist.

The internal 50-customer price-step strategy should drive an operational review of valid paid transactions, not an unsupported public countdown. Do not say “only five left” without accurate inventory enforcement. Offer changes must clearly refer to new purchases, not imply that an existing perpetual entitlement can be withdrawn arbitrarily.

Do not lead with “cheap forever.” First establish the recurring job and trust; then present the one-time offer. Do not invent unlimited AI, guaranteed future services, or household/Apple Family Sharing rights beyond verified terms. Subscription cancellation interaction also needs clarity for existing subscribers.

## 7. Measurement: users, not just installs

### Define success before paying for distribution

Primary metric: **new external users who complete the advertised job and return to do it again in days 8–14 after first use.** A return app-open alone does not count.

For budgeting, activation means the person establishes usable budget context, understands the relevant spending evidence, and makes a real decision. A connected bank account alone is not activation. Record whether help was needed; do not infer a trusted decision solely from a screen view.

For Screen Time, activation means the intended rule actually governs the selected app on the customer's device and the person successfully follows the intended flow. Opening settings is not activation.

Separate these cohorts:

- Paid research participants and creators.
- Founder-assisted external acquisitions.
- Unassisted external acquisitions from creator posts or ads.
- Existing users, friends/family, internal accounts, Sandbox, and test devices.

Report week-two performance only for people whose full observation window has elapsed. Track week-four repeat use as a later confirmation. Research participants are useful for learning but must not be presented as evidence of organic retention or willingness to pay.

### Minimal reporting table

For each source, record spend, landing/store traffic where available, first-time downloads, first opens, activated users, week-two repeat users, paid purchasers by product, refunds, invitations, and invited users who activate. Include an “unknown source” bucket rather than invent attribution.

Keep both **all-in acquisition cost** (creator fees plus media/allocated campaign costs) and **marginal media cost**. A cheap media result that excludes the creator invoice is not the experiment's blended result. Also record founder support hours.

Apple's generated campaign links can attribute downloads and aggregate usage/sales to campaign tokens. They have privacy thresholds and attribution rules; small cells may not appear. Apple documents a 24-hour first-download window and minimum reporting thresholds of five. They are useful here, but do not supply a perfect user-level cross-platform identity. [Apple campaign links](https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links).

Use generated campaign links plus a small first-party cohort/event view. Where necessary, add optional source self-report during follow-up, clearly labeled as self-reported. Existing creator claim code should only be used after an end-to-end test; do not turn a $2,000 pilot into a full affiliate-platform project. Fixed-fee creator contracts avoid premature commission-attribution promises.

Never send balances, transaction descriptions, bank identifiers, child information, or other sensitive financial/household content into advertising events. Use coarse milestone events and appropriate consent. This report does not authorize installing tracking or uploading audiences.

## 8. Stop/go criteria and a 45-day sequence

These are proposed operational guardrails, not industry benchmarks or statistically significant conclusions.

### Days 1–7: qualify the experience; at most $300

Verify the current store release and offer. Recruit six relevant outsiders with the immediate budgeting need. Observe install, setup, the first useful decision, and comprehension of Free versus Pro. Compensate time regardless of opinion or continued use. Let participants control their own financial information; do not require them to disclose balances or credentials.

**Release gate:** at least five of six can reach the intended decision with no major founder rescue after the standard introduction, and no unresolved critical purchase, trust, privacy, or data-correctness issue appears. This is a usability gate, not proof of market demand. Record the failures and resolve them before traffic. If Money fails, qualify the Screen Time alternative; do not buy more traffic to conceal the problem.

### Days 8–14: one creator and a small distribution probe

Book the first qualified creator, allow genuine use, and prepare one matching destination. Verify attribution with controlled tests, excluding those tests from results. Post only after claims match actual experience.

Allow up to $100 of amplification to learn whether the demonstration reaches relevant people; strong viewer metrics alone do not unlock the full budget. Reach can be noisy for a small creator, so lack of immediate downloads is a finding about this execution, not a verdict on the entire channel.

### Days 15–30: observe early users and release selectively

For the first 20 unassisted, non-incentivized new users with a completed observation window, use these directional gates:

- At least eight reach the defined useful action (40% of first-use users).
- At least four repeat that job in days 8–14 (20% of first-use users).
- No unresolved serious trust issue; observe support burden and reasons for abandonment.

If the sample is smaller, label it inconclusive; do not manufacture certainty. Hold major additional spend while waiting for maturation. Fix observed friction and rerun a bounded probe where justified. A strong assisted cohort and weak unassisted cohort means the self-serve path needs work.

If evidence supports continuation, release the remaining creator budget and amplification in small tranches. Reuse the successful promise with another relevant creator before declaring the first creator's audience generalizable. The optional challenger comes after this, and only if it answers a specific question.

### Days 31–45: decide whether a repeatable pattern exists

Review matured cohorts, actual purchases/refunds, voluntary referrals, support time, and ongoing service costs. Some late cohorts will need follow-up beyond day 45; report them as pending.

A useful pilot outcome would be **20–40 non-incentivized week-two repeat users**, a few consented accounts of concrete value, reusable content, and a clear next experiment. This is a target, not a forecast or guaranteed delivery. At full spend it implies $50–$100 blended cost per repeat user—valuable only if the learning and subsequent economics justify it.

Expand only if a second cohort reproduces the useful behavior and there is a credible path to sustainable costs. Otherwise keep the best evidence, repair the specific problem, and preserve unspent cash. “We spent all $2,000” is not an outcome worth optimizing.

## 9. Economics: separate learning value from profitable acquisition

At $19.99, a 15% store commission leaves approximately **$16.99** before taxes/adjustments, refunds, creator commissions, and service/support costs. Apple's Small Business Program offers a 15% commission to qualifying enrolled developers; this research did not verify Andrew's current enrollment. [Apple Small Business Program](https://developer.apple.com/app-store/small-business-program/).

Under that simplifying fee assumption, recovering $2,000 would require approximately **118 purchases**, even before servicing those customers. A hypothetical 30% fee case would require approximately 143. The initial 50 purchases generate $999.50 gross, or about $849.58 after a 15% fee, before other costs.

Price increases after successive groups may improve future economics, but cannot be credited as revenue before they happen. Keep cohorts separated by purchase price and product. Do not project subscription lifetime value onto a Perpetual purchaser.

The allowable acquisition cost is not the full purchase price. For Perpetual it must leave room for uncertain long-term AI, connectivity, support, refunds, and other service costs. Any later commission should be bounded by contribution after those costs, not a permanent share of imagined recurring revenue.

Illustrative funnel math—not platform benchmarks:

| Hypothetical paid-click funnel | Outcome |
| --- | --- |
| $1/click; 25% click-to-first-use; 40% activation; 50% activated-to-week-two-repeat | $20 media cost per week-two repeat user |
| Same funnel at $3/click | $60 media cost per week-two repeat user |
| $4 per first-use user; 10% purchase conversion | $40 media cost per purchaser, already above approximately $17 fee-net proceeds at $19.99 |

Creator fees and research costs are additional to these media-only examples. The point is sensitivity: both acquisition friction and actual value delivery matter enormously. Buying cheap clicks cannot repair a broken downstream experience.

Andrew's stated goal is outside usage, so a deliberately loss-making learning cohort can be rational. But do not label it a profitable acquisition engine. If the requirement becomes immediate cash payback, none of these channels is yet justified by the evidence available.

## 10. What would actually create a flywheel?

The useful loop is:

**Credible demonstration → first useful decision → repeated use → voluntary recommendation or household invitation → another activated user → more credible proof.**

Each arrow needs evidence. More features, purchases, or views do not automatically create the next arrow.

For the first cohort, offer opt-in help and a practical reason to return to the same job. Ask returning users what changed and whether someone else participates in that decision. Invite sharing only when it helps their real household workflow and the current sharing/entitlement experience is verified. Do not require referrals or reward positive App Store reviews.

With permission, reuse specific experiences as future demonstrations. Obtain consent before publishing any financial story or screenshot; use clearly labeled sample information where appropriate. Do not manufacture savings testimonials.

Count invited people who actually activate—not invitations sent. A small number of genuine second-generation users is evidence of a possible loop. It is not yet proof that referrals can replace paid acquisition. For one-off creator posts, durable content rights and independently returning users are the assets that remain when paid distribution stops.

## 11. What would change this recommendation?

| New evidence | Change in strategy |
| --- | --- |
| Prior Apple Ads already produced cheap repeat users | Put more of the later budget into the proven keyword/listing cohort; use creators mainly for better demonstrations |
| Outsiders understand Money but will not connect accounts or buy before value | Address trust/evaluation friction; do not substitute another ad network |
| Screen Time is substantially easier to demonstrate and repeat | Move the same staged creator budget to that specific job |
| A tightly relevant community sponsor offers verified distribution at a better quote | Substitute for one creator package, preserving measurement and total budget |
| OpenAI account estimates and an early bounded test show better activated-user economics | Let it compete for future budget on the same downstream metric |
| Free meal planning produces strong repeated household use and genuine invitations | Consider a usage-first acquisition route; measure paid conversion separately rather than forcing Pro into the story |
| No cohort repeats without founder prompting | Pause acquisition expansion and improve product delivery |

## 12. Bottom line

**Creators first, narrowly targeted and genuinely hands-on; paid amplification second; one controlled search challenger third.** Budgeting is worth the first qualification round because it gives Kwilt a concrete recurring job and a relevant Pro offer. Perpetual can make that offer compelling, but the job must work and the public purchase path must agree with the promise.

The first commitment should be a maximum $300 qualification round—not an agency retainer, a five-platform launch, or $2,000 prepaid to influencers. The decision after that round is which promise deserves the next $300, supported by observed behavior.

## Source register and proof boundaries

All external sources below were consulted on September 14, 2026. Platform policies, budgets, prices, and account eligibility can change; verify them again at campaign setup. Linked vendor performance claims were not adopted as Kwilt forecasts.

1. [Kwilt public pricing](https://www.kwilt.app/pricing) — currently visible public plan messaging.
2. [Kwilt U.S. App Store listing](https://apps.apple.com/us/app/kwilt/id6755990439) — visible release description and purchases; not an in-app transaction test.
3. [Collabstr 2026 report](https://collabstr.com/2026-influencer-marketing-report) — marketplace-specific paid collaboration costs, not negotiated Kwilt quotes.
4. [Meta creator partnerships](https://about.fb.com/news/2024/02/creator-marketplace-for-brands-and-creators-to-collaborate-on-instagram/) — creator discovery and partnership-ad mechanics.
5. [FTC endorsement guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) — truthful endorsements and sponsorship disclosure.
6. [Apple search results ads](https://ads.apple.com/app-store/help/ad-placements/0082-search-results) — placements and custom product pages.
7. [Apple keyword matching](https://ads.apple.com/app-store/help/keywords/0059-understand-keyword-match-types) — exact/broad and negative keyword behavior.
8. [Apple campaign links](https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links) — attribution and privacy thresholds.
9. [Apple Small Business Program](https://developer.apple.com/app-store/small-business-program/) — conditional 15% fee scenario.
10. [Google bid and budget planning](https://support.google.com/google-ads/answer/2375454?hl=en) — Keyword Planner estimates and budget concepts.
11. [Google keyword matching](https://support.google.com/google-ads/answer/7478529?hl=en) — matching semantics.
12. [Google App campaign guidance](https://support.google.com/google-ads/answer/6167156?hl=en) — learning/budget recommendations, distinct from keyword Search.
13. [OpenAI self-service announcement](https://openai.com/index/new-ways-to-buy-chatgpt-ads/) — self-service availability context.
14. [ChatGPT campaign setup](https://help.openai.com/en/articles/20001210-create-campaigns-for-chatgpt-ads) — campaign options and currency minimums.
15. [ChatGPT ads basics](https://help.openai.com/en/articles/20001207) — matching, CPC bid guidance, audiences, reporting.
16. [ChatGPT daily budgets](https://help.openai.com/en/articles/20001413-daily-budgets) — average budgets and spending limits.
17. [Reddit community and interest targeting](https://www.business.reddit.com/advertise/targeting/community-and-interest) — targeting capability, not proof of performance.
18. [Copilot Money](https://www.copilot.money/) and [YNAB](https://www.ynab.com/pricing) — competitive offer context only.

Internal sources: [Maya persona](../personas/aspirational-family-organizers.md), [Marcus persona](../personas/burned-out-productivity-power-users.md), [Money job flow](../job-flows/maya-review-budget-reality-before-spending.md), [creator pilot](../feature-briefs/creator-acquisition-pilot.md), [creator evaluation](../design-explorations/creator-acquisition-pilot/05-evaluate-learning.md), [Free/Pro message matrix](kwilt-free-pro-message-matrix.md), [monetization measurement](../analytics/monetization-funnel.md), and [Perpetual runbook](../operations/kwilt-founding-lifetime-runbook.md). Historical readiness gaps are prompts for verification, not assertions of present failure.

Source checkout inspected: `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `915bd3b5`; unrelated untracked Home follow-through documents were preserved. No live ad-account performance, App Store Connect settings, production telemetry, customer bank connection, or purchase/restore flow was inspected in this research. No implementation or deployment was performed.
