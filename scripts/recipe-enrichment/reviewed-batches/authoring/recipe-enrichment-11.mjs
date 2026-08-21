import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-11.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({
  decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative,
});
const sitePublished = { publishedAt: '2026-08-21T15:00:00.000Z' };
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const mediaRoot = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media';
const publishedHeroImages = {
  DI101: `${mediaRoot}/catalog/di101/kwilt-recipe-hero-v2/022ed3f2dd1e3464-284460db97d296e4/candidate-1.webp`,
  DI102: `${mediaRoot}/catalog/di102/kwilt-recipe-hero-v2/e46ac9ab6d946278-8e152b21cd21173e/candidate-1.webp`,
  DI103: `${mediaRoot}/catalog/di103/kwilt-recipe-hero-v2/a3252ec522c9d230-38cb2d0dcc11c664/candidate-0.webp`,
  DI104: `${mediaRoot}/catalog/di104/kwilt-recipe-hero-v2/880001fdbaed2cfe-4e9c8eef7e16c9f3/candidate-1.webp`,
  DI105: `${mediaRoot}/catalog/di105/kwilt-recipe-hero-v2/0dfe0bb061b4ff58-eb24adfeaa09b642/candidate-0.webp`,
  DI106: `${mediaRoot}/catalog/di106/kwilt-recipe-hero-v2/2156bbd1369f62bb-d3500c02edc40270/candidate-0.webp`,
  DI107: `${mediaRoot}/catalog/di107/kwilt-recipe-hero-v2/58e0ee9de0635c5f-2d47cdcb3c0f3cbd/candidate-1.webp`,
  DI108: `${mediaRoot}/catalog/di108/kwilt-recipe-hero-v2/5819597e852e92d8-fee9ba1655adb01b/candidate-1.webp`,
  DI109: `${mediaRoot}/catalog/di109/kwilt-recipe-hero-v2/5b64d64d94c7c051-5ee68bfc277d87d9/candidate-0.webp`,
  DI110: `${mediaRoot}/catalog/di110/kwilt-recipe-hero-v2/d26f4a3e3d2cfade-0cd45c3319a8c69b/candidate-1.webp`,
  DI111: `${mediaRoot}/catalog/di111/kwilt-recipe-hero-v2/c3d3fecc997f3110-c724f676f72eccf5/candidate-1.webp`,
  DI112: `${mediaRoot}/catalog/di112/kwilt-recipe-hero-v2/8eedbe5d78769bc8-54f10ffa68dc46c2/candidate-1.webp`,
  DI113: `${mediaRoot}/catalog/di113/kwilt-recipe-hero-v2/cadcdbb4d48ca33d-7d23ca26c8d7ad81/candidate-1.webp`,
  DI114: `${mediaRoot}/catalog/di114/kwilt-recipe-hero-v2/46b9a80770bd0278-c9e3b5a221000000/candidate-1.webp`,
  DI115: `${mediaRoot}/catalog/di115/kwilt-recipe-hero-v2/6a403336edf06549-0b836a92da188698/candidate-0.webp`,
  DI116: `${mediaRoot}/catalog/di116/kwilt-recipe-hero-v2/a086cd4e0011e8b1-0b6e3b8604613b5c/candidate-2.webp`,
  DI117: `${mediaRoot}/catalog/di117/kwilt-recipe-hero-v2/14f73f5d7bb22184-9e7581662a184bc6/candidate-1.webp`,
  DI118: `${mediaRoot}/catalog/di118/kwilt-recipe-hero-v2/0d7a3f33909bb8b7-76215cd6ef443f34/candidate-1.webp`,
  DI119: `${mediaRoot}/catalog/di119/kwilt-recipe-hero-v2/24b7042abb3e0e83-b6badb27a5107273/candidate-1.webp`,
  DI120: `${mediaRoot}/catalog/di120/kwilt-recipe-hero-v2/fbba2626d8728bda-986911385b7e6b32/candidate-0.webp`,
  DI121: `${mediaRoot}/catalog/di121/kwilt-recipe-hero-v2/d39e0b88c2ee412a-f3aff05aae4134d9/candidate-1.webp`,
  DI122: `${mediaRoot}/catalog/di122/kwilt-recipe-hero-v2/1c6f844da8f6c15f-844c7af33ab502a0/candidate-0.webp`,
  DI123: `${mediaRoot}/catalog/di123/kwilt-recipe-hero-v2/040d6ff929a7fcbc-0ba0e8ba62e1d926/candidate-1.webp`,
  DI124: `${mediaRoot}/catalog/di124/kwilt-recipe-hero-v2/cef75fedba481338-da5c9cd8115785cd/candidate-0.webp`,
  DI125: `${mediaRoot}/catalog/di125/kwilt-recipe-hero-v2/3ae86f0317c39f02-2389d3ba30d2776a/candidate-1.webp`,
};

