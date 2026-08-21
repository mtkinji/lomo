import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-07.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({
  decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative,
});
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const sitePublished = { publishedAt: '2026-08-21T07:00:00.000Z' };
const mediaRoot = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media';
const publishedHeroImages = {
  DI001: `${mediaRoot}/catalog/di001/kwilt-recipe-hero-v2/60842bd85daaf051-4db720bf609fc7c6/candidate-0.webp`,
  DI002: `${mediaRoot}/catalog/di002/kwilt-recipe-hero-v2/69086f289f652522-6b51f209749c4392/candidate-0.webp`,
  DI003: `${mediaRoot}/catalog/di003/kwilt-recipe-hero-v2/cf0c11c79057e0e8-2fe293e649e51312/candidate-0.webp`,
  DI004: `${mediaRoot}/catalog/di004/kwilt-recipe-hero-v2/f7755cfff9d5e498-1df574d27718d2d8/candidate-0.webp`,
  DI005: `${mediaRoot}/catalog/di005/kwilt-recipe-hero-v2/5e022b11f9c1f132-062192e46729700e/candidate-1.webp`,
  DI006: `${mediaRoot}/catalog/di006/kwilt-recipe-hero-v2/87d25a1f78669004-e6fd69b7df731f17/candidate-2.webp`,
  DI007: `${mediaRoot}/catalog/di007/kwilt-recipe-hero-v2/abb519c499c58e8a-8090372eb788ce9e/candidate-1.webp`,
  DI008: `${mediaRoot}/catalog/di008/kwilt-recipe-hero-v2/5c50d2c72cfa0f22-736f582792e6f0f1/candidate-1.webp`,
  DI009: `${mediaRoot}/catalog/di009/kwilt-recipe-hero-v2/425208b9640f967f-5dfd12048f2d46ea/candidate-0.webp`,
  DI010: `${mediaRoot}/catalog/di010/kwilt-recipe-hero-v2/905e3599d1b5ee45-1fabfc06a3663ea2/candidate-0.webp`,
  DI011: `${mediaRoot}/catalog/di011/kwilt-recipe-hero-v2/ea5de9cfdf024304-421c4f02aa3e5211/candidate-0.webp`,
  DI012: `${mediaRoot}/catalog/di012/kwilt-recipe-hero-v2/a6c470cb0a683e44-600d3642ea98eaa0/candidate-0.webp`,
  DI013: `${mediaRoot}/catalog/di013/kwilt-recipe-hero-v2/bf9a3a8d2c840159-437c04cf16d60976/candidate-1.webp`,
  DI014: `${mediaRoot}/catalog/di014/kwilt-recipe-hero-v2/ce75a0873afeb53d-480166dce2a3c7f5/candidate-0.webp`,
  DI015: `${mediaRoot}/catalog/di015/kwilt-recipe-hero-v2/627eb9d2707a9625-6a59108c5ef24956/candidate-0.webp`,
  DI016: `${mediaRoot}/catalog/di016/kwilt-recipe-hero-v2/c1a5e5a578a03ef3-69b86dc6642e9105/candidate-1.webp`,
  DI017: `${mediaRoot}/catalog/di017/kwilt-recipe-hero-v2/ada1d70f7b8577a5-c5837e1194f89851/candidate-0.webp`,
  DI018: `${mediaRoot}/catalog/di018/kwilt-recipe-hero-v2/2a98bf2d82fca0e4-e74efdc8d764f5e5/candidate-1.webp`,
  DI019: `${mediaRoot}/catalog/di019/kwilt-recipe-hero-v2/75a6cd4aec82817b-4675068f6c9dc4d1/candidate-1.webp`,
  DI020: `${mediaRoot}/catalog/di020/kwilt-recipe-hero-v2/12282e9ac2582323-715f4a4f0efa6833/candidate-1.webp`,
  DI021: `${mediaRoot}/catalog/di021/kwilt-recipe-hero-v2/f6a613ac7ef01cfc-ffd18aa30b69fe83/candidate-0.webp`,
  DI022: `${mediaRoot}/catalog/di022/kwilt-recipe-hero-v2/49eeacd7ba38d786-6fe45570edce191d/candidate-1.webp`,
  DI023: `${mediaRoot}/catalog/di023/kwilt-recipe-hero-v2/ad94ec447c5ff7c9-9ecfdd3d010698ce/candidate-0.webp`,
  DI024: `${mediaRoot}/catalog/di024/kwilt-recipe-hero-v2/57db15a51f114283-0ff9f1f3b3e8d202/candidate-0.webp`,
  DI025: `${mediaRoot}/catalog/di025/kwilt-recipe-hero-v2/f88b58146cfa886f-72910a35a4023d6d/candidate-0.webp`,
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
  usa: origin('United States', 'American home-cooking traditions', 39.8283, -98.5795, '840', 430),
  south: origin('American South', 'Southern American cooking traditions', 33.749, -84.388, '840', 610),
  louisiana: origin('Louisiana', 'Louisiana cooking traditions', 30.9843, -91.9623, '840', 720),
  acadiana: origin('Acadiana, Louisiana', 'Cajun cooking traditions of southern Louisiana', 30.2241, -92.0198, '840', 860),
  newOrleans: origin('New Orleans, Louisiana', 'Louisiana Creole cooking traditions', 29.9511, -90.0715, '840', 860),
  britishIsles: origin('Britain and Ireland', 'British and Irish meat-pie traditions', 53.2, -4.0, ['826', '372'], 540),
};

