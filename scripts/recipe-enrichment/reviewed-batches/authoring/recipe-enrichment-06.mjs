import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-06.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({
  decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative,
});
const sitePublished = { publishedAt: '2026-08-21T05:00:00.000Z' };
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const mediaRoot = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media';
const publishedHeroImages = {
  DE006: `${mediaRoot}/catalog/de006/kwilt-recipe-hero-v2/2af63b0205a19690-94274fcb26c05fb6/candidate-0.webp`,
  DE007: `${mediaRoot}/catalog/de007/kwilt-recipe-hero-v2/cce120ed55c9f7af-c67572af767aa556/candidate-0.webp`,
  DE008: `${mediaRoot}/catalog/de008/kwilt-recipe-hero-v2/1630da060d566730-3f3f8992511cf864/candidate-1.webp`,
  DE009: `${mediaRoot}/catalog/de009/kwilt-recipe-hero-v2/f09ff270f54cbbae-fd928e150740cd38/candidate-0.webp`,
  DE010: `${mediaRoot}/catalog/de010/kwilt-recipe-hero-v2/3d2a7c3690aa7eb1-7c704c3f428c746a/candidate-1.webp`,
  DE011: `${mediaRoot}/catalog/de011/kwilt-recipe-hero-v2/7a63dbb57900513e-a3261b62d1fe1e1d/candidate-0.webp`,
  DE012: `${mediaRoot}/catalog/de012/kwilt-recipe-hero-v2/19220a29e93c153e-b9e91c3c670dd0e3/candidate-1.webp`,
  DE013: `${mediaRoot}/catalog/de013/kwilt-recipe-hero-v2/0f14955a9b0948df-d397912684ec9da0/candidate-1.webp`,
  DE014: `${mediaRoot}/catalog/de014/kwilt-recipe-hero-v2/e5531ffe9ffaf89d-6059f01a10231e9b/candidate-0.webp`,
  DE015: `${mediaRoot}/catalog/de015/kwilt-recipe-hero-v2/c9583d481c03eba9-2f6d3640221164c0/candidate-1.webp`,
  DE016: `${mediaRoot}/catalog/de016/kwilt-recipe-hero-v2/6520da472fad1141-fc1f46ada370a07b/candidate-2.webp`,
  DE017: `${mediaRoot}/catalog/de017/kwilt-recipe-hero-v2/7cc46e49a0597b1a-2048f5a0e676d413/candidate-1.webp`,
  DE018: `${mediaRoot}/catalog/de018/kwilt-recipe-hero-v2/da1262a162f95c42-d8db79c24892fa32/candidate-0.webp`,
  DE019: `${mediaRoot}/catalog/de019/kwilt-recipe-hero-v2/470bd85daa887f94-9d6242f3f205691f/candidate-1.webp`,
  DE020: `${mediaRoot}/catalog/de020/kwilt-recipe-hero-v2/8793ab3aa385df0b-71d6a02d225bd5c8/candidate-0.webp`,
  DE021: `${mediaRoot}/catalog/de021/kwilt-recipe-hero-v2/af82f9cb3c1621e2-72f620b0983c5a57/candidate-1.webp`,
  DE022: `${mediaRoot}/catalog/de022/kwilt-recipe-hero-v2/f1551a9069db8591-a4204135b3a2d11c/candidate-0.webp`,
  DE023: `${mediaRoot}/catalog/de023/kwilt-recipe-hero-v2/bf23127ef818c3d9-fcd6c46cf24a6a14/candidate-0.webp`,
  DE024: `${mediaRoot}/catalog/de024/kwilt-recipe-hero-v2/00ce3fd4a44eae7c-4e81a5e586742d95/candidate-0.webp`,
  DE025: `${mediaRoot}/catalog/de025/kwilt-recipe-hero-v2/fc4331969f27c1a9-3e56176a1dfaf1b2/candidate-1.webp`,
  DE026: `${mediaRoot}/catalog/de026/kwilt-recipe-hero-v2/cdf49a6d9456f981-9ecc39007c007365/candidate-0.webp`,
  DE027: `${mediaRoot}/catalog/de027/kwilt-recipe-hero-v2/6ad86300859e305c-6864f350add15747/candidate-0.webp`,
  DE028: `${mediaRoot}/catalog/de028/kwilt-recipe-hero-v2/b3896c37a5e4e4dd-16551d34006384db/candidate-1.webp`,
  DE029: `${mediaRoot}/catalog/de029/kwilt-recipe-hero-v2/131c53fcb023a5aa-95b5ff57c262ecea/candidate-1.webp`,
  DE030: `${mediaRoot}/catalog/de030/kwilt-recipe-hero-v2/41ff906dc5830e88-6409dbdc35868852/candidate-1.webp`,
};
const origin = (label, region, latitude, longitude, countryIds, scale = 650) => ({
  label,
  region,
  markers: [{ label, latitude, longitude }],
  map: {
    center: [longitude, latitude],
    scale,
    highlightedCountryIds: Array.isArray(countryIds) ? countryIds : [countryIds],
  },
});