const origin = (label, region, latitude, longitude, countryIds, scale = 700) => ({
  label,
  region,
  markers: [{ label, latitude, longitude }],
  map: { center: [longitude, latitude], scale, highlightedCountryIds: Array.isArray(countryIds) ? countryIds : [countryIds] },
});

const places = {
  cantonese: origin('Guangdong and Hong Kong', 'Cantonese cooking traditions', 22.8, 113.8, '156', 680),
  china: origin('China', 'Chinese household cooking', 35.8617, 104.1954, '156', 520),
  beijing: origin('Beijing, China', 'Beijing roast-duck traditions', 39.9042, 116.4074, '156', 800),
  shanghai: origin('Shanghai and Jiangnan, China', 'Jiangnan red-braising and noodle traditions', 31.2304, 121.4737, '156', 760),
  xian: origin("Xi'an, Shaanxi, China", 'Shaanxi wheat-noodle traditions', 34.3416, 108.9398, '156', 800),
  lanzhou: origin('Lanzhou, Gansu, China', 'Lanzhou beef-noodle traditions', 36.0611, 103.8343, '156', 800),
  yunnan: origin('Yunnan, China', 'Yunnan rice-noodle traditions', 25.0389, 102.7183, '156', 720),
  dongbei: origin('Northeastern China', 'Dongbei household cooking', 43.8171, 125.3235, '156', 620),
  taiwan: origin('Taiwan', 'Taiwanese household and street-food traditions', 23.6978, 120.9605, '158', 680),
  delhi: origin('Delhi, India', 'North Indian restaurant cooking', 28.6139, 77.209, '356', 760),
  india: origin('India', 'Indian restaurant and household cooking', 20.5937, 78.9629, '356', 520),
  kashmir: origin('Kashmir', 'Kashmiri cooking traditions', 34.0837, 74.7973, ['356', '586'], 700),
  punjab: origin('Punjab region', 'Punjabi cooking traditions', 30.7333, 76.7794, ['356', '586'], 680),
};

