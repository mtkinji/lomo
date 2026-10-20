# Simple dinner expansion

Requested: 2026-10-16. Target: 200 new dinners, DI331–DI530, bringing the
catalog to 800 recipes and 530 dinners. All 200 are now published in the hosted app catalog with dedicated reviewed images.

## Acceptance contract

- Everyday family meals, ordinary supermarket ingredients, mild defaults.
- At most 20 minutes hands-on; at least 160 dinners at most 40 minutes total;
  none over 60 minutes. Count all components, preheating, waits, and rests.
- Target at most 12 ingredients excluding water, oil, salt, and pepper, and
  at most two cooking vessels. Default yield: four servings.
- Protein allocation: 50 poultry, 25 beef, 20 pork, 25 seafood, 60 vegetarian,
  20 egg-based or mixed-protein meals. Vegetarian allocation excludes the
  separately counted egg-based dinners.
- Compare three credible sources per recipe, formulate original recipes,
  record evidence honestly, and review against the existing 600 for substantive
  duplication. No fabricated ratings, reviewer consensus, or kitchen tests.
- Review every ingredient, method, yield, timing, scaling rule, dietary facet,
  equipment requirement, provenance record, and finished image.
- Generate each image individually using the built-in image tool in this
  conversation. API image generation is prohibited for this expansion.
- Publish through the existing immutable hosted-catalog and media workflow;
  confirm authenticated readback before describing anything as live.

## Delivery stages

1. Roster and research, grouped into 20 batches of ten.
2. Original authoring and cooking-truth review.
3. Structured ingredients, scaling, equipment, and origin enrichment.
4. Dedicated image generation, inspection, and durable asset storage.
5. Focused tests and audits; scoped local and final integration gates.
6. Hosted publication, readback, and app acceptance checks.

Stages must be recorded separately. Draft text, a generated image, a local
test pass, and live publication are distinct evidence states. An unfinished
batch is not an approved recipe. All new recipes remain desk-reviewed until
actual cooking evidence exists.

## Baseline

Source checkout: `/Users/andrewwatanabe/Kwilt`.
Starting branch: `main`; starting commit: `8336ada62484618204115fe244e6645a553ea36b`.
Checkout was clean. Implementation branch: `codex/simple-dinner-expansion`.
No worktree was created. Root owns the Simulator runtime; Metro runs from this checkout on port 8081. The installed Simulator app reports version 1.0.127 (127); no new native binary was built.

Verified from compiled source: 600 recipes; dinner IDs DI001–DI330.
The existing image-admin function supports ingestion of images generated in
Codex, so its API image-generation action is not needed.

## Final content and review evidence

- 200 original dinners, four servings each; 161 at 40 minutes or less and all at 60 minutes or less. Hands-on estimates are at most 20 minutes. These are desk-reviewed, not kitchen-tested.
- 50 poultry, 25 beef, 20 pork, 25 seafood, 60 vegetarian, and 20 egg/mixed dinners.
- 2,211 ingredient lines reviewed; all 200 scaling records complete; zero blocking instruction findings. 194 heuristic warnings across 131 recipes retain explicit manual review rationale in the authoring receipts.
- 200 dedicated images generated with built-in image_gen; individual visual reviews, final recipe hashes, original image hashes, encoded image hashes, and publication evidence are in media-manifest.json and the source ledgers.
- Final WebP assets total 62,132,044 bytes. Original PNGs remain local and are ignored; WebP assets are the durable catalog artifacts.
- Recipe data is split into 40 five-recipe modules. Canonical content and ordering were verified unchanged by the split.
- The initial six-recipe draft and seafood image-input snapshot are historical generation inputs; the source modules and final manifest are authoritative.
- A related test exposed unmapped cuisine labels. Existing regional aliases were mapped, and nonfeatured Contemporary and East Asian families preserve broad labels without falsely assigning a national origin.

Hosted catalog publication and marketing-site publication are separate. The marketing-site static export/deployment has not been changed by this catalog task. Its publication section remains pending in enrichment records.

## Import incident and repair

Native acceptance exposed an empty ingredient list for DI331. Live inspection
found Edge version42 stripped `structuredIngredients`, although local code
already preserved it. The SQL importer treated missing JSON arrays as NULL and
silently inserted zero ingredients. The normal import operation also publishes
text immediately; it does not stage drafts. Earlier progress wording calling
these imported records drafts was incorrect.

All200 affected publications were withdrawn while repair ran. Edge version43
changes only its source normalizer to the existing local implementation. The
new database migration rejects absent/non-array inputs and requires the fresh
ingredient insertion count to match the source. A live negative test confirmed
missing structured ingredients are rejected before mutation.

Twenty bounded repair transactions created immutable version2 records, kept
version1 as evidence, and moved the still-unapproved image jobs/assets to the
new versions. Original credits, lineage, and equipment tables were checked and
contained zero rows, so no such evidence was dropped. Publications stayed
withdrawn during repair. Readback verifies all200 content hashes, ordered
ingredient hashes, ordered instruction hashes,2,211 ingredient rows, and verified
scaling states against canonical source. The final activation is recorded in
the publication receipt and readback files.

## Acceptance observed

Authenticated image-admin readback returned all200 published jobs. Public CDN
downloads matched all200 distinct reviewed WebP hashes and dimensions. The
final backend activation required verified scaling, ingredient and instruction
rows, equipment, and a matching published image for every version2 recipe.
Final SQL count:800 published recipes,530 dinners;449 equipment requirements
across the200 additions (448required,1preferred). Short-lived operation
tokens were revoked and the local secret file removed after use.

Signed-in iPhone17Pro Simulator, iOS26.5: searched and opened DI331; after repair
the dedicated hero image and ingredient list rendered. The scaling selector
showed4/8/12servings at1x/2x/3x; rice water visibly changed from2.5cups to5cups
to7.5cups. Restored1x afterward. This is Simulator/runtime proof, not a new
native build, physical-device test, or TestFlight release.

The full verification gate passed1,303 Jest suites /8,126 tests before the final
hosted-image references and database repair artifacts were attached. The final
candidate passed both verify:local and verify:changed; see verification-results.json
for the final receipt. The dinner filter showed 530 of 802 meals (800 catalog
recipes plus two private recipes), and DI530 rendered its dedicated artwork.
