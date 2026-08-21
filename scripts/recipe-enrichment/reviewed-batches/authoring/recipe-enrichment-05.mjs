import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-05.json');
const seed = require('../../../../src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({
  decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative,
});
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const sitePublished = { publishedAt: '2026-08-21T03:00:00.000Z' };
const mediaRoot = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media';
const publishedHeroImages = {
  BR071: `${mediaRoot}/catalog/br071/kwilt-recipe-hero-v2/6b53c9bd529042fe-b8fe29eb28048733/candidate-0.webp`,
  BR072: `${mediaRoot}/catalog/br072/kwilt-recipe-hero-v2/67f10ce58771b8f3-7f660dffbf1ee3f2/candidate-1.webp`,
  BR074: `${mediaRoot}/catalog/br074/kwilt-recipe-hero-v2/ae78e418b2318434-e00e2fa356fd7bbf/candidate-1.webp`,
  BR075: `${mediaRoot}/catalog/br075/kwilt-recipe-hero-v2/35aac6681f6e9b19-fa94515a61d9c0a9/candidate-0.webp`,
  BR076: `${mediaRoot}/catalog/br076/kwilt-recipe-hero-v2/25bf973b03441e5b-938eaf1769ce6000/candidate-1.webp`,
  BR077: `${mediaRoot}/catalog/br077/kwilt-recipe-hero-v2/29798140d057781d-da1b535aa87de77a/candidate-1.webp`,
  BR079: `${mediaRoot}/catalog/br079/kwilt-recipe-hero-v2/bbe875789cb5ba81-0b109c0b0d77237f/candidate-1.webp`,
  BR080: `${mediaRoot}/catalog/br080/kwilt-recipe-hero-v2/6d9dd68fe54f8eef-6f53830e7010c530/candidate-0.webp`,
  BR081: `${mediaRoot}/catalog/br081/kwilt-recipe-hero-v2/bb909fc90f23ca6a-409accd9fe043084/candidate-0.webp`,
  BR082: `${mediaRoot}/catalog/br082/kwilt-recipe-hero-v2/795d907d8650897b-5091b975344a3346/candidate-1.webp`,
  BR083: `${mediaRoot}/catalog/br083/kwilt-recipe-hero-v2/a22b94483458980c-961acace8869a13d/candidate-1.webp`,
  BR084: `${mediaRoot}/catalog/br084/kwilt-recipe-hero-v2/83ea411c120f638f-0f27fcb44bfcb5cd/candidate-1.webp`,
  BR085: `${mediaRoot}/catalog/br085/kwilt-recipe-hero-v2/8862fa6b1f5079f6-5e7da8fa50a173c9/candidate-0.webp`,
  BR086: `${mediaRoot}/catalog/br086/kwilt-recipe-hero-v2/04c5851715c7db07-c0fe7114154f3d67/candidate-1.webp`,
  BR087: `${mediaRoot}/catalog/br087/kwilt-recipe-hero-v2/41b9f711c88a00ff-096d162788a31ed1/candidate-2.webp`,
  BR088: `${mediaRoot}/catalog/br088/kwilt-recipe-hero-v2/75dd24b0da0c1635-be5428b229029d73/candidate-0.webp`,
  BR089: `${mediaRoot}/catalog/br089/kwilt-recipe-hero-v2/2f2276a56b0d11ef-561a1547af5ab0ba/candidate-1.webp`,
  BR090: `${mediaRoot}/catalog/br090/kwilt-recipe-hero-v2/d4af8dfd1aa165f1-dc17276dfa98404e/candidate-0.webp`,
  DE001: `${mediaRoot}/catalog/de001/kwilt-recipe-hero-v2/7d5c62187ee7dda1-67b9fdd13441ae24/candidate-0.webp`,
  DE002: `${mediaRoot}/catalog/de002/kwilt-recipe-hero-v2/3afeabe24aae31e9-afad86a91ea2f6f2/candidate-0.webp`,
  DE003: `${mediaRoot}/catalog/de003/kwilt-recipe-hero-v2/283bdbbdd7f1528d-155dad7328a08f2e/candidate-0.webp`,
  DE004: `${mediaRoot}/catalog/de004/kwilt-recipe-hero-v2/b0469df407e39750-b5308a820dd9313f/candidate-1.webp`,
  DE005: `${mediaRoot}/catalog/de005/kwilt-recipe-hero-v2/7dddc72b912e024f-25b1d7883ad9a295/candidate-0.webp`,
};
const origin = (label, region, latitude, longitude, countryIds, scale = 650) => ({
  label, region, markers: [{ label, latitude, longitude }],
  map: { center: [longitude, latitude], scale, highlightedCountryIds: Array.isArray(countryIds) ? countryIds : [countryIds] },
});
const places = {
  ukraine: origin('Ukraine', 'Ukrainian cheese-cake traditions', 48.3794, 31.1656, '804', 620),
  russia: origin('Russia', 'Russian blini traditions', 61.524, 105.3188, '643', 430),
  israel: origin('Israel', 'Israeli breakfast and boureka traditions', 31.0461, 34.8516, '376', 760),
  colombia: origin('Colombia', 'Colombian leftover-breakfast traditions', 4.5709, -74.2973, '170', 620),
  costaRica: origin('Costa Rica', 'Costa Rican gallo pinto traditions', 9.7489, -83.7534, '188', 780),
  dominican: origin('Dominican Republic', 'Dominican plantain breakfast traditions', 18.7357, -70.1627, '214', 760),
  haiti: origin('Haiti', 'Haitian breakfast traditions', 18.9712, -72.2852, '332', 760),
  brazil: origin('Northeastern Brazil', 'Northeastern Brazilian corn breakfast traditions', -8.0476, -34.877, '076', 610),
  venezuela: origin('Venezuela', 'Venezuelan arepa traditions', 6.4238, -66.5897, '862', 590),
  peru: origin('Peru', 'Peruvian tamal traditions', -9.19, -75.0152, '604', 600),
  elSalvador: origin('El Salvador', 'Salvadoran rice-and-bean traditions', 13.7942, -88.8965, '222', 800),
  southAfrica: origin('South Africa', 'South African maize-porridge traditions', -30.5595, 22.9375, '710', 560),
  ethiopia: origin('Ethiopia', 'Ethiopian flatbread breakfast traditions', 9.145, 40.4897, '231', 620),
  morocco: origin('Morocco', 'Moroccan laminated flatbread traditions', 31.7917, -7.0926, '504', 650),
  nigeria: origin('Nigeria', 'Nigerian akara and ogi breakfast traditions', 9.082, 8.6753, '566', 560),
  australia: origin('Australia', 'Australian café breakfast traditions', -25.2744, 133.7751, '036', 500),
  modern: origin('Contemporary household kitchens', 'Modern make-ahead breakfast traditions', 39.8283, -98.5795, '840', 430),
  usa: origin('United States', 'American baking traditions', 39.8283, -98.5795, '840', 430),
};