const spec = (value) => ({ costTier: '$$', difficulty: 'Moderate', sourceIndexes: [0, 1], ...value });
const specs = {
  DI101: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.cantonese,
    historyLead: 'See yao gai is a Cantonese soy-sauce chicken associated with siu mei shops and home kitchens. Restaurant birds may be hung, while home versions gently poach and repeatedly turn a whole chicken in an aromatic soy master sauce.',
    needId: 'dutch-oven', needLabel: 'Narrow six-quart Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'narrow 6-quart pot',
    rationale: 'A relatively narrow six-quart vessel keeps the soy bath deep enough to reach most of the bird without demanding an excessive quantity of sauce, while its steady heat supports a bare simmer.',
    heroAltText: 'Cantonese soy sauce chicken chopped through the bone with glossy mahogany skin, juicy meat, rice, scallions, and strained sauce.',
    imageBrief: 'Cantonese see yao gai, one whole gently poached chicken chopped neatly through the bone, evenly glossy mahogany skin still attached, juicy fully cooked breast and darker thigh pieces, rice, scallion and a small bowl of strained soy sauce; no roast-char, pale patches, raw joints or syrupy black glaze.',
  }),
  DI102: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.cantonese,
    historyLead: 'Whole steamed fish with ginger and scallion is a Cantonese celebration and banquet form, especially meaningful at Lunar New Year because the whole fish and the word for fish evoke abundance and continuity.',
    needId: 'wok', needLabel: 'Covered carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 1, phrase: 'covered wok',
    rationale: 'A broad covered wok can suspend a heatproof platter above strongly simmering water and trap enough steam to cook a whole fish quickly without waterlogging it.',
    heroAltText: 'Whole Cantonese steamed fish on a platter with intact head and tail, fresh ginger, scallions, cilantro, soy, and sizzling oil.',
    imageBrief: 'Cantonese whole steamed sea bass or snapper on a long heatproof platter, head and tail intact, opaque moist flesh just releasing from the backbone, cloudy steaming liquid discarded, topped with fresh fine ginger, scallion greens and cilantro plus a light soy ring; no browned skin, fried fish, raw flesh or heavy black sauce.',
  }),
  DI103: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.cantonese,
    historyLead: 'Cantonese salt-and-pepper shrimp uses shell-on shrimp, a light starch coat, aromatic fried garlic and chile, and a dry pepper-salt finish. The crisp shell and restrained seasoning distinguish it from sauced shrimp dishes.',
    needId: 'thermometer', needLabel: 'Clip-on frying thermometer', reviewCategoryId: 'clip-on-frying-thermometer', instructionIndex: 2, phrase: '375°F',
    rationale: 'A clip-on frying thermometer makes the brief shell-on fry repeatable at 375°F, helping the shell crisp before the shrimp meat tightens and preventing starch from absorbing cool oil.',
    heroAltText: 'Cantonese salt and pepper shrimp with crisp shell-on shrimp, pale-gold starch, fried garlic, red chile, scallions, and a dry finish.',
    imageBrief: 'Cantonese salt-and-pepper shrimp, large shell-on headless shrimp with split backs, crisp shells and very light pale-gold starch, loose C curves, fried garlic crumbs, sliced red chile and scallions on a dry shared plate; no sticky sauce, breading clumps, dark overfried shells or tight rubbery curls.',
  }),
  DI104: spec({
    place: places.china,
    historyLead: 'Chow mein broadly means stir-fried noodles and encompasses many Chinese regional and diaspora forms. This version follows a crisp-edged noodle-cake branch with velveted chicken and crisp vegetables rather than a soft, heavily sauced takeaway pile.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 2, phrase: '12-inch wok or skillet',
    rationale: 'A twelve-inch carbon-steel wok gives drained noodles enough hot surface to form a thin crisp cake, then supplies responsive heat for chicken and vegetables without steaming them.',
    heroAltText: 'Chicken chow mein with crisp-edged golden noodles, browned chicken, cabbage, carrot, bean sprouts, and scallions in a light glaze.',
    imageBrief: 'Chinese chicken chow mein in a crisp-edged noodle-cake branch, thin golden noodles with visibly browned lacy edges and separated soft strands, small browned chicken slices, napa cabbage, carrot, bean sprouts and scallion in a restrained light glaze; no dark gravy pool, limp noodle mound or oversized vegetables.',
  }),
  DI105: spec({
    costTier: '$$$', place: places.china,
    historyLead: 'Yangzhou fried rice is associated with Yangzhou in Jiangsu and developed into a nationally and internationally recognized composed fried rice. Ingredient lists vary, but separate grains, egg, char siu, shrimp, peas, and scallion are a familiar banquet-style pattern.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 0, phrase: 'wok',
    rationale: 'A seasoned carbon-steel wok reaches the dry, high heat needed to separate cold rice grains, toast them lightly, and fold in delicate egg and shrimp without creating a wet soy-coated mass.',
    heroAltText: 'Yangzhou fried rice with separate glossy grains, broad egg curds, char siu, shrimp, peas, and scallions.',
    imageBrief: 'Yangzhou-style fried rice on a simple shared plate, individual lightly glossy pale grains clearly separate, broad tender yellow egg curds, diced char siu, small pink shrimp, green peas and scallions distributed evenly; no dark soy color, sticky clumps, corn-heavy mix or wet sauce.',
  }),
  DI106: spec({
    place: places.china,
    historyLead: 'Mu xu rou is a northern Chinese stir-fry named for the resemblance of scrambled egg to sweet-osmanthus blossoms. Chinese American moo shu developed a related pancake-served restaurant form; this recipe keeps a rice-served northern household branch.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 1, phrase: 'wok',
    rationale: 'A responsive wok sets broad egg curds quickly and then sears thin pork before the crisp cucumber and wood ears release excess water.',
    heroAltText: 'Northern Chinese moo shu pork with tender pork strips, broad egg curds, crisp cucumber, wood ear mushrooms, and scallions.',
    imageBrief: 'Northern Chinese mu xu rou household stir-fry served with rice, thin tender pork strips, broad golden egg curds, crisp pale-green cucumber batons, ruffled black wood ears and scallions in a nearly dry light coating; no cabbage-heavy American pancake filling, hoisin flood or tiny scrambled egg.',
  }),
  DI107: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.beijing,
    historyLead: 'Beijing roast duck is a specialized restaurant tradition built around inflated, dried, lacquered skin and dedicated ovens. A home oven cannot duplicate that system, so this adaptation names its limits while preserving drying, glazing, crisp skin, pancakes, and table service.',
    needId: 'wire-rack', needLabel: 'Oven-safe wire rack', reviewCategoryId: 'wire-rack', instructionIndex: 1, phrase: 'rack over a tray',
    rationale: 'An oven-safe rack keeps air moving around the lacquered duck during the uncovered refrigerator dry and holds it above rendered fat during roasting, both essential to the home adaptation.',
    heroAltText: 'Home-oven Beijing-style roast duck with deep mahogany crisp skin, carved meat, thin pancakes, cucumber, scallion, and sweet wheat paste.',
    imageBrief: 'Honest home-oven Beijing-style roast duck service, one whole deep-mahogany duck with taut visibly crisp skin plus neat carved skin-on slices, very thin folded wheat pancakes, cucumber batons, scallion brushes and sweet wheat paste; no restaurant hanging-oven claim, raw joints, thick tortillas or soggy skin.',
  }),
  DI108: spec({
    costTier: '$$$', place: places.shanghai,
    historyLead: 'Hong shao rou is a broad Chinese red-braised pork family. The Shanghai and Jiangnan branch is known for a glossy sweet-savory soy-and-Shaoxing balance and melting cubes of skin-on pork belly.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'heavy pot',
    rationale: 'A heavy Dutch oven steadies the low rock-sugar caramel, retains gentle heat for the covered belly braise, and reduces the final liquid evenly into a glaze without scorching tender cubes.',
    heroAltText: 'Shanghai red-braised pork belly with glossy red-brown cubes, intact skin-fat-meat layers, rice, and bok choy.',
    imageBrief: 'Shanghai-style hong shao rou, large even pork-belly cubes with intact skin-fat-meat layers, gelatinous yet holding shape, coated in a luminous red-brown soy, Shaoxing and rock-sugar glaze, rice and bok choy; no black sauce pool, shredded meat, dried surfaces or chile-heavy Hunan styling.',
  }),
  DI109: spec({
    costTier: '$', difficulty: 'Easy', place: places.shanghai,
    historyLead: 'Cong you ban mian is a Shanghai-associated scallion-oil noodle form. Slowly fried scallions perfume the oil and become a crisp garnish; the seasoning should cling to springy noodles rather than turn them into soup.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 0, phrase: 'cold wok',
    rationale: 'Starting scallions and oil in a cold carbon-steel wok allows slow, even frying across its broad surface, while its responsiveness helps stop the scallions at deep gold rather than black.',
    heroAltText: 'Shanghai scallion oil noodles with springy strands, crisp deep-golden scallions, and a light glossy soy coating.',
    imageBrief: 'Shanghai cong you ban mian in a modest bowl, springy thin wheat noodles individually visible under a light amber-brown scallion-oil and soy sheen, crowned with long crisp deep-golden scallion pieces; no black burned onions, broth, thick dark sauce or oversized garnish pile.',
  }),
  DI110: spec({
    costTier: '$', difficulty: 'Advanced', place: places.xian,
    historyLead: 'Biang biang mian belongs to Shaanxi wheat-noodle culture and is especially associated with Xi’an. The defining belts are hand-stretched, slapped, and split before receiving aromatics awakened by hot oil.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 2, phrase: 'wide pot',
    rationale: 'A wide Dutch oven gives long hand-pulled noodle belts room to enter boiling water without folding into a tight knot and provides steady recovery between small batches.',
    heroAltText: 'Xi’an biang biang noodles with broad hand-pulled belts, bok choy, garlic, scallion, chile flakes, cumin, vinegar, and hot oil.',
    imageBrief: 'Xi’an biang biang mian, several very broad irregular hand-pulled wheat noodle belts with torn center loops clearly visible, chewy glossy surface, bok choy, minced garlic, scallion, chile flakes and cumin awakened by a restrained hot-oil pour; no uniform machine ribbons, soup broth or spaghetti.',
  }),
  DI111: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.lanzhou,
    historyLead: 'Lanzhou beef noodles, commonly called Lanzhou lamian, are a tightly defined local noodle culture centered on clear beef broth, hand-pulled noodles, daikon, chile oil, cilantro, and scallion. Pulling technique is a practiced craft rather than a casual garnish.',
    needId: 'stockpot', needLabel: 'Twelve-quart stockpot', reviewCategoryId: 'large-stockpot', instructionIndex: 0, phrase: 'clean stockpot',
    rationale: 'A twelve-quart stockpot safely contains bones, beef shank, fourteen cups of water, aromatics, and simmering headroom while preserving the clear-broth skimming surface.',
    heroAltText: 'Lanzhou hand-pulled beef noodle soup with fine even noodles, clear broth, sliced shank, daikon, chile oil, cilantro, and scallion.',
    imageBrief: 'Lanzhou beef noodle soup in a deep bowl, many fine evenly hand-pulled wheat strands under a clear golden beef broth, very thin sliced shank, translucent white daikon, red chile oil accents, cilantro and scallion; no opaque stew broth, chunky beef, ramen egg, bok choy or machine-flat noodles.',
  }),
  DI112: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.yunnan,
    historyLead: 'Crossing-the-bridge rice noodles are associated with Yunnan and especially Mengzi. The table ritual traditionally uses fiercely hot broth and an insulating fat layer to cook or warm separately presented ingredients; this household version pre-cooks proteins for an explicit safety margin.',
    needId: 'stockpot', needLabel: 'Twelve-quart stockpot', reviewCategoryId: 'large-stockpot', instructionIndex: 0, phrase: 'clean stockpot',
    rationale: 'A large stockpot gives the chicken and pork bones enough water and exposed surface for careful skimming, then holds the quantity of clear broth needed to preheat and fill four large bowls safely.',
    heroAltText: 'Yunnan crossing-the-bridge rice noodles with clear hot broth, rice noodles, sliced chicken and pork, quail eggs, tofu skin, mushrooms, greens, and herbs.',
    imageBrief: 'Yunnan guoqiao mixian table service, one deep heatproof bowl of clear shimmering chicken-pork broth with white rice noodles, fully cooked thin chicken and pork, halved quail eggs, tofu skin, mushrooms, sprouts and bok choy arranged distinctly, ingredient platters nearby; no raw meat in serving bowl, opaque soup or ramen styling.',
  }),
  DI113: spec({
    costTier: '$', place: places.dongbei,
    historyLead: 'Di san xian, “three treasures of the earth,” is a Dongbei dish of potato, eggplant, and green pepper. Its appeal depends on separately cooked textures brought together under only a thin glossy sauce.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 1, phrase: 'wok',
    rationale: 'A broad carbon-steel wok shallow-fries potato and eggplant in uncrowded batches, flash-blisters the peppers, and reduces the starch-thickened sauce rapidly so it coats without pooling.',
    heroAltText: 'Dongbei di san xian with golden potato, tender browned eggplant, blistered green peppers, garlic, and a thin glossy sauce.',
    imageBrief: 'Dongbei di san xian on a shared plate, distinct golden potato wedges tender within, browned fully soft eggplant chunks and vivid blistered green pepper pieces under a very thin glossy garlic-soy coating, rice alongside; no sauce pool, raw eggplant, limp olive peppers or meat.',
  }),
  DI114: spec({
    place: places.taiwan,
    historyLead: 'San bei ji is a Taiwanese classic whose name refers to the remembered proportion of sesame oil, rice wine, and soy sauce rather than a mandatory literal cup of each. Ginger, garlic, chile, and Taiwanese basil complete its aromatic identity.',
    needId: 'skillet', needLabel: 'Heavy cast-iron skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 0, phrase: 'clay pot or heavy skillet',
    rationale: 'A heavy cast-iron skillet is a practical alternative to a clay pot, browning chicken in one layer and retaining enough heat to reduce rice wine and soy into the characteristic glossy coating.',
    heroAltText: 'Taiwanese three cup chicken with glossy browned bone-in pieces, ginger, garlic, red chile, and wilted Taiwanese basil over rice.',
    imageBrief: 'Taiwanese san bei ji, browned bone-in chicken pieces with skin visible, glossy reduced rice-wine soy coating rather than a pool, many curled ginger slices, whole garlic cloves, sliced red chile and abundant just-wilted Taiwanese basil, rice alongside; no literal cups of sauce, breading or raw basil heap.',
  }),
  DI115: spec({
    costTier: '$', place: places.taiwan,
    historyLead: 'Lu rou fan is a Taiwanese rice-bowl family of finely cut braised pork and sauce, with regional and household differences in cut, sweetness, spice, mushrooms, and garnish. Crisp fried shallots are a defining aromatic in this branch.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'heavy pot',
    rationale: 'A heavy Dutch oven browns the diced pork evenly, then holds a quiet partial-covered braise long enough for skin and fat to enrich the abundant sauce without drying the pot.',
    heroAltText: 'Taiwanese lu rou fan with finely diced glossy pork belly and sauce over rice, halved braised egg, greens, and crisp shallots.',
    imageBrief: 'Taiwanese lu rou fan bowl, very finely diced skin-on pork belly melted into an abundant glossy amber-brown sauce over white rice, one halved soy-braised egg, green vegetable and crisp fried shallots; no large hong-shao cubes, ground meat, dry rice or thick black gravy.',
  }),
  DI116: spec({
    costTier: '$', place: places.china,
    historyLead: 'Lion’s head meatballs are a Jiangnan dish associated particularly with Huaiyang and Shanghai-area cooking. Their large size, tender hand-mixed texture, water chestnut, napa cabbage, and gentle braise distinguish them from compact fried meatballs.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'wide Dutch oven',
    rationale: 'A wide Dutch oven browns the fragile oversized meatballs in controlled batches and then holds all six in a single cabbage-lined layer for a protected gentle braise.',
    heroAltText: 'Chinese lion’s head pork meatballs in napa cabbage and clear brown broth, with six large tender meatballs and rice.',
    imageBrief: 'Jiangnan lion’s head meatballs in shallow bowls, very large round pork meatballs with softly textured surfaces, napa cabbage leaves draped around them, clear light-brown braising broth and scallion, rice alongside; no dense smooth meatballs, tomato sauce, deep-fried crust or thick gravy.',
  }),
  DI117: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.delhi,
    historyLead: 'Butter chicken, murgh makhani, emerged in mid-twentieth-century Delhi restaurant culture, commonly linked to the Moti Mahal lineage and the reuse of tandoori chicken in a tomato-butter gravy. Attribution details remain contested among descendant businesses.',
    needId: 'strainer', needLabel: 'Fine-mesh strainer', reviewCategoryId: 'fine-mesh-strainer', instructionIndex: 3, phrase: 'fine sieve',
    rationale: 'A fine-mesh strainer removes tomato skins, seeds, cashew grit, and fibrous aromatics after blending, producing the satin-smooth Delhi restaurant-style gravy without excessive cream.',
    heroAltText: 'Delhi-style butter chicken with charred chicken pieces in smooth orange-red tomato, butter, cashew, cream, and fenugreek gravy beside basmati rice.',
    imageBrief: 'Delhi restaurant-style murgh makhani, irregular boneless chicken pieces with visible broiler char nestled in a satin-smooth flowing orange-red tomato, butter and cashew gravy, restrained cream, kasuri methi flecks and basmati rice; no chunky tomato, sugary bright-orange pool, uncharred boiled chicken or cilantro forest.',
  }),
  DI118: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.india,
    historyLead: 'Chicken tikka masala is a British South Asian restaurant dish with disputed origin stories, often associated with postwar curry-house cooking in Britain. Its identity joins charred chicken tikka with a spiced tomato gravy rather than representing one timeless Indian regional dish.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 2, phrase: 'Dutch oven',
    rationale: 'A broad Dutch oven gives onions and tomato paste enough surface to brown deeply, captures the chicken fond, and reduces crushed tomatoes into a thick masala before the charred chicken returns.',
    heroAltText: 'Chicken tikka masala with charred chicken pieces in thick spiced tomato-cream masala, cilantro, and basmati rice.',
    imageBrief: 'British South Asian chicken tikka masala, irregular chicken pieces with genuinely blackened broiler edges in a thick but spoonable brick-orange tomato and cream masala with oil beading lightly at edges, cilantro and basmati rice; no butter-chicken label, neon sauce, smooth uncharred cubes or soupiness.',
  }),
  DI119: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.kashmir,
    historyLead: 'Rogan josh is a Kashmiri meat dish with distinct Pandit and Muslim branches. Ingredients such as onion, garlic, shallot, cockscomb flower, yogurt, and spice treatment differ; this version follows a yogurt, fennel, dry-ginger, and Kashmiri-chile branch without claiming universality.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'Brown lamb in three uncrowded batches',
    rationale: 'A heavy Dutch oven provides the broad stable heat needed to brown lamb without steaming, then maintains the bare simmer that tenderizes the meat while yogurt and spices form a cohesive sauce.',
    heroAltText: 'Kashmiri rogan josh with tender lamb pieces in deep red yogurt, fennel, dry ginger, and Kashmiri chile sauce beside basmati rice.',
    imageBrief: 'Kashmiri rogan josh in the yogurt, fennel and dry-ginger branch, medium lamb chunks fork-tender yet intact in a deep natural red sauce with small red-oil beads, whole cardamom and cinnamon removed before service, basmati rice alongside; no tomato chunks, fluorescent dye, cream swirl or generic curry garnish.',
  }),
  DI120: spec({
    costTier: '$', place: places.punjab,
    historyLead: 'Saag names cooked greens, while palak means spinach. Punjabi sarson da saag is mustard-green centered; restaurant “saag paneer” often uses spinach. This recipe names a mixed mustard-green and spinach branch rather than treating the terms as interchangeable.',
    needId: 'immersion-blender', needLabel: 'Immersion blender', reviewCategoryId: 'immersion-blender', instructionIndex: 1, phrase: 'immersion blender',
    rationale: 'An immersion blender lets the cook pulse the fully tender greens directly in the pot, stopping at the coarse spoonable texture that distinguishes saag from a liquefied spinach sauce.',
    heroAltText: 'Punjabi-style mixed-green saag paneer with coarse mustard and spinach greens, tender browned paneer cubes, ginger, garlic, and roti.',
    imageBrief: 'Punjabi mixed-green saag paneer, coarse spoonable deep-green mustard and spinach texture with visible leafy character, tender paneer cubes only lightly browned on two sides, restrained cream if any, ginger and roti alongside; no perfectly smooth neon puree, rubbery dark-fried cheese or palak-only claim.',
  }),
  DI121: spec({
    costTier: '$', place: places.india,
    historyLead: 'Chana masala is a broad North Indian chickpea preparation with regional, restaurant, and household branches. This version builds a deeply cooked onion-tomato masala and finishes with amchur and kasuri methi for brightness and aroma.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'Dutch oven',
    rationale: 'A wide Dutch oven gives onions and tomatoes enough surface to cook to a deep, oil-beaded masala, then holds tender chickpeas and reserved cooking liquid for a cohesive simmer.',
    heroAltText: 'North Indian chana masala with intact tender chickpeas in thick onion-tomato masala, cilantro, and basmati rice.',
    imageBrief: 'North Indian chana masala, many intact fully tender chickpeas in a thick reddish-brown onion-tomato masala with a few mashed chickpeas providing body, light oil beads, cilantro and basmati rice; no watery soup, canned-firm chickpeas, cream or excessive whole-spice garnish.',
  }),
  DI122: spec({
    costTier: '$', difficulty: 'Easy', place: places.india,
    historyLead: 'Dal tadka pairs cooked lentils with a tempering of hot fat and spices. Dal combinations and tadka aromatics vary widely; this branch uses toor and masoor dal, an onion-tomato masala, then a final cumin, garlic, chile, and asafoetida sizzle.',
    needId: 'saucepan', needLabel: 'Medium saucepan', reviewCategoryId: 'medium-saucepan', instructionIndex: 3, phrase: 'small pan',
    rationale: 'A small-to-medium saucepan gives the final ghee, cumin, sliced garlic, and dried chiles enough depth to fry safely while keeping the brief aromatic tempering visible and controllable.',
    heroAltText: 'Indian dal tadka with creamy yellow-orange lentils, a sizzling cumin, garlic, and dried-chile tempering, cilantro, and rice.',
    imageBrief: 'Indian dal tadka in a heatproof serving bowl, pourable creamy yellow-orange toor and masoor lentils, visible fresh final tadka of pale-gold sliced garlic, cumin seeds, dried red chiles and red ghee swirls, cilantro and rice; no thick hummus texture, burned garlic or fully stirred-away tempering.',
  }),
  DI123: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.india,
    historyLead: 'Malai kofta is a North Indian restaurant family of rich gravies and tender dumplings. Kofta composition varies; this vegetarian branch uses potato and paneer with raisin and cashew centers, served so the fried tops remain crisp.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 1, phrase: 'blend with water until silken',
    rationale: 'A strong countertop blender turns cooked onion, tomato, ginger, garlic, spices, and raw cashews into a silken gravy before straining, avoiding a gritty restaurant-style sauce.',
    heroAltText: 'North Indian malai kofta with deep-golden potato-paneer dumplings in silken cashew-tomato cream gravy, naan, and crisp tops visible.',
    imageBrief: 'North Indian restaurant-style malai kofta, three or four evenly deep-golden round potato-paneer kofta with crisp upper halves still above a silken flowing orange cashew-tomato cream gravy, one cut kofta revealing raisin and cashew, naan alongside; no submerged soggy balls, coarse sauce or meat.',
  }),
  DI124: spec({
    place: places.india,
    historyLead: 'Palak chicken is a North Indian spinach-and-chicken preparation. Unlike mixed-green saag, this branch centers spinach, keeps the puree coarse and bright through brief blanching, and adds it only after the chicken is cooked.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 1, phrase: 'blend to a coarse bright puree',
    rationale: 'A countertop blender can pulse the shocked, squeezed spinach and chile into a coarse puree without added water, preserving visible green texture instead of making a thin smoothie.',
    heroAltText: 'North Indian palak chicken with tender chicken pieces in coarse bright spinach, tomato, ginger, garlic, and fenugreek sauce beside rice.',
    imageBrief: 'North Indian palak chicken, bone-free chicken pieces fully cooked and partly visible in a coarse bright deep-green spinach sauce with tiny tomato and spice foundation, kasuri methi and rice alongside; no smooth neon puree, cream pattern, paneer cubes or brown overcooked greens.',
  }),
  DI125: spec({
    costTier: '$$', place: places.india,
    historyLead: 'Paneer butter masala is a North Indian restaurant gravy in the makhani family, pairing paneer with tomato, butter, cashew, cream, and fenugreek. It should remain satin-smooth and gently flowing rather than become a stiff tomato paste.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 1, phrase: 'blend completely smooth',
    rationale: 'A powerful countertop blender makes the softened tomato, onion, cashew, ginger, garlic, and spices completely smooth before the required fine-sieve pass.',
    heroAltText: 'Paneer butter masala with tender ivory paneer cubes in smooth flowing tomato, cashew, butter, cream, and fenugreek gravy beside naan.',
    imageBrief: 'North Indian restaurant-style paneer butter masala, tender large ivory paneer cubes warmed rather than fried, partly visible in a satin-smooth flowing orange-red tomato, cashew, butter and cream gravy with kasuri methi flecks, naan alongside; no rubbery browned cheese, chunky sauce, neon color or stiff paste.',
  }),
};