const places = {
  usa: origin('United States', 'American baking and dessert traditions', 39.8283, -98.5795, '840', 430),
  south: origin('American South', 'Southern American dessert traditions', 33.749, -84.388, '840', 610),
  jamaicanSouth: origin('Jamaica and the American South', 'Jamaican-to-Southern cake traditions', 25.0, -80.0, ['388', '840'], 520),
  newOrleans: origin('New Orleans, Louisiana', 'New Orleans dessert traditions', 29.9511, -90.0715, '840', 820),
  italy: origin('Italy', 'Italian dessert traditions', 41.8719, 12.5674, '380', 650),
  piedmont: origin('Piedmont, Italy', 'Piedmontese cream-dessert traditions', 45.0522, 7.5154, '380', 860),
  sicily: origin('Sicily, Italy', 'Sicilian pastry traditions', 37.5994, 14.0154, '380', 820),
};

const spec = (value) => ({ costTier: '$$', difficulty: 'Moderate', ...value });
const specs = {
  DE006: spec({
    difficulty: 'Advanced', place: places.usa,
    historyLead: 'American chocolate layer cake developed through nineteenth- and twentieth-century access to cocoa, chemical leaveners, and dependable home ovens; the moist devil’s-food family emphasizes a tender dark crumb and generous frosting.',
    needId: 'cake-pans', needLabel: 'Two 9-inch round cake pans', reviewCategoryId: '9-inch-round-cake-pans', instructionIndex: 0, phrase: 'two 9-inch round pans',
    rationale: 'A matched pair of light-colored nine-inch pans lets both thin cocoa batters bake at the same rate and produces layers with matching height and browning.',
    heroAltText: 'Two-layer dark chocolate cake with plush chocolate frosting and a moist tender slice.',
    imageBrief: 'American two-layer chocolate celebration cake with dark even layers, generous softly swirled chocolate buttercream, a clean slice showing moist tender crumb, no ganache drip or elaborate decoration.',
  }),
  DE007: spec({
    difficulty: 'Advanced', place: places.usa,
    historyLead: 'The frosted layer cake became an American birthday ritual as refined flour, baking powder, household ovens, and packaged decorations made tall celebration cakes practical in home kitchens.',
    needId: 'cake-pans', needLabel: 'Two 9-inch round cake pans', reviewCategoryId: '9-inch-round-cake-pans', instructionIndex: 0, phrase: 'two 9-inch round pans',
    rationale: 'Two matching pans protect the reverse-creamed batter’s fine crumb by baking both layers evenly and eliminating the need to hold half the batter while one pan bakes.',
    heroAltText: 'Tall vanilla birthday cake with fine pale crumb, fluffy chocolate frosting, and rainbow sprinkles.',
    imageBrief: 'Cheerful American two-layer vanilla birthday cake, pale fine-grained layers under fluffy chocolate frosting, restrained rainbow sprinkles, one clean slice, no fondant or oversized decoration.',
  }),
  DE008: spec({
    place: places.usa,
    historyLead: 'Carrot-sweetened puddings and cakes have older European roots, while the oil-moistened spiced carrot cake with cream cheese frosting became a particularly familiar American dessert in the twentieth century.',
    needId: 'baking-pan', needLabel: '9-by-13-inch metal baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '9-by-13-inch metal pan',
    rationale: 'The standard metal footprint gives the carrot-rich batter an even shallow depth, predictable center doneness, and clean square portions without a layer-cake build.',
    heroAltText: 'Moist carrot sheet cake with cream cheese frosting, toasted walnuts, and visible fine carrot crumb.',
    imageBrief: 'American carrot sheet cake cut into neat squares, warmly spiced moist crumb with fine carrot and walnuts, thick tangy cream cheese frosting and a few toasted walnuts, no piped carrots.',
  }),
  DE009: spec({
    place: places.south,
    historyLead: 'Red velvet cake is closely associated with American baking and the South, where a lightly cocoa-flavored buttermilk cake, vivid red crumb, and tangy cream cheese frosting became its modern recognizable form.',
    needId: 'baking-pan', needLabel: '9-by-13-inch metal baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '9-by-13-inch metal pan',
    rationale: 'A light metal pan provides the even heat and standard depth needed for a soft crimson sheet cake without darkening its delicate edges too quickly.',
    heroAltText: 'Crimson red velvet sheet cake with soft cocoa-buttermilk crumb and cream cheese frosting.',
    imageBrief: 'Southern-style red velvet sheet cake in clean squares, vivid but believable crimson fine crumb, generous white cream cheese frosting in broad swirls, no chocolate chips or heavy decoration.',
  }),
  DE010: spec({
    costTier: '$', place: places.usa,
    historyLead: 'The modern American lemon bar pairs a pressed shortbread base with a bright baked lemon-and-egg custard, creating a portable two-layer dessert that became common in home baking and community cookbooks.',
    needId: 'baking-pan', needLabel: '9-by-13-inch metal baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '9-by-13-inch metal pan',
    rationale: 'The exact pan area keeps shortbread and custard at their intended thickness so the base crisps before the lemon layer sets without overbaking.',
    heroAltText: 'Chilled lemon bars with bright custard, compact shortbread, clean edges, and light confectioners sugar.',
    imageBrief: 'American lemon bars cut into tidy rectangles, bright yellow smooth custard over compact pale-golden shortbread, light powdered sugar just applied, one bar lifted to show two distinct layers.',
  }),
  DE011: spec({
    costTier: '$', difficulty: 'Easy', place: places.usa,
    historyLead: 'Peanut butter cookies became an American home-baking staple in the early twentieth century; their fork crosshatch is both a familiar visual marker and a practical way to flatten dense dough for even baking.',
    needId: 'sheet-pans', needLabel: 'Rimmed sheet pans', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 1, phrase: 'two sheet pans',
    rationale: 'Two sturdy light-colored sheets give the sugar-coated portions room to spread and make it possible to cool one batch safely while the next bakes.',
    heroAltText: 'Soft peanut butter cookies with golden edges, fork crosshatches, and delicate sugar crusts.',
    imageBrief: 'Classic American peanut butter cookies with shallow fork crosshatches, lightly golden set edges, soft centers and fine sugar crust; one broken to show tender crumb, no chocolate or jam.',
  }),
  DE012: spec({
    costTier: '$', difficulty: 'Easy', place: places.usa,
    historyLead: 'Oatmeal raisin cookies grew from American oat-baking traditions into a familiar lunchbox and household cookie, prized for chewy rolled oats, warm spice, and fruit that remains tender after baking.',
    needId: 'sheet-pans', needLabel: 'Rimmed sheet pans', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 1, phrase: 'line two pans',
    rationale: 'Wide light-colored sheets provide predictable spread and browned edges while the hydrated oat centers stay chewy rather than drying at the perimeter.',
    heroAltText: 'Chewy oatmeal raisin cookies with visible rolled oats, plump raisins, and golden edges.',
    imageBrief: 'American oatmeal raisin cookies, rustic round shapes with visible rolled oats and plump raisins, golden edges and soft chewy centers; warm cinnamon tone, no frosting or chocolate.',
  }),
  DE013: spec({
    costTier: '$', difficulty: 'Easy', place: places.usa,
    historyLead: 'Snickerdoodles are a longstanding American sugar cookie distinguished by cream of tartar and a cinnamon-sugar coating, which together create their gentle tang, crackled surface, and familiar aroma.',
    needId: 'sheet-pans', needLabel: 'Rimmed sheet pans', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 1, phrase: 'line two pans',
    rationale: 'A rigid light sheet supports even puffing and the brief bake needed to set cinnamon-coated edges while leaving the centers soft and chewy.',
    heroAltText: 'Chewy snickerdoodles with cinnamon-sugar crusts, puffed crackled tops, and soft centers.',
    imageBrief: 'Classic American snickerdoodles with warm cinnamon-sugar coating, puffed crackled tops, set pale-golden edges and visibly soft centers; one broken open, no glaze or fillings.',
  }),
  DE014: spec({
    difficulty: 'Advanced', place: places.south,
    historyLead: 'Pecan pie is strongly associated with the American South, where native pecans meet a sweet egg custard in flaky pastry; twentieth-century corn-syrup recipes helped establish its familiar holiday form.',
    needId: 'pie-pan', needLabel: '9-inch pie pan', reviewCategoryId: '9-inch-pie-pan', instructionIndex: 0, phrase: '9-inch pie plate',
    rationale: 'A nine-inch metal plate provides the intended crust angle and filling depth so the pecan custard sets at the center before the rim becomes too dark.',
    heroAltText: 'Southern pecan pie with toasted pecans, glossy set custard, flaky crust, and a clean slice.',
    imageBrief: 'Nine-inch Southern pecan pie with a deeply golden crimped crust, neat toasted pecan pattern and glossy fully set amber custard, one slice removed after cooling, no whipped topping.',
  }),
  DE015: spec({
    costTier: '$', difficulty: 'Advanced', place: places.usa,
    historyLead: 'Pumpkin pie is an American custard-pie tradition deeply connected with autumn and Thanksgiving, combining smooth pumpkin, warm spices, evaporated milk, and pastry in a reliable holiday centerpiece.',
    needId: 'pie-pan', needLabel: '9-inch deep pie pan', reviewCategoryId: '9-inch-pie-pan', instructionIndex: 0, phrase: '9-inch deep pie plate',
    rationale: 'A nine-inch metal pie plate with sufficient depth contains the generous custard and conducts heat into the bottom crust while the center reaches a gentle set.',
    heroAltText: 'Classic pumpkin pie with smooth spiced custard, golden crimped crust, and a clean chilled slice.',
    imageBrief: 'Classic American pumpkin pie with smooth matte orange custard, no cracks, deeply golden high-crimped crust and one clean cooled slice; optional small whipped-cream spoon beside, not covering pie.',
  }),
  DE016: spec({
    costTier: '$', place: places.south,
    historyLead: 'Cobbler names a varied American family of baked fruit desserts; this Southern-style peach version leaves ripe fruit visible beneath rough buttermilk biscuit mounds with crisp, juice-touched edges.',
    needId: 'baking-dish', needLabel: '2-quart baking dish', reviewCategoryId: 'baking-dish', instructionIndex: 0, phrase: '2-quart baking dish',
    rationale: 'A two-quart dish gives the peaches enough depth to stay juicy while exposing the dropped biscuits to browning heat and vigorous bubbling at their edges.',
    heroAltText: 'Southern peach cobbler with bubbling defined fruit and deeply golden drop-biscuit topping.',
    imageBrief: 'Southern peach cobbler in a two-quart dish, ripe defined peach wedges bubbling through gaps between eight rough deep-golden biscuit mounds, one warm spooned serving, no cake-batter blanket.',
  }),
  DE017: spec({
    costTier: '$', place: places.south,
    historyLead: 'Southern banana pudding layers cooked vanilla custard, sliced bananas, and vanilla wafers that soften into tender cake-like bites; chilled versions commonly finish with softly whipped cream.',
    needId: 'saucepan', needLabel: 'Medium saucepan', reviewCategoryId: 'medium-saucepan', instructionIndex: 0, phrase: 'in a saucepan',
    rationale: 'A stable medium saucepan gives the milk custard enough depth for constant whisking and controlled bubbling without scorching in the corners.',
    heroAltText: 'Chilled Southern banana pudding layered with vanilla custard, bananas, softened wafers, and whipped cream.',
    imageBrief: 'Southern banana pudding in a clear serving dish showing distinct vanilla custard, ripe banana and softened vanilla-wafer layers, topped with soft whipped cream and a few intact wafers, no browned bananas.',
  }),
  DE018: spec({
    place: places.jamaicanSouth,
    historyLead: 'Hummingbird cake traveled from a Jamaican tourism recipe known as Doctor Bird cake into the American South, where a 1978 Southern Living submission helped make its banana-pineapple-pecan form famous.',
    needId: 'baking-pan', needLabel: '9-by-13-inch metal baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '9-by-13-inch metal pan',
    rationale: 'A standard metal pan preserves the moist fruit-and-oil crumb at an even sheet-cake depth while avoiding the burden and excess frosting of a three-layer build.',
    heroAltText: 'Hummingbird sheet cake with moist banana-pineapple crumb, pecans, and cream cheese frosting.',
    imageBrief: 'Hummingbird sheet cake in clean squares, visibly moist banana-pineapple crumb flecked with pecans beneath tangy cream cheese frosting and toasted pecans; no pineapple rings or tropical props.',
  }),
  DE019: spec({
    place: places.newOrleans,
    historyLead: 'Bread pudding began as a practical way to reclaim stale bread and became a beloved New Orleans restaurant dessert, where warm custard-soaked French bread is often paired with whiskey or bourbon sauce.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '9-by-13-inch baking dish',
    rationale: 'The standard nine-by-thirteen footprint holds an even layer of fully soaked bread, giving the center time to set while exposed cubes and pecans turn golden.',
    heroAltText: 'Warm New Orleans bread pudding with golden bread edges, raisins, pecans, and bourbon sauce.',
    imageBrief: 'New Orleans bread pudding with puffed golden irregular bread cubes, moist set custard, visible raisins and pecans, one warm square with a restrained glossy bourbon sauce drizzle, no soggy pool.',
  }),
  DE020: spec({
    costTier: '$', difficulty: 'Advanced', place: places.newOrleans,
    historyLead: 'Although beignet is a broad French word for fritter, the square yeast-raised beignet covered in confectioners’ sugar is a specific icon of New Orleans café culture and immediate hot service.',
    needId: 'thermometer', needLabel: 'Clip-on frying thermometer', reviewCategoryId: 'clip-on-frying-thermometer', instructionIndex: 2, phrase: 'clip on a thermometer',
    rationale: 'A clip-on thermometer continuously shows whether a crowded batch has pulled the oil below the narrow range needed for airy interiors and nongreasy golden crusts.',
    heroAltText: 'Hot square New Orleans beignets, deeply puffed and generously covered with confectioners sugar.',
    imageBrief: 'New Orleans cafe-style beignets, irregular square pillows freshly fried to deep gold and visibly hollow-airy where one is torn, covered generously in powdered sugar; coffee alongside, no filling or glaze.',
  }),
  DE021: spec({
    costTier: '$', place: places.usa,
    historyLead: 'American strawberry shortcake traditionally pairs lightly sweet biscuit-style shortcakes with ripe macerated berries and whipped cream, preserving the contrast between crumbly bread, fruit juice, and cool dairy.',
    needId: 'sheet-pan', needLabel: 'Rimmed sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'line a pan',
    rationale: 'A sturdy light-colored sheet supports close-set biscuits through their high-heat rise and gives their butter-rich bottoms even browning without scorching.',
    heroAltText: 'Biscuit-style strawberry shortcakes layered with juicy berries and softly whipped cream.',
    imageBrief: 'American strawberry shortcake as individual split tall flaky biscuits, layered only at service with ripe glossy sliced strawberries and soft whipped cream; visible crisp edges, no sponge cake.',
  }),
  DE022: spec({
    costTier: '$', difficulty: 'Easy', place: places.usa,
    historyLead: 'Jordan Marsh department-store blueberry muffins became a celebrated New England and American baking reference, recognized for abundant berries, a tender crumb, and a crunchy sugar crown.',
    needId: 'muffin-pan', needLabel: '12-cup muffin pan', reviewCategoryId: '12-cup-muffin-pan', instructionIndex: 0, phrase: '12-cup muffin pan',
    rationale: 'A rigid standard twelve-cup pan keeps the generous batter portions upright so the berry-heavy muffins dome and brown consistently across the batch.',
    heroAltText: 'Domed blueberry muffins with crunchy sugar tops, tender crumb, and abundant berry pockets.',
    imageBrief: 'Twelve Jordan Marsh-style blueberry muffins with high golden domes and sparkling crunchy sugar caps, one split to show tender pale crumb heavily streaked and pocketed with blueberries, no glaze.',
  }),
  DE023: spec({
    difficulty: 'Advanced', place: places.usa,
    historyLead: 'Cinnamon rolls are familiar American bakery and weekend-breakfast comfort; this version uses tangzhong, a cooked flour-and-milk paste, to hold extra water and keep the enriched spiral bread unusually soft.',
    needId: 'baking-pan', needLabel: '9-by-13-inch metal baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 3, phrase: '9-by-13-inch pan',
    rationale: 'The exact pan footprint lets twelve rolls proof until touching, which supports tall soft sides while the metal base bakes the enriched centers through.',
    heroAltText: 'Twelve soft cinnamon rolls with gooey brown-sugar spirals and warm cream cheese glaze.',
    imageBrief: 'Twelve tall touching American cinnamon rolls in a nine-by-thirteen pan, plush tangzhong-soft interiors and distinct dark cinnamon spirals, thick cream cheese glaze melting lightly over warm tops.',
  }),
  DE024: spec({
    costTier: '$', place: places.usa,
    historyLead: 'Rice pudding appears across many cultures; this familiar American stovetop expression is dairy-rich, vanilla-forward, and cinnamon-scented, with short grains releasing starch into a loose creamy base.',
    needId: 'saucepan', needLabel: 'Heavy medium saucepan', reviewCategoryId: 'medium-saucepan', instructionIndex: 0, phrase: 'in a heavy saucepan',
    rationale: 'A heavy-bottomed saucepan moderates the long dairy simmer and gives frequent stirring enough room to prevent milk and starch from scorching at the base.',
    heroAltText: 'Loose creamy vanilla rice pudding with plump grains and a restrained cinnamon finish.',
    imageBrief: 'American-style rice pudding in a shallow bowl, loose and glossy with distinct plump short grains, vanilla-speckled cream and a restrained cinnamon dusting; spoon trail slowly filling, never stiff or dry.',
  }),
  DE025: spec({
    difficulty: 'Advanced', place: places.usa,
    historyLead: 'French-style custard ice cream became a foundation of American ice-cream making; vanilla exposes its balance most clearly because dairy texture, yolk emulsification, and true vanilla aroma have nowhere to hide.',
    needId: 'ice-cream-maker', needLabel: '1.5-quart ice-cream maker', reviewCategoryId: 'ice-cream-maker', instructionIndex: 0, phrase: 'ice-cream-machine bowl',
    rationale: 'A dedicated churning machine freezes the cooled custard while incorporating controlled air, producing small ice crystals and the silky scoopable texture the recipe promises.',
    heroAltText: 'Silky vanilla bean ice cream with smooth scoops and visible vanilla seeds.',
    imageBrief: 'Three smooth dense scoops of pale ivory vanilla bean ice cream with fine real vanilla seeds and softly melting edges in a chilled bowl; no mix-ins, toppings or artificially white frozen blocks.',
  }),
  DE026: spec({
    difficulty: 'Advanced', place: places.italy,
    historyLead: 'Tiramisù is Italy’s coffee-and-mascarpone layered dessert, though accounts of its exact twentieth-century birthplace differ; its name is commonly understood as an energizing “pick me up.”',
    needId: 'heatproof-bowl', needLabel: 'Large heatproof mixing bowl', reviewCategoryId: 'mixing-bowl', instructionIndex: 0, phrase: 'heatproof bowl',
    rationale: 'A roomy heatproof bowl sits safely over barely simmering water and lets the yolk foam be whisked continuously to a verified safe temperature without trapping excessive heat.',
    heroAltText: 'Classic tiramisu with espresso-soaked ladyfingers, mascarpone cream, and dark cocoa layers.',
    imageBrief: 'Classic Italian tiramisu in a simple rectangular dish, clean spooned or sliced portion showing cohesive espresso-darkened savoiardi and airy mascarpone cream layers, generous fresh cocoa, no decorative cake piping.',
  }),
  DE027: spec({
    place: places.piedmont,
    historyLead: 'Panna cotta, literally cooked cream, is associated with Piedmont in northern Italy; its defining success is a softly set vanilla cream that visibly trembles rather than bouncing like firm gelatin.',
    needId: 'bowl', needLabel: 'Wide mixing bowl', reviewCategoryId: 'mixing-bowl', instructionIndex: 0, phrase: 'wide bowl',
    rationale: 'A wide bowl spreads the cold milk into a shallow layer so powdered gelatin hydrates evenly instead of forming stubborn dry clumps before hot cream is added.',
    heroAltText: 'Silky vanilla panna cotta with a delicate tremble, vanilla seeds, and fresh berries.',
    imageBrief: 'Piedmontese panna cotta unmolded as a smooth ivory low dome with visible vanilla seeds and a believable delicate sag, a few fresh berries beside it, no opaque gelatin cube or heavy sauce.',
  }),
  DE028: spec({
    difficulty: 'Advanced', place: places.sicily,
    historyLead: 'Cannoli originated in Sicily and became associated with Carnival before spreading into year-round Italian pastry culture; their identity rests on brittle blistered shells filled only at service with sweet ricotta.',
    needId: 'cannoli-forms', needLabel: 'Metal cannoli forms', reviewCategoryId: 'cannoli-forms', instructionIndex: 1, phrase: 'metal cannoli tube',
    rationale: 'Purpose-made stainless tubes hold very thin dough open in hot oil, creating the cylindrical blistered shell and allowing safe release after brief cooling.',
    heroAltText: 'Sicilian cannoli with blistered crisp shells, smooth ricotta filling, chocolate, orange, and pistachio.',
    imageBrief: 'Six Sicilian cannoli filled immediately before serving, thin deeply blistered golden shells with open crisp ends, smooth white ricotta dotted with mini chocolate, orange zest and pistachio only at ends.',
  }),
  DE029: spec({
    place: places.italy,
    historyLead: 'Olive oil cakes appear in several Mediterranean traditions and vary across Italy; this Italian-style citrus version treats fruity extra-virgin olive oil as both the baking fat and a central flavor.',
    needId: 'springform-pan', needLabel: '9-inch springform pan', reviewCategoryId: '9-inch-springform-pan', instructionIndex: 0, phrase: '9-inch springform',
    rationale: 'A nine-inch springform gives the olive-oil batter its intended depth while the removable band protects the crisp sugared edge during unmolding.',
    heroAltText: 'Golden citrus olive oil cake with a moist fine crumb, crisp sugared edge, and orange and lemon zest.',
    imageBrief: 'Simple Italian-style citrus olive oil cake, deeply golden low round with a lightly crystalline sugared edge, one wedge showing moist fine yellow crumb flecked with orange and lemon zest, no frosting.',
  }),
  DE030: spec({
    difficulty: 'Easy', place: places.italy,
    historyLead: 'Affogato means drowned in Italian: a scoop of gelato is drowned with hot espresso so the first spoonfuls contrast bitter coffee, cold sweet cream, and a quickly forming bittersweet melt.',
    needId: 'espresso-machine', needLabel: 'Espresso machine', reviewCategoryId: 'espresso-machine', instructionIndex: 1, phrase: 'Brew four double shots of espresso',
    rationale: 'A true espresso machine produces the small, concentrated hot double shot that coats gelato without flooding it with the larger volume of ordinary brewed coffee.',
    heroAltText: 'Hot espresso being poured over firm vanilla gelato for a classic Italian affogato.',
    imageBrief: 'Italian affogato at the moment a small dark double espresso is poured over two firm vanilla gelato scoops in a chilled glass, edges just beginning to melt; no oversized coffee volume or elaborate toppings.',
  }),
};