const spec = (value) => ({ costTier: '$$', difficulty: 'Moderate', ...value });
const specs = {
  BR071: spec({
    costTier: '$', place: places.ukraine,
    historyLead: 'Syrnyky are Ukrainian farmer-cheese cakes shaped from a restrained dough, lightly floured outside, and pan-browned until the cheese center sets.',
    needId: 'skillet', needLabel: '10-inch nonstick skillet', reviewCategoryId: '10-inch-nonstick-skillet', instructionIndex: 3, phrase: 'nonstick skillet',
    rationale: 'A sound nonstick surface lets the delicate, low-flour cheese cakes brown deeply and turn without tearing.',
    heroAltText: 'Golden Ukrainian syrnyky with lightly textured cheese centers, sour cream, and berry preserves.',
    imageBrief: 'Twelve thick round Ukrainian syrnyky with deep even golden faces and lightly floured sides, one cut to show a set but tender farmer-cheese center; cool sour cream and berry preserves, no pancake stack.',
  }),
  BR072: spec({
    place: places.russia,
    historyLead: 'Blini have a long place in Russian food culture; this yeast-raised buckwheat version uses folded egg whites for small aerated rounds served warm.',
    needId: 'griddle', needLabel: 'Heavy skillet or griddle', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 2, phrase: 'heavy skillet or griddle',
    rationale: 'A heavy surface keeps moderate-low heat stable so the small fermented blini aerate and cook through without scorching.',
    heroAltText: 'Small yeast-raised buckwheat blini with sour cream, smoked salmon, dill, and lemon.',
    imageBrief: 'Small Russian buckwheat blini, brown-speckled and visibly airy, loosely arranged while warm with cold sour cream, folds of smoked salmon, dill and lemon; not thin crepes or a tall American stack.',
  }),
  BR074: spec({
    difficulty: 'Advanced', place: places.israel,
    historyLead: 'Boureka traditions reached Israel through Sephardi and Ottoman migration and became a familiar breakfast pastry served with egg, chopped salad, tahini, and hot sauce.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 2, phrase: 'parchment-lined sheet',
    rationale: 'A rigid rimmed sheet keeps the cold pastry flat, catches any filling leaks, and supports deep even browning.',
    heroAltText: 'Puffed triangular bourekas with boiled egg, chopped Israeli salad, tahini, and zhug kept alongside.',
    imageBrief: 'Deeply puffed golden triangular potato-feta bourekas with sesame, served hot beside halved hard-boiled eggs, a dry-drained cucumber-tomato-parsley salad, tahini and zhug; wet sides do not touch pastry.',
  }),
  BR075: spec({
    place: places.colombia,
    historyLead: 'Calentado is a Colombian leftover breakfast that reheats rice and beans, often with hogao and meat, then serves them with eggs and other morning staples.',
    needId: 'skillet', needLabel: 'Wide heavy skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 0, phrase: 'wide skillet',
    rationale: 'A broad skillet gives cold rice and beans room to reach a safe temperature while developing crisp edges instead of steaming.',
    heroAltText: 'Colombian calentado with rice, beans, hogao, chorizo, crisp edges, fried eggs, avocado, and arepas.',
    imageBrief: 'Colombian calentado plate with clearly mixed rice and red beans stained by jammy hogao, small browned chorizo pieces and some crisp rice edges, topped with fried eggs; avocado and warm arepas alongside.',
  }),
  BR076: spec({
    costTier: '$', place: places.costaRica,
    historyLead: 'Gallo pinto is central to Costa Rican breakfast and also has a distinct Nicaraguan tradition; this version uses a Costa Rican Central Valley profile with Salsa Lizano.',
    needId: 'skillet', needLabel: 'Wide heavy skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 0, phrase: 'wide skillet',
    rationale: 'A broad heavy skillet distributes bean liquid through cold rice while leaving enough room to fold without crushing the beans.',
    heroAltText: 'Costa Rican gallo pinto with separate rice and beans, fried eggs, warm tortillas, and natilla.',
    imageBrief: 'Costa Rican gallo pinto with separate rice grains evenly spotted brown by bean liquid, intact black beans, tiny sweet pepper and cilantro; fried eggs, tortillas and natilla alongside, never wet or mashed.',
  }),
  BR077: spec({
    costTier: '$', place: places.dominican,
    historyLead: 'Mangú is a Dominican preparation of boiled green plantains mashed while hot and commonly served at breakfast with vinegary red onions and other accompaniments.',
    needId: 'saucepan', needLabel: 'Medium saucepan', reviewCategoryId: 'medium-saucepan', instructionIndex: 0, phrase: 'boil gently',
    rationale: 'A stable saucepan keeps plantain pieces submerged at a gentle boil until fully tender enough for a smooth mash.',
    heroAltText: 'Soft Dominican mangú topped with bright vinegary red onions and served with crisp-edged fried eggs.',
    imageBrief: 'Dominican mangu as a soft smooth mound of pale green-plantain mash, spoonable rather than stiff, topped with vivid pink vinegary red onions and served with fried eggs; optional avocado, no meat trio.',
  }),
  BR079: spec({
    costTier: '$', difficulty: 'Moderate', place: places.haiti,
    historyLead: 'Haitian spaghetti became a breakfast staple through local adaptation, commonly combining noodles with epis, tomato, ketchup, vegetables, and sliced hot dogs.',
    needId: 'blender', needLabel: 'High-powered blender', reviewCategoryId: 'blender', instructionIndex: 0, phrase: 'blend half the bell pepper',
    rationale: 'A capable blender turns fresh aromatics into the coarse bright epis paste that grounds the finished sauce.',
    heroAltText: 'Haitian breakfast spaghetti coated in epis-tomato sauce with browned hot-dog slices, peppers, onion, and scallions.',
    imageBrief: 'Haitian breakfast spaghetti with sauce clinging to separate noodles, browned hot-dog coins, crisp-tender bell pepper and onion, bright scallion and a reddish epis-tomato sheen; no Italian cheese or heavy marinara.',
  }),
  BR080: spec({
    costTier: '$', place: places.brazil,
    historyLead: 'Cuscuz de milho is a defining breakfast in Northeastern Brazil, made by hydrating flocão cornmeal before steaming it into a tender, fragrant mass.',
    needId: 'saucepan', needLabel: 'Medium saucepan', reviewCategoryId: 'medium-saucepan', instructionIndex: 3, phrase: 'wide pan of water',
    rationale: 'A stable saucepan provides the bare simmer needed to poach the eggs gently while the steamed corn stays fluffy.',
    heroAltText: 'Fluffy Northeastern Brazilian steamed corn cuscuz with soft poached eggs, butter, herbs, and black pepper.',
    imageBrief: 'Brazilian cuscuz nordestino in bright yellow fluffy steamed corn flakes, lightly loosened with butter water and topped with properly drained poached eggs with set whites and soft yolks; herbs and pepper only.',
  }),
  BR081: spec({
    costTier: '$', difficulty: 'Advanced', place: places.venezuela,
    historyLead: 'Venezuelan arepas are griddled cornmeal rounds split and filled in many ways; perico scrambled eggs with onion, pepper, and tomato make a familiar breakfast filling.',
    needId: 'griddle', needLabel: 'Heavy griddle or skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'griddle over medium',
    rationale: 'A heavy griddle develops a deep golden shell before the thick arepas finish through in the oven.',
    heroAltText: 'Golden Venezuelan arepas split and filled with soft perico scrambled eggs, tomato, pepper, onion, and cilantro.',
    imageBrief: 'Six thick round Venezuelan arepas with deep golden griddled crusts, split as pockets and generously filled with moist perico egg curds showing reduced tomato, onion, pepper and cilantro; optional queso fresco.',
  }),
  BR082: spec({
    costTier: '$$', difficulty: 'Advanced', place: places.peru,
    historyLead: 'Peruvian tamales vary by region; this criollo breakfast form wraps seasoned corn masa, chicken, egg, olive, and peanuts in softened banana leaves.',
    needId: 'steamer-pot', needLabel: 'Deep covered pot or Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 3, phrase: 'steamer over simmering water',
    rationale: 'A deep covered pot holds upright leaf packets above a stable simmer for the long steam without crowding or boiling dry.',
    heroAltText: 'Peruvian banana-leaf tamal opened to show seasoned masa, chicken, egg, olive, and peanuts, with salsa criolla.',
    imageBrief: 'One warm rectangular Peruvian tamal partly opened in glossy banana leaf, masa cleanly released and cut to show shredded chicken, an egg wedge, dark olive and peanuts; bright drained salsa criolla beside it.',
  }),
  BR083: spec({
    costTier: '$', place: places.elSalvador,
    historyLead: 'Casamiento is the Salvadoran union of rice and beans, often made with red silk beans and served as part of a breakfast plate.',
    needId: 'skillet', needLabel: 'Wide heavy skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 0, phrase: 'wide skillet',
    rationale: 'A broad skillet lets the cold rice and beans reheat safely and crisp in spots while only a minority of beans become the binder.',
    heroAltText: 'Salvadoran casamiento with red beans and rice, soft scrambled eggs, crema, cheese, tortillas, and plantain.',
    imageBrief: 'Salvadoran casamiento with rice evenly stained by red silk beans, most beans intact and a few creamy, with lightly crisp spots; soft scrambled eggs kept separate, crema, fresh cheese and tortillas alongside.',
  }),
  BR084: spec({
    costTier: '$', place: places.southAfrica,
    historyLead: 'Soft mealie pap is a South African white-maize porridge served in several contexts; tomato smoor and eggs make a transparent composed breakfast.',
    needId: 'pot', needLabel: 'Heavy covered pot or Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'into the pot',
    rationale: 'A heavy covered pot moderates the long maize cook and supports frequent scraping until the raw grit is gone.',
    heroAltText: 'Soft South African mealie pap with concentrated tomato smoor and crisp-edged fried eggs.',
    imageBrief: 'South African soft white mealie pap flowing slowly in a bowl, shallow well filled with glossy concentrated red tomato-onion smoor, topped at service with crisp-edged fried eggs; no stiff carved porridge.',
  }),
  BR085: spec({
    costTier: '$', difficulty: 'Moderate', place: places.ethiopia,
    historyLead: 'Chechebsa, also called kita firfir, is an Ethiopian breakfast of torn wheat flatbread coated with spiced butter and berbere, distinct from injera-based firfir.',
    needId: 'skillet', needLabel: 'Heavy skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 2, phrase: 'lightly oiled skillet',
    rationale: 'A heavy skillet cooks the thin kita evenly, then provides the low-heat surface for coating and lightly crisping its torn edges.',
    heroAltText: 'Ethiopian chechebsa with irregular torn kita coated in glossy red berbere butter and cool yogurt.',
    imageBrief: 'Ethiopian chechebsa as irregular bite-size pieces of thin brown-spotted kita, every piece glossy orange-red with berbere spiced butter and some lightly crisp edges; plain cool yogurt in a separate bowl.',
  }),
  BR086: spec({
    costTier: '$', difficulty: 'Advanced', place: places.morocco,
    historyLead: 'Msemen is a Moroccan laminated square flatbread built by stretching elastic dough nearly translucent, folding it with fat and semolina, resting, and griddling.',
    needId: 'griddle', needLabel: 'Heavy griddle or skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 3, phrase: 'heavy griddle',
    rationale: 'A heavy griddle supplies stable contact heat while repeated turns cook the many folded layers without burning the butter.',
    heroAltText: 'Square Moroccan msemen with crisp golden spots, visible laminated layers, and a light butter-honey glaze.',
    imageBrief: 'Stack of square Moroccan msemen, thin and irregular with crisp golden-brown spots and visibly separated laminated edges, one torn open; only a light warm butter-honey sheen, not syrup-soaked.',
  }),
  BR087: spec({
    costTier: '$', difficulty: 'Advanced', place: places.nigeria,
    historyLead: 'Akara and fermented corn pap form a familiar Nigerian breakfast pairing; texture depends on peeled, well-drained beans, minimal blending water, and controlled frying.',
    needId: 'thermometer', needLabel: 'Clip-on frying thermometer', reviewCategoryId: 'clip-on-frying-thermometer', instructionIndex: 2, phrase: 'oil to 350°F',
    rationale: 'A clip-on thermometer keeps the oil in the narrow range that lets aerated bean batter float, brown, and cook through without greasiness.',
    heroAltText: 'Deep-golden Nigerian akara fritters with airy centers beside smooth glossy fermented-corn pap.',
    imageBrief: 'Nigerian breakfast with several round irregular deep-golden akara, one split to show an airy fully cooked black-eyed-pea interior, beside a bowl of smooth glossy ogi pap loosened with evaporated milk; no raw dense centers.',
  }),
  BR088: spec({
    costTier: '$$', difficulty: 'Moderate', place: places.australia,
    historyLead: 'Avocado toast became an emblem of Australian café breakfast through a technique-first combination of deeply toasted bread, seasoned avocado, and carefully cooked eggs.',
    needId: 'strainer', needLabel: 'Fine-mesh strainer', reviewCategoryId: 'fine-mesh-strainer', instructionIndex: 2, phrase: 'fine-mesh sieve',
    rationale: 'A fine mesh sheds loose watery white before poaching, producing a neater set egg without aggressive swirling.',
    heroAltText: 'Deeply toasted sourdough with rough-crushed avocado and neatly poached soft-yolk eggs.',
    imageBrief: 'Australian cafe-style avocado toast on deeply browned thick sourdough, rough seasoned avocado with visible pieces spread edge to edge, topped with neatly poached eggs whose whites are set and yolks soft; restrained herbs and chile.',
  }),
  BR089: spec({
    costTier: '$', difficulty: 'Easy', place: places.modern,
    historyLead: 'Overnight oats are a modern make-ahead breakfast derived from cold-soaked rolled oats; this formula stays distinct from apple-led Bircher muesli through berries and chia.',
    needId: 'bowl', needLabel: 'Large mixing bowl', reviewCategoryId: 'mixing-bowl', instructionIndex: 0, phrase: 'Stir in oats and chia',
    rationale: 'A roomy mixing bowl makes it easy to disperse chia and coat every oat before dividing the cold soak into containers.',
    heroAltText: 'Creamy berry-streaked overnight oats with visible rolled oats, fresh berries, and toasted almonds.',
    imageBrief: 'Modern overnight oats in simple lidded jars or bowls, creamy and spoonable with visible rolled oats and purple-red crushed-berry streaks, topped at service with fresh berries and toasted almonds; no apple or granola layers.',
  }),
  BR090: spec({
    costTier: '$', difficulty: 'Easy', place: places.modern,
    historyLead: 'The yogurt-granola parfait is a modern layered breakfast whose best texture depends on cluster-rich granola cooled fully and added only at service.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'parchment-lined sheet',
    rationale: 'A broad rimmed sheet lets pressed granola dry and brown evenly while preserving large clusters as it cools.',
    heroAltText: 'Layered yogurt parfait with lightly macerated berries and large crisp oat, almond, and seed granola clusters.',
    imageBrief: 'Clear breakfast glasses with two clean layers each of vanilla yogurt, mixed berries with minimal juice, and golden granola; largest oat-almond-pumpkin-seed clusters remain crisp on top, not soaked.',
  }),
  DE001: spec({
    costTier: '$', difficulty: 'Moderate', place: places.usa,
    historyLead: 'The American chocolate chip cookie traces to Ruth Wakefield and the Toll House tradition; this version targets reproducible chew through melted butter, brown sugar, an extra yolk, and chilled dough.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 2, phrase: 'two sheet pans',
    rationale: 'A sturdy light-colored sheet gives chilled dough even spread and browning while keeping portions widely separated.',
    heroAltText: 'Chewy chocolate chip cookies with lightly golden edges, soft centers, melted chocolate, and flaky salt.',
    imageBrief: 'American chocolate chip cookies just cooled, round with light-golden set edges, thick slightly soft centers and abundant irregular melted chocolate chips; one broken to show chewy interior, a few flaky-salt crystals.',
  }),
  DE002: spec({
    costTier: '$', difficulty: 'Moderate', place: places.usa,
    historyLead: 'Brownies are an American chocolate bar cookie; the fudgy form depends on a high-moisture cocoa batter, minimal flour development, careful doneness, and full cooling.',
    needId: 'baking-dish', needLabel: '8-inch square baking dish', reviewCategoryId: 'baking-dish', instructionIndex: 0, phrase: '8-inch square light-metal pan',
    rationale: 'A compact square pan gives the batter the intended depth and predictable edge-to-center doneness for moist fudgy crumbs.',
    heroAltText: 'Fudgy chocolate brownies with a thin crackled top, moist dense centers, and clean square cuts.',
    imageBrief: 'Nine American chocolate brownie squares with thin shiny crackled tops and clean edges, one lifted to show a dense moist fudgy center with chocolate chips; no raw batter, frosting, or cakey crumb.',
  }),
  DE003: spec({
    costTier: '$$', difficulty: 'Advanced', place: places.usa,
    historyLead: 'Double-crust apple pie is an American baking standard whose quality depends on cold flaky pastry, firm mixed apples, controlled juices, center bubbling, and a full cooling set.',
    needId: 'rolling-mat', needLabel: 'Measured pastry shaping mat', reviewCategoryId: 'shaping-mat', instructionIndex: 2, phrase: 'Roll one dough disk',
    rationale: 'A measured nonslip mat makes two consistent twelve-inch crust rounds easier to roll without warming or overworking the dough.',
    heroAltText: 'Classic double-crust apple pie with deep-golden flaky pastry and defined tender apple slices.',
    imageBrief: 'Nine-inch American double-crust apple pie with deeply golden flaky crimped pastry and five steam vents, one clean slice removed after cooling to show compact defined cinnamon apple slices and thickened juice; no lattice.',
  }),
  DE004: spec({
    costTier: '$', difficulty: 'Easy', place: places.usa,
    historyLead: 'Apple crisp is a simpler American baked fruit dessert than pie, pairing tender sliced apples with a loose oat-and-butter cluster topping.',
    needId: 'baking-dish', needLabel: '2-quart baking dish', reviewCategoryId: 'baking-dish', instructionIndex: 0, phrase: '2-quart baking dish',
    rationale: 'A two-quart dish gives the apples and loose topping the right depth for bubbling fruit beneath crisp browned clusters.',
    heroAltText: 'Warm cinnamon apple crisp with defined tender slices and deep-golden oat clusters.',
    imageBrief: 'Warm American apple crisp in a two-quart ceramic dish, deep-golden loose oat clusters above clearly sliced tender apples with thick bubbling cinnamon juice; one spooned portion and optional vanilla ice cream.',
  }),
  DE005: spec({
    costTier: '$$', difficulty: 'Advanced', place: places.usa,
    historyLead: 'New York-style cheesecake is known for a tall dense-creamy cream-cheese filling, graham crust, gentle bake, gradual cooling, and long cold set.',
    needId: 'springform-pan', needLabel: '9-inch springform pan', reviewCategoryId: '9-inch-springform-pan', instructionIndex: 0, phrase: '9-inch springform pan',
    rationale: 'A well-sealing nine-inch springform provides the necessary depth and removable sides for the tall chilled cake.',
    heroAltText: 'Tall New York-style cheesecake with smooth pale filling, graham crust, and a clean chilled slice.',
    imageBrief: 'Tall plain New York-style cheesecake on a cake stand, smooth pale ivory top without browning or cracks, compact graham crust and one clean chilled slice showing dense creamy texture; no fruit topping.',
  }),
};