function authoredHistory(task, value) {
  return {
    paragraphs: [
      value.historyLead,
      `${task.notes} This Kwilt version follows the reviewed household adaptation: ${task.existingResearch.adaptationDecision}`,
    ],
    sources: value.sourceIndexes.map((index) => {
      const { title, publisher, url } = task.sources[index];
      return { title, publisher, url };
    }),
  };
}

function authorRecipe(manifestRecipe) {
  const task = manifestRecipe.researchTask;
  const value = specs[manifestRecipe.rosterId];
  if (!task || !value) throw new Error(`Missing reviewed authoring input for ${manifestRecipe.rosterId}.`);
  return {
    cookingReview: approved(`Reviewed against the batch evidence: ${task.existingResearch.nonNegotiableTechniques.join(' ')} The method preserves the defining texture, sequence, doneness, food-safety limits, and cultural boundary while naming the documented household adaptation honestly.`),
    reviewedAt: '2026-08-20', publication: sitePublished,
    costTier: value.costTier, difficulty: value.difficulty,
    ingredientReview: accept(...task.ingredients.map((_, position) => position)),
    commerce: reviewCategory(value.needId, value.reviewCategoryId, value.rationale, `Use a sound ${value.needLabel.toLowerCase()} already owned and preserve the specified heat, spacing, handling, and doneness cues.`),
    equipmentNeeds: [{ id: value.needId, label: value.needLabel, reviewCategoryId: value.reviewCategoryId }],
    equipmentAnnotations: [{ instructionIndex: value.instructionIndex, phrase: value.phrase, needId: value.needId, focus: 'specialty' }],
    origin: value.place,
    history: authoredHistory(task, value),
    heroImage: publishedImage(publishedHeroImages[manifestRecipe.rosterId], value.heroAltText),
    heroAltText: value.heroAltText,
    imageBrief: value.imageBrief,
  };
}

export default Object.fromEntries(manifest.recipes.map((recipe) => [recipe.rosterId, authorRecipe(recipe)]));