function authorRecipe(manifestRecipe) {
  const task = manifestRecipe.researchTask;
  const value = specs[manifestRecipe.rosterId];
  if (!task || !value) throw new Error(`Missing reviewed authoring input for ${manifestRecipe.rosterId}.`);
  return {
    cookingReview: approved(`Reviewed against the batch evidence: ${task.existingResearch.nonNegotiableTechniques.join(' ')} The method preserves the defining texture, sequence, doneness, and safety cues while applying the documented household adaptation.`),
    reviewedAt: '2026-08-20',
    publication: sitePublished,
    costTier: value.costTier,
    difficulty: value.difficulty,
    ingredientReview: accept(...task.ingredients.map((_, position) => position)),
    commerce: reviewCategory(value.needId, value.reviewCategoryId, value.rationale, `Use a sound ${value.needLabel.toLowerCase()} already owned and follow the same preparation, heat, spacing, and doneness cues.`),
    equipmentNeeds: [{ id: value.needId, label: value.needLabel, reviewCategoryId: value.reviewCategoryId }],
    equipmentAnnotations: [{ instructionIndex: value.instructionIndex, phrase: value.phrase, needId: value.needId, focus: 'specialty' }],
    origin: value.place,
    history: {
      paragraphs: [value.historyLead, `${task.notes} This Kwilt version follows the reviewed household adaptation: ${task.existingResearch.adaptationDecision}`],
      sources: task.sources.slice(0, 2).map(({ title, publisher, url }) => ({ title, publisher, url })),
    },
    heroImage: publishedImage(publishedHeroImages[manifestRecipe.rosterId], value.heroAltText),
    heroAltText: value.heroAltText,
    imageBrief: value.imageBrief,
  };
}

export default Object.fromEntries(manifest.recipes.map((recipe) => [recipe.rosterId, authorRecipe(recipe)]));