function authorRecipe(manifestRecipe) {
  const task = manifestRecipe.researchTask;
  const value = specs[manifestRecipe.rosterId];
  if (!task || !value) throw new Error(`Missing reviewed authoring input for ${manifestRecipe.rosterId}.`);
  return {
    cookingReview: approved(`Reviewed against the batch evidence: ${task.existingResearch.nonNegotiableTechniques.join(' ')} The method preserves the defining texture, sequence, doneness, and safety cues while applying the documented household adaptation.`),
    reviewedAt: '2026-08-20', publication: sitePublished, costTier: value.costTier, difficulty: value.difficulty,
    ingredientReview: accept(...task.ingredients.map((_, position) => position)),
    commerce: reviewCategory(value.needId, value.reviewCategoryId, value.rationale, `Use a sturdy ${value.needLabel.toLowerCase()} already owned and follow the same heat, spacing, and doneness cues.`),
    equipmentNeeds: [{ id: value.needId, label: value.needLabel, reviewCategoryId: value.reviewCategoryId }],
    equipmentAnnotations: [{ instructionIndex: value.instructionIndex, phrase: value.phrase, needId: value.needId, focus: 'specialty' }],
    origin: value.place,
    history: {
      paragraphs: [value.historyLead, `${task.notes} This Kwilt version follows the reviewed household adaptation: ${task.existingResearch.adaptationDecision}`],
      sources: task.sources.slice(0, 2).map(({ title, publisher, url }) => ({ title, publisher, url })),
    },
    ...(publishedHeroImages[manifestRecipe.rosterId]
      ? { heroImage: publishedImage(publishedHeroImages[manifestRecipe.rosterId], value.heroAltText) }
      : {}),
    heroAltText: value.heroAltText, imageBrief: value.imageBrief,
  };
}