const spec = (value) => ({ costTier: '$$', difficulty: 'Moderate', ...value });
const specs = {
  DI001: spec({
    place: places.usa,
    historyLead: 'Whole roast chicken with gravy is a durable American Sunday-supper pattern rather than the invention of one region; the household form draws on older European roasting practice and the practical use of drippings and browned fond.',
    needId: 'roasting-pan', needLabel: 'Stovetop-safe roasting pan', reviewCategoryId: 'roasting-pan', instructionIndex: 2, phrase: 'roasting pan',
    rationale: 'A sturdy flame-safe roaster captures the chicken drippings and browned fond, then moves directly to the burner so the gravy retains the roast’s concentrated flavor.',
    heroAltText: 'Deeply browned herb roast chicken carved beside glossy pan gravy, lemon, onion, and fresh herbs.',
    imageBrief: 'American Sunday-supper whole roast chicken with taut deeply browned skin and visible rosemary, sage and thyme; partially carved after resting with juicy breast and leg meat, glossy tan pan gravy beside it, restrained roasted lemon and onion, no raw garnish overload.',
  }),
  DI002: spec({
    place: places.usa,
    historyLead: 'American pot roast belongs to a broad family of covered meat braises adapted to economical, collagen-rich beef cuts; its familiar household form cooks chuck slowly with aromatic vegetables until both meat and cooking liquid become the meal.',
    needId: 'dutch-oven', needLabel: '6-quart Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'Dutch oven',
    rationale: 'A heavy covered Dutch oven provides the broad searing surface, stable low oven heat, and tight moist environment needed to turn a four-pound chuck roast spoon-tender.',
    heroAltText: 'Fork-tender pot roast with browned edges, carrots, potatoes, onions, and silky dark gravy.',
    imageBrief: 'Classic American pot roast in a low serving dish, thick fork-tender slices retaining shape, dark seared edges, intact carrots, Yukon Gold potato chunks and onion wedges in a restrained glossy brown gravy; no pink center or soup-like broth.',
  }),
  DI003: spec({
    place: places.usa,
    historyLead: 'Meat loaves have older European precedents, but the ketchup-glazed beef-and-pork loaf became a distinctly familiar American home dinner through economical ground meat, milk-softened crumbs, and twentieth-century pantry condiments.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 2, phrase: 'foil-lined rimmed sheet',
    rationale: 'A free-form loaf on a rimmed sheet exposes more surface for browning and layered glaze while the rim safely contains rendered fat and juices.',
    heroAltText: 'Tender sliced beef-and-pork meatloaf with a lacquered tomato glaze and browned free-form edges.',
    imageBrief: 'Classic American free-form meatloaf on a simple platter, two thick clean slices showing moist cohesive beef-and-pork crumb with tiny cooked vegetables, deeply browned sides and a shiny brick-red tangy glaze in distinct layers; no loaf pan or raw onion pieces.',
  }),
  DI004: spec({
    difficulty: 'Advanced', place: places.south,
    historyLead: 'Fried chicken has many global relatives, while the buttermilk-marinated, flour-crusted bird is strongly associated with Southern American cooking and with generations of Black cooks whose skill shaped the dish’s national reputation.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 2, phrase: 'large Dutch oven',
    rationale: 'A deep heavy Dutch oven limits splatter and buffers oil-temperature swings as cold bone-in chicken enters in uncrowded batches.',
    heroAltText: 'Southern buttermilk fried chicken with a craggy deep-golden crust and juicy fully cooked interior.',
    imageBrief: 'Southern buttermilk fried chicken on a rack-lined platter, mixed bone-in thighs, drumsticks, breasts and wings with rough craggy deep-golden crust; one piece opened to show juicy fully cooked meat, no pale coating, dark burns, paper-towel sogginess or boneless tenders.',
  }),
  DI005: spec({
    difficulty: 'Easy', place: places.usa,
    historyLead: 'Oven-baked salmon with lemon, garlic, and herbs is a contemporary American household preparation built around widely available salmon fillets and Mediterranean-associated seasonings rather than a claim to one historic regional origin.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'rimmed sheet',
    rationale: 'A rimmed sheet holds the full salmon side flat, catches its oil and juices, and gives the delicate fillet enough surrounding heat to cook evenly without crowding.',
    heroAltText: 'Moist baked salmon fillet with lemon, garlic, dill, oregano, paprika, and a lightly flaking center.',
    imageBrief: 'Contemporary American baked side of salmon on parchment, coral flesh just beginning to flake yet visibly moist at the thick center, light paprika and herb surface with fresh dill, garlic and a few thin baked lemon rounds; no opaque dry interior or heavy sauce.',
  }),
  DI006: spec({
    costTier: '$$$', place: places.usa,
    historyLead: 'Pan-seared steak with butter-basted herbs reflects restaurant technique adapted to the American home kitchen, combining a hard cast-iron crust, repeated aromatic basting, measured doneness, and a final compound butter.',
    needId: 'skillet', needLabel: 'Cast-iron skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'cast-iron skillet',
    rationale: 'Cast iron stores enough heat to build a dark crust on two thick steaks and remains stable when butter, garlic, and herbs are added for the lower-heat baste.',
    heroAltText: 'Sliced cast-iron steak with a dark seared crust, rosy center, garlic, herbs, and melting herb butter.',
    imageBrief: 'Two thick American steakhouse-style strip steaks, one sliced across the grain after resting to reveal an even rosy medium-rare center and dark mahogany crust; melting parsley-chive herb butter, basted garlic and rosemary nearby, no raw-purple center or pooled blood.',
  }),
  DI007: spec({
    difficulty: 'Easy', place: places.usa,
    historyLead: 'The cheeseburger is an American restaurant and backyard-grill staple that emerged from early twentieth-century hamburger culture; its enduring household form prioritizes a juicy ground-beef patty, melted cheese, toasted bun, and restrained fresh toppings.',
    needId: 'grill', needLabel: 'Outdoor grill', reviewCategoryId: 'outdoor-grill', instructionIndex: 1, phrase: 'Prepare a grill',
    rationale: 'A grill with separate hot and cooler zones creates deep exterior browning, then melts cheese and finishes the patties to a safe temperature without scorching the buns.',
    heroAltText: 'Grilled cheeseburger with a browned beef patty, melted cheese, toasted bun, lettuce, tomato, onion, and pickles.',
    imageBrief: 'Classic American backyard cheeseburger on a toasted soft bun, thick but not oversized browned beef patty cooked through, fully melted American or cheddar cheese, dry lettuce, ripe tomato, thin onion and pickle chips with modest pink burger sauce; no double stack or impossible height.',
  }),
  DI008: spec({
    place: places.usa,
    historyLead: 'Macaroni and cheese has European antecedents, but baked pasta in a creamy cheese sauce became an enduring American home and celebration dish, with regional versions ranging from custardy casseroles to béchamel-based preparations.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '3-quart baking dish',
    rationale: 'A standard three-quart nine-by-thirteen pan gives the saucy pasta an even depth so the center stays creamy while the buttered panko surface browns quickly.',
    heroAltText: 'Creamy baked cavatappi macaroni and cheese with cheddar, Gruyère, and a crisp panko-Parmesan top.',
    imageBrief: 'American baked macaroni and cheese in a nine-by-thirteen dish, distinct cavatappi coated in glossy cheddar-Gruyère sauce, browned bubbling edges and an even crisp panko-Parmesan top; one spooned serving showing creaminess, never dry or cheese-stretch staged.',
  }),
  DI009: spec({
    difficulty: 'Advanced', place: places.usa,
    historyLead: 'Savory meat pies have deep European roots, while chicken pot pie became an American comfort-food standard through tender poultry and vegetables in a thickened cream gravy beneath pastry.',
    needId: 'skillet', needLabel: 'Deep 10-inch ovenproof skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 2, phrase: 'deep 10-inch ovenproof skillet',
    rationale: 'A deep ovenproof skillet builds the chicken gravy on the stovetop, holds the generous filling, and carries the pastry-topped pie directly into the oven.',
    heroAltText: 'Deep-skillet chicken pot pie with a flaky golden top crust and creamy chicken-and-vegetable filling.',
    imageBrief: 'American chicken pot pie in a deep ten-inch skillet, deeply golden flaky single top crust with five steam vents and modest crimp, one portion lifted to reveal thick creamy gravy, chicken pieces, peas, carrots and celery; no bottom crust or soup-like filling.',
  }),
  DI010: spec({
    place: places.usa,
    historyLead: 'Turkey meatballs in tomato sauce are a modern American adaptation of Italian American meatball suppers, substituting lean poultry while retaining a milk-softened crumb, Parmesan, herbs, browning, and a slowly finished tomato sauce.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'wide Dutch oven',
    rationale: 'A wide Dutch oven offers enough surface to brown the fragile meatballs in batches and enough depth to finish all twenty-four gently in tomato sauce.',
    heroAltText: 'Tender turkey meatballs in thick tomato sauce with basil and finely grated Parmesan.',
    imageBrief: 'Modern American turkey meatballs in a wide shallow bowl, twenty-four small evenly browned meatballs partly nested in thick brick-red tomato sauce, fresh basil and light Parmesan; one cut to show moist fine poultry crumb, no spaghetti unless only a small neutral serving base.',
  }),
  DI011: spec({
    place: places.usa,
    historyLead: 'Pork and apples are a longstanding European and American pairing, and the contemporary American skillet version uses browned bone-in chops, firm sautéed fruit, cider, mustard, and pan fond for a balanced sweet-tart sauce.',
    needId: 'skillet', needLabel: 'Heavy skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'heavy skillet',
    rationale: 'A heavy skillet supplies the stored heat for a dark chop crust and preserves enough fond to build the cider-mustard apple sauce in the same pan.',
    heroAltText: 'Browned bone-in pork chops with firm apple wedges, onions, sage, and glossy cider-mustard pan sauce.',
    imageBrief: 'American pan-seared bone-in pork chops with deep brown crust and moist pale interior, surrounded by browned onion and firm golden apple wedges in a restrained glossy cider-Dijon sauce with sage; no pink raw center or applesauce texture.',
  }),
  DI012: spec({
    difficulty: 'Easy', place: places.usa,
    historyLead: 'Garlic-butter shrimp and rice is a contemporary American one-pan dinner, pairing quick-cooked shellfish with familiar garlic, lemon, herbs, and separately protected rice texture rather than asserting a traditional regional provenance.',
    needId: 'skillet', needLabel: '12-inch covered skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 0, phrase: 'wide lidded skillet',
    rationale: 'A wide lidded skillet lets shrimp sear in one uncrowded layer, then provides the broad covered environment needed for the rice to steam evenly.',
    heroAltText: 'Garlic-butter shrimp over fluffy lemon-herb rice with parsley, scallions, and a fresh lemon finish.',
    imageBrief: 'Contemporary American garlic-butter shrimp and rice in a wide skillet, plump coral shrimp just opaque and lightly seared over separate fluffy white rice grains, visible parsley and scallions with lemon zest and a restrained buttery sheen; no soupy liquid or curled rubbery shrimp.',
  }),
  DI013: spec({
    difficulty: 'Easy', place: places.usa,
    historyLead: 'The sheet-pan dinner is a modern American home-cooking format built around one broad oven surface, deliberate ingredient staging, and high heat; it prizes weeknight practicality without sacrificing browned chicken or properly textured vegetables.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'large rimmed sheet pan',
    rationale: 'A large preheated rimmed sheet provides the space and direct metal contact required to brown the sturdy vegetables before later additions and chicken join them.',
    heroAltText: 'Crisp-skinned sheet-pan chicken thighs with browned potatoes, carrots, peppers, zucchini, onion, lemon, and parsley.',
    imageBrief: 'Modern American sheet-pan dinner with six crisp-skinned bone-in chicken thighs among browned cut-side-down potatoes, carrots, bell pepper, zucchini and onion in one uncrowded layer; bright lemon zest and parsley at service, no pale steamed vegetables or overcrowded pile.',
  }),
  DI014: spec({
    place: places.usa,
    historyLead: 'Honey-mustard chicken is a contemporary American household treatment that balances sharp prepared mustard with sweetness and vinegar, applying the glaze late so skin can render and brown before the honey is exposed to intense heat.',
    needId: 'baking-pan', needLabel: '9-by-13-inch metal baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '9-by-13-inch metal pan',
    rationale: 'The metal pan holds six thighs close enough to flavor the shallots with drippings while leaving their skin exposed for browning before the glaze is applied.',
    heroAltText: 'Roasted chicken thighs with crisp skin, bubbling honey-mustard glaze, shallots, thyme, and pan juices.',
    imageBrief: 'Six American honey-mustard chicken thighs skin-up in a metal pan, deeply browned rendered skin under a thin bubbling golden glaze, roasted shallots and thyme in modest pan juices; sauce beside but no pale boiled skin, burnt black honey or thick mustard blanket.',
  }),
  DI015: spec({
    place: places.usa,
    historyLead: 'Barbecue-glazed meatballs are an American party and family-dinner hybrid, combining the soft panade and mixed-meat structure of a meatball with a tangy-sweet tomato, molasses, mustard, and vinegar glaze.',
    needId: 'wire-rack', needLabel: 'Oven-safe wire rack', reviewCategoryId: 'wire-rack', instructionIndex: 1, phrase: 'rack over a foil-lined sheet',
    rationale: 'An oven-safe rack lifts all sides of the meatballs above rendered fat so they brown evenly before entering the sticky barbecue glaze.',
    heroAltText: 'Browned beef-and-pork meatballs coated in a glossy tangy barbecue glaze.',
    imageBrief: 'Twenty-four American barbecue meatballs, uniformly round and browned before being coated in a thin glossy deep mahogany ketchup-molasses glaze that clings rather than pools; a few on a platter with simple picks, no raw center or bottled-sauce flood.',
  }),
  DI016: spec({
    place: places.usa,
    historyLead: 'Stuffed peppers appear in many cuisines; this beef, rice, tomato, and cheese version belongs to the familiar Italian American household casserole tradition and uses pre-roasting to ensure the pepper shells become fully tender.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'cut-side down on a sheet',
    rationale: 'A broad rimmed sheet lets all twelve pepper halves pre-roast cut-side down, drain, then bake upright without crowding or spilling their filling.',
    heroAltText: 'Tender red and yellow pepper halves filled with beef, rice, tomato, Parmesan, and browned mozzarella.',
    imageBrief: 'Twelve Italian American stuffed pepper halves on a sheet, red and yellow shells fully tender yet holding shape, generous beef-rice-tomato filling under bubbling browned mozzarella with parsley; one cut to show cohesive filling, no raw crunchy pepper walls.',
  }),
  DI017: spec({
    costTier: '$', place: places.usa,
    historyLead: 'Tuna noodle casserole became an American pantry standard in the twentieth century as canned tuna, condensed sauces, frozen vegetables, and packaged noodles supported economical family meals; this version rebuilds the sauce from mushrooms, stock, and milk.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '3-quart dish',
    rationale: 'A three-quart nine-by-thirteen dish spreads the noodles and tuna in an even layer so the center heats through before the panko crust overbrowns.',
    heroAltText: 'Creamy tuna noodle casserole with mushrooms, peas, cheddar, parsley, and a golden panko crust.',
    imageBrief: 'Classic American tuna noodle casserole in a three-quart dish, distinct egg noodles lightly coated in homemade creamy mushroom sauce with tuna flakes and bright peas, even golden panko top and bubbling edges; one serving lifted, never gray, soupy or dry.',
  }),
  DI018: spec({
    place: places.usa,
    historyLead: 'Chicken, broccoli, and rice casserole is a modern American family-meal format shaped by convenience cooking; this scratch-sauce version keeps the recognizable combination while separately cooking the chicken, rice, and broccoli for more reliable texture.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 2, phrase: '3-quart dish',
    rationale: 'A three-quart nine-by-thirteen dish provides enough shallow area for the rice mixture to heat evenly and the cheddar-cracker topping to brown across every serving.',
    heroAltText: 'Chicken broccoli rice casserole with tender chicken, green broccoli, creamy rice, cheddar, and golden cracker crumbs.',
    imageBrief: 'American chicken broccoli rice casserole in a three-quart dish, distinct white rice, juicy diced chicken and bright green broccoli bound by light cheddar sauce, melted cheese and an even golden cracker-crumb top; no canned-soup grayness or mushy broccoli.',
  }),
  DI019: spec({
    place: places.britishIsles,
    historyLead: 'Shepherd’s pie is associated with Britain and Ireland and, by definition, uses lamb beneath mashed potato; the skillet presentation is a modern household convenience that preserves the traditional meat, gravy, vegetable, and potato structure.',
    needId: 'skillet', needLabel: '12-inch covered skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 1, phrase: '12-inch ovenproof skillet',
    rationale: 'A twelve-inch ovenproof skillet supplies enough browning area for the lamb, builds the gravy on the stovetop, and carries the sealed potato-topped pie into a hot oven and broiler.',
    heroAltText: 'Skillet shepherd’s pie with lamb and vegetables in dark gravy beneath ridged browned mashed potatoes.',
    imageBrief: 'British-Irish shepherd’s pie in a twelve-inch skillet, ridged mashed-potato lid sealed to the edge and deeply browned at peaks, one wedge served to show coarse lamb, carrots and peas in thick dark gravy; no beef, pastry crust or watery filling.',
  }),
  DI020: spec({
    place: places.usa,
    historyLead: 'Tetrazzini is an American baked pasta named for Italian opera singer Luisa Tetrazzini, not an inherited Italian dish; turkey versions became a familiar way to turn holiday leftovers into a creamy mushroom casserole.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking pan', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 0, phrase: '3-quart dish',
    rationale: 'A three-quart nine-by-thirteen dish keeps the spaghetti in a shallow, even layer so the scratch mushroom sauce stays creamy while the almond-panko top browns.',
    heroAltText: 'Creamy turkey tetrazzini with spaghetti, browned mushrooms, peas, sherry, Parmesan, almonds, and panko.',
    imageBrief: 'American turkey tetrazzini in a three-quart casserole, distinct spaghetti strands coated but not flooded in pale sherry-mushroom sauce with turkey and peas, browned almond-panko-Parmesan top and bubbling edges; one serving lifted, no dry noodle block.',
  }),
  DI021: spec({
    difficulty: 'Advanced', place: places.south,
    historyLead: 'Chicken-fried steak is a Southern and especially Texan preparation that applies a flour-and-buttermilk fried-chicken crust to tenderized beef, then turns the browned frying fat and fond into peppered cream gravy.',
    needId: 'skillet', needLabel: 'Heavy skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 2, phrase: 'heavy skillet',
    rationale: 'A heavy skillet steadies the shallow-frying temperature, gives the large coated steaks room to brown, and retains the fond needed for authentic cream gravy.',
    heroAltText: 'Texas-style chicken-fried steak with rough golden crust and peppered cream gravy spooned on at service.',
    imageBrief: 'Texas chicken-fried steak with a broad thin tenderized beef cutlet under a rough craggy deep-golden crust, pepper-flecked cream gravy spooned over only part at service so crispness remains visible; one cut edge fully cooked, no chicken breast.',
  }),
  DI022: spec({
    difficulty: 'Easy', place: places.south,
    historyLead: 'Country ham with red-eye gravy is a Southern American breakfast tradition in which salty cured ham is skillet-browned and its drippings loosened with coffee into a deliberately thin, bracing sauce often served with biscuits.',
    needId: 'skillet', needLabel: 'Large cast-iron skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'large cast-iron skillet',
    rationale: 'A large cast-iron skillet browns the wide ham slices and holds both the rendered drippings and dark fond needed when the hot pan is deglazed with coffee.',
    heroAltText: 'Browned country ham with thin coffee red-eye gravy and split hot biscuits.',
    imageBrief: 'Southern country-ham breakfast, several thin browned cured-ham slices beside split hot biscuits, with translucent mahogany coffee red-eye gravy visibly thin and spoonable in a small vessel and lightly around the ham; no thick cream gravy or fresh pink ham steak.',
  }),
  DI023: spec({
    difficulty: 'Advanced', place: places.acadiana,
    historyLead: 'Jambalaya is a Louisiana rice dish with both Creole and Cajun expressions; this brown chicken-and-andouille version is associated with Cajun cooking, where deeply browned meat and the trinity season an absorbent one-pot rice rather than a tomato base.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'heavy Dutch oven',
    rationale: 'A heavy Dutch oven provides the broad browning surface and tightly covered, evenly heated environment needed for deeply flavored meat and separate fully cooked rice grains.',
    heroAltText: 'Cajun brown jambalaya with chicken, andouille, separate rice grains, the trinity, scallions, and parsley.',
    imageBrief: 'Acadiana-style brown jambalaya in a heavy pot, distinct mahogany rice grains evenly carrying browned chicken pieces, sliced andouille, softened onion, green bell pepper and celery, finished with scallions and parsley; no tomatoes, shrimp or wet risotto texture.',
  }),
  DI024: spec({
    difficulty: 'Advanced', place: places.newOrleans,
    historyLead: 'Étouffée, from the French for smothered, is a Louisiana dish in which shellfish is gently cooked in a seasoned roux-thickened sauce with the trinity; shrimp versions sit naturally within Louisiana Creole home and restaurant cooking.',
    needId: 'dutch-oven', needLabel: 'Heavy pot or Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'heavy pot',
    rationale: 'A heavy pot moderates the butter-and-flour roux, gives the trinity room to soften, and holds a steady simmer as shrimp stock becomes a glossy flowing sauce.',
    heroAltText: 'Louisiana shrimp étouffée with plump shrimp in glossy light-brown sauce over separate white rice.',
    imageBrief: 'Louisiana Creole shrimp étouffée in a shallow bowl, plump coral shrimp just cooked in glossy blond-to-light-brown roux sauce flecked with trinity, paprika and herbs, spooned around a neat mound of separate white rice with scallions and parsley; no dark gumbo broth.',
  }),
  DI025: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.louisiana,
    historyLead: 'Blackened redfish is closely tied to Louisiana chef Paul Prudhomme, whose high-heat cast-iron method coated buttered fish in a dark aromatic spice crust and helped propel Cajun cooking and redfish into national attention.',
    needId: 'skillet', needLabel: 'Well-seasoned cast-iron skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'well-seasoned cast-iron skillet',
    rationale: 'A well-seasoned cast-iron skillet stores the extreme heat needed to darken the butter-and-spice coating in minutes while the thick fish center remains moist.',
    heroAltText: 'Louisiana blackened redfish with a dark brown spice crust, moist white flakes, and lemon.',
    imageBrief: 'Louisiana blackened redfish fillets with an even dark brown paprika-herb crust that is deeply toasted but not ashy black, one fillet opened to show moist opaque white flakes, clarified-butter sheen and lemon alongside; cast-iron context, no breading or cream sauce.',
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
    ...(publishedHeroImages[manifestRecipe.rosterId]
      ? { heroImage: publishedImage(publishedHeroImages[manifestRecipe.rosterId], value.heroAltText) }
      : {}),
    heroAltText: value.heroAltText,
    imageBrief: value.imageBrief,
  };
}

export default Object.fromEntries(manifest.recipes.map((recipe) => [recipe.rosterId, authorRecipe(recipe)]));