const existingUpgrades = {
  BR073: {
    ingredientCount: 11, costTier: '$$', difficulty: 'Advanced',
    commerce: reviewCategory('sheet-pan', 'rimmed-half-sheet', 'A preheated heavy sheet pan provides the hot rigid launch surface that browns the boat-shaped dough before the egg is added.', 'Preheat the heaviest rimmed sheet already owned and transfer the shaped boats on parchment.'),
    equipmentNeeds: [{ id: 'sheet-pan', label: 'Heavy rimmed sheet pan', reviewCategoryId: 'rimmed-half-sheet' }],
    equipmentAnnotations: [{ instructionIndex: 1, phrase: 'heavy sheet pan', needId: 'sheet-pan', focus: 'specialty' }],
  },
  BR078: {
    ingredientCount: 13, costTier: '$$', difficulty: 'Moderate',
    commerce: reviewCategory('skillet', 'cast-iron-skillet', 'A broad heavy skillet softens the aromatics and gives the delicate ackee room to heat with only a few folds.', 'Use a broad sturdy skillet already owned and fold the ackee only enough to heat it through.'),
    equipmentNeeds: [{ id: 'skillet', label: 'Wide heavy skillet', reviewCategoryId: 'cast-iron-skillet' }],
    equipmentAnnotations: [{ instructionIndex: 1, phrase: 'wide skillet', needId: 'skillet', focus: 'specialty' }],
  },
};

function authorExisting(record, manifestRecipe) {
  const upgrade = existingUpgrades[manifestRecipe.rosterId];
  return {
    cookingReview: approved('Previously reviewed and published; retained without downgrading its cooking, ingredient, origin, history, equipment, commerce, image, or publication evidence.'),
    reviewedAt: record.review.reviewedAt,
    publication: record.publication ?? sitePublished,
    costTier: record.costTier ?? upgrade.costTier,
    difficulty: record.difficulty ?? upgrade.difficulty,
    ingredientReview: accept(...Array.from({ length: record.structuredIngredients?.length ?? upgrade.ingredientCount }, (_, position) => position)),
    commerce: record.commerce ?? upgrade.commerce,
    equipmentNeeds: record.equipmentNeeds?.length ? record.equipmentNeeds : upgrade.equipmentNeeds,
    equipmentAnnotations: record.equipmentAnnotations?.length ? record.equipmentAnnotations : upgrade.equipmentAnnotations,
    origin: record.origin,
    history: record.history,
    heroImage: record.heroImage,
    heroAltText: record.heroImage.altText,
    imageBrief: record.heroImage.altText,
  };
}

const existingById = new Map(seed.recipes.map((record) => [record.rosterId, record]));
export default Object.fromEntries(manifest.recipes.map((recipe) => [
  recipe.rosterId,
  recipe.researchTask ? authorRecipe(recipe) : authorExisting(existingById.get(recipe.rosterId), recipe),
]));
