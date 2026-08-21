import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-08.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({
  decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative,
});
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const sitePublished = { publishedAt: '2026-08-21T09:00:00.000Z' };
const mediaRoot = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media';
const publishedHeroImages = {
  DI026: `${mediaRoot}/catalog/di026/kwilt-recipe-hero-v2/b2ec956c3848a151-eb474bf7f6bc4bb4/candidate-0.webp`,
  DI027: `${mediaRoot}/catalog/di027/kwilt-recipe-hero-v2/6151278f674bcca5-0bd041da59e7ddfa/candidate-0.webp`,
  DI028: `${mediaRoot}/catalog/di028/kwilt-recipe-hero-v2/c206c98754bf2ad9-dbb2908978f0f18b/candidate-0.webp`,
  DI029: `${mediaRoot}/catalog/di029/kwilt-recipe-hero-v2/444462fb7cce42bd-c3a71a777bb083da/candidate-0.webp`,
  DI030: `${mediaRoot}/catalog/di030/kwilt-recipe-hero-v2/6aa43b61b5df70ba-72546c493d42eddc/candidate-1.webp`,
  DI031: `${mediaRoot}/catalog/di031/kwilt-recipe-hero-v2/a172aa0b6b73639f-d1e5279a416e5928/candidate-0.webp`,
  DI032: `${mediaRoot}/catalog/di032/kwilt-recipe-hero-v2/5624c7b88d4e57d6-00995f7cd85f4302/candidate-0.webp`,
  DI033: `${mediaRoot}/catalog/di033/kwilt-recipe-hero-v2/6f25dc9d111315b7-0587d9684722e61f/candidate-1.webp`,
  DI034: `${mediaRoot}/catalog/di034/kwilt-recipe-hero-v2/e42a8149304bee1d-4594e5f779d1b1af/candidate-1.webp`,
  DI035: `${mediaRoot}/catalog/di035/kwilt-recipe-hero-v2/61deda10268f29f5-fd56b48e63400e24/candidate-1.webp`,
  DI036: `${mediaRoot}/catalog/di036/kwilt-recipe-hero-v2/6c6f7543c949d5de-ffefd5d807581c27/candidate-0.webp`,
  DI037: `${mediaRoot}/catalog/di037/kwilt-recipe-hero-v2/aa7774bd36c911d9-b8e4a43deee6879c/candidate-0.webp`,
  DI038: `${mediaRoot}/catalog/di038/kwilt-recipe-hero-v2/26777158c7fdc0e0-c96a866ab12265c1/candidate-1.webp`,
  DI039: `${mediaRoot}/catalog/di039/kwilt-recipe-hero-v2/4e3ae7debea8d856-97386ff6b7d71ecc/candidate-0.webp`,
  DI040: `${mediaRoot}/catalog/di040/kwilt-recipe-hero-v2/67181a336e5f2753-a3994e37d2fc1dd7/candidate-0.webp`,
  DI041: `${mediaRoot}/catalog/di041/kwilt-recipe-hero-v2/2e10482039517d16-7a57655efe235e36/candidate-1.webp`,
  DI042: `${mediaRoot}/catalog/di042/kwilt-recipe-hero-v2/77d73d3ea7375e0a-33a64e07b734146a/candidate-0.webp`,
  DI043: `${mediaRoot}/catalog/di043/kwilt-recipe-hero-v2/5d870fa248a9c992-b142bb39abf1d998/candidate-0.webp`,
  DI044: `${mediaRoot}/catalog/di044/kwilt-recipe-hero-v2/3b4f845ce06ed17c-16ad22a7bff4cd24/candidate-1.webp`,
  DI045: `${mediaRoot}/catalog/di045/kwilt-recipe-hero-v2/45fabf8aed963cd4-73fd10adca57b2a8/candidate-0.webp`,
  DI046: `${mediaRoot}/catalog/di046/kwilt-recipe-hero-v2/c0b2d59aa6ddcf9f-2919f05054aafe59/candidate-0.webp`,
  DI047: `${mediaRoot}/catalog/di047/kwilt-recipe-hero-v2/d55ded918aca681d-623ffe640b3ed612/candidate-1.webp`,
  DI048: `${mediaRoot}/catalog/di048/kwilt-recipe-hero-v2/7770b926b8cd84c6-4379120dc44265e8/candidate-0.webp`,
  DI049: `${mediaRoot}/catalog/di049/kwilt-recipe-hero-v2/714e99095d9f8b2d-16c860cc36b5ed86/candidate-0.webp`,
  DI050: `${mediaRoot}/catalog/di050/kwilt-recipe-hero-v2/2b2e41413bb6f4ba-6af56e3d3edb5cae/candidate-1.webp`,
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
  lowcountry: origin('South Carolina Lowcountry', 'Gullah Geechee and Lowcountry cooking traditions', 32.7765, -79.9311, '840', 860),
  texas: origin('Central Texas', 'Central Texas barbecue traditions', 30.2672, -97.7431, '840', 760),
  carolinas: origin('Eastern North Carolina', 'Carolina whole-hog barbecue traditions', 35.7796, -78.6382, '840', 720),
  hawaii: origin('Hawaiʻi', 'Local and Native Hawaiian food traditions', 20.7984, -156.3319, '840', 850),
  alaska: origin('Alaska', 'Contemporary Alaskan salmon cooking', 64.2008, -152.4937, '840', 650),
  newEngland: origin('New England', 'New England coastal cooking traditions', 42.3601, -71.0589, '840', 720),
  midwest: origin('Upper Midwest', 'Midwestern American home-cooking traditions', 44.9778, -93.265, '840', 650),
  southwest: origin('New Mexico', 'New Mexican and Southwestern cooking traditions', 35.687, -105.9378, '840', 760),
  quebec: origin('Québec', 'Québécois cooking traditions', 46.8139, -71.208, '124', 720),
  canada: origin('Canada', 'Canadian home cooking', 56.1304, -106.3468, '124', 430),
  northAmerica: origin('North America', 'Contemporary Indigenous-inspired North American cooking', 45.0, -100.0, ['840', '124'], 390),
  rome: origin('Rome, Lazio', 'Roman cooking traditions', 41.9028, 12.4964, '380', 860),
  bologna: origin('Bologna, Emilia-Romagna', 'Bolognese and Emilian cooking traditions', 44.4949, 11.3426, '380', 860),
  liguria: origin('Genoa, Liguria', 'Ligurian cooking traditions', 44.4056, 8.9463, '380', 860),
  southernItaly: origin('Southern Italy', 'Southern Italian pasta traditions', 40.8518, 14.2681, '380', 720),
  italianAmerican: origin('United States', 'Italian American restaurant cooking', 40.7128, -74.006, ['840', '380'], 500),
};

const spec = (value) => ({ costTier: '$$', difficulty: 'Moderate', ...value });
const specs = {
  DI026: spec({
    place: places.lowcountry,
    historyLead: 'Perloo, also written purloo or pilau, is a Lowcountry one-pot rice tradition shaped by West African rice knowledge and Gullah Geechee cooking; seafood or meat seasons the same pot in which the rice absorbs its stock.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'heavy Dutch oven',
    rationale: 'A heavy covered Dutch oven supplies enough browning area for bacon and aromatics, then steadies the low covered simmer that keeps the rice separate and the shell stock concentrated.',
    heroAltText: 'Lowcountry shrimp perloo with separate tomato-tinted rice, plump shrimp, bacon, peppers, celery, scallions, and lemon.',
    imageBrief: 'South Carolina Lowcountry shrimp perloo in a broad serving bowl, separate savory Carolina Gold rice lightly stained by tomato and shrimp-shell stock, plump coral shrimp folded through at the end, small crisp bacon pieces, green pepper, celery and scallions; dry pilaf finish, no soupy jambalaya texture.',
  }),
  DI027: spec({
    costTier: '$', place: places.lowcountry,
    historyLead: 'Hoppin’ John is a Lowcountry rice-and-field-pea dish whose history is inseparable from enslaved West African agricultural and culinary knowledge; Sea Island red peas and Carolina Gold rice express its Charleston-area lineage.',
    needId: 'dutch-oven', needLabel: 'Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'a Dutch oven',
    rationale: 'A six-quart covered Dutch oven holds the ham hock and pot liquor, then gives peas and rice a stable low simmer and undisturbed covered steam.',
    heroAltText: 'Lowcountry Hoppin’ John with separate rice, whole field peas, smoky ham, scallions, and pepper vinegar.',
    imageBrief: 'Traditional Lowcountry Hoppin’ John in a shallow earthenware bowl, loose separate Carolina Gold rice grains with whole reddish Sea Island peas or black-eyed peas and modest smoky ham pieces, scallions and pepper vinegar alongside; not a wet bean stew or mashed-pea casserole.',
  }),
  DI028: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.texas,
    historyLead: 'Central Texas barbecue brisket developed through meat-market and immigrant butchering traditions into a restrained style centered on beef, salt and pepper, post-oak smoke, bark, rendered fat, and careful slicing rather than sweet sauce.',
    needId: 'smoker', needLabel: 'Full-size outdoor smoker', reviewCategoryId: 'outdoor-smoker', instructionIndex: 1, phrase: 'indirect smoker',
    rationale: 'A full-size smoker that can hold 225–275°F provides the indirect heat, clean wood smoke, and whole-packer capacity required for a set bark, rendered point, tender flat, and long controlled cook.',
    heroAltText: 'Central Texas smoked brisket with dark pepper bark, a moist smoke-ringed flat, and rendered point slices.',
    imageBrief: 'Central Texas whole-packer brisket on butcher paper, sliced only across the flat and point grains after a long rest, dark dry salt-and-pepper bark, thin honest smoke ring, moist fully rendered interior with supple slices that hold together; no sauce glaze, shredded meat or raw-looking center.',
  }),
  DI029: spec({
    difficulty: 'Easy', place: places.carolinas,
    historyLead: 'Sticky oven-finished pork ribs are a contemporary American barbecue adaptation: dry seasoning and a covered low roast tenderize the racks before repeated sauce layers build a glossy, caramelized exterior.',
    needId: 'roasting-pan', needLabel: 'Foil-lined roasting pans', reviewCategoryId: 'roasting-pan', instructionIndex: 1, phrase: 'foil-lined roasting pans',
    rationale: 'A sturdy roasting pan safely contains two large racks, apple juice, and rendered fat during the sealed tenderizing phase, then tolerates the hotter uncovered glaze finish.',
    heroAltText: 'Sticky barbecue pork ribs with a mahogany glaze, exposed bone ends, and tender meat that still holds to the bone.',
    imageBrief: 'American sticky pork spareribs in two intact glazed racks, deep mahogany ketchup-molasses sheen in thin caramelized layers, exposed bone tips and a sliced section showing fully cooked juicy meat that still holds shape; no black burn, boiled-gray meat or falling-apart pile.',
  }),
  DI030: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.carolinas,
    historyLead: 'Vinegar-seasoned pulled pork belongs to the older whole-hog barbecue traditions of the Carolinas, especially eastern North Carolina, where smoke, pork, pepper, and sharp vinegar matter more than a thick sweet tomato sauce.',
    needId: 'smoker', needLabel: 'Full-size outdoor smoker', reviewCategoryId: 'outdoor-smoker', instructionIndex: 1, phrase: 'indirect smoker',
    rationale: 'A stable indirect smoker creates clean hickory or oak smoke and a dry set bark over a long 250°F cook while giving a whole shoulder enough space to render evenly.',
    heroAltText: 'Carolina pulled pork with coarse smoky strands, dark bark pieces, thin pepper-vinegar sauce, slaw, and a soft roll.',
    imageBrief: 'Eastern Carolina-style pulled pork, coarse moist strands mixed with chopped dark bark and only a light sheen of thin pepper-flecked vinegar sauce, served beside plain slaw and soft rolls with extra vinegar sauce; no thick red barbecue coating or uniformly shredded mush.',
  }),
  DI031: spec({
    place: places.hawaii,
    historyLead: 'Huli huli chicken is a twentieth-century Hawaiʻi barbecue associated with Ernest Morgado, whose turning rotisserie-style chicken and sweet-savory glaze became a fundraiser and roadside staple; huli means turn in Hawaiian.',
    needId: 'grill', needLabel: 'Outdoor grill', reviewCategoryId: 'outdoor-grill', instructionIndex: 1, phrase: 'a grill',
    rationale: 'A covered two-zone grill permits repeated turning over controlled heat, protects the sugary glaze from flare-ups, and adds the clean kiawe or fruitwood smoke central to the dish.',
    heroAltText: 'Hawaiʻi huli huli chicken with lacquered browned skin, juicy cut pieces, scallions, and restrained pineapple-soy glaze.',
    imageBrief: 'Hawaiʻi roadside-style huli huli chicken cut into bone-in portions after grilling, glossy deep amber-brown skin with light char from repeated turns, juicy fully cooked meat, scallions and a restrained pineapple-soy glaze; no pineapple rings, sticky sauce pool or raw pink joints.',
  }),
  DI032: spec({
    place: places.hawaii,
    historyLead: 'Traditional kālua pig is cooked in an imu, an underground oven central to Native Hawaiian gathering and foodways; the covered household oven method is an explicit adaptation that uses banana leaf, salt, moisture, and smoke flavor to approach its tender texture.',
    needId: 'roasting-pan', needLabel: 'Roasting pan with rack', reviewCategoryId: 'roasting-pan', instructionIndex: 1, phrase: 'roasting pan',
    rationale: 'A roomy rack-fitted roaster holds the wrapped pork above the water, captures its juices, and can be sealed tightly for the long moist oven cook.',
    heroAltText: 'Kālua-style pork with moist coarse shreds, tender cabbage, banana leaf, rice, and reserved pork juices.',
    imageBrief: 'Hawaiʻi household kālua-style pork and cabbage, coarse moist pale-brown pork shreds with a few browned edges folded through tender green cabbage, banana-leaf context and white rice alongside; no claim of an imu scene, no dark barbecue sauce or watery braise.',
  }),
  DI033: spec({
    place: places.hawaii,
    historyLead: 'Loco moco is a Hawaiʻi local-food plate generally traced to Hilo in the late 1940s: rice, a hamburger patty, brown gravy, and a fried egg form its recognizable diner and plate-lunch structure.',
    needId: 'skillet', needLabel: 'Heavy skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'a skillet',
    rationale: 'A heavy skillet browns four broad patties without steaming, then retains the drippings and fond needed for the mushroom-onion beef gravy.',
    heroAltText: 'Hawaiʻi loco moco with white rice, browned beef patty, glossy mushroom gravy, fried egg, and scallions.',
    imageBrief: 'Hawaiʻi loco moco on a casual plate, compact mound of hot white rice under one wide browned hamburger patty, glossy brown mushroom-onion gravy and a fried egg with fully set white and soft yolk, scallions; no cheese, bun, raw egg white or oversized restaurant stack.',
  }),
  DI034: spec({
    costTier: '$$$', place: places.alaska,
    historyLead: 'Cooking fish beside fragrant wood has Indigenous roots in the Pacific Northwest, while cedar-plank salmon is now used broadly across North American grilling; this Alaska-labeled version pairs salmon with maple, mustard, lemon, and dill without claiming the plank method originated in Alaska.',
    needId: 'cedar-plank', needLabel: 'Food-safe cedar grilling plank', reviewCategoryId: 'cedar-grilling-planks', instructionIndex: 0, phrase: 'the plank',
    rationale: 'A soaked food-safe Western red cedar plank shields the salmon from direct flame while producing the gentle smoke and steam that define the method.',
    heroAltText: 'Cedar-plank salmon with moist maple-Dijon glazed flesh, lightly charred plank edges, lemon, and dill.',
    imageBrief: 'North American cedar-plank salmon presented on a food-safe Western red cedar plank, coral flesh just flaking and moist, thin maple-Dijon glaze, lightly charred plank perimeter, lemon slices and dill; no open flames licking fish, black plank, dry opaque salmon or invented Indigenous regalia.',
  }),
  DI035: spec({
    difficulty: 'Easy', place: places.newEngland,
    historyLead: 'Baked white fish topped with buttery cracker crumbs is a New England coastal home and restaurant pattern, often using cod or haddock and pantry crackers to protect delicate fillets while the surface browns.',
    needId: 'baking-dish', needLabel: 'Shallow baking dish', reviewCategoryId: 'baking-dish', instructionIndex: 0, phrase: 'shallow baking dish',
    rationale: 'A shallow dish holds the wine-and-lemon pan juices around the cod while leaving the coarse cracker topping fully exposed to the oven for crisp browning.',
    heroAltText: 'New England baked cod with moist white flakes, golden buttery cracker crumbs, parsley, lemon, and a little pan juice.',
    imageBrief: 'New England baked cod fillets in a shallow dish, moist opaque white flakes under a generous loose golden buttery cracker-crumb crust, parsley and lemon wedges with only a small amount of clear pan juice around the fish; no wet topping or heavy cream sauce.',
  }),
  DI036: spec({
    costTier: '$', difficulty: 'Easy', place: places.midwest,
    historyLead: 'Hotdish is an Upper Midwestern casserole tradition built for communal, economical meals; the tater-tot form layers a creamy meat-and-vegetable filling beneath a visibly crisp single layer of frozen potato tots.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 2, phrase: '9-by-13-inch dish',
    rationale: 'A standard nine-by-thirteen pan keeps the beef filling at an even depth and provides enough surface to expose every tot to dry oven heat.',
    heroAltText: 'Upper Midwestern tater tot hotdish with crisp aligned tots over creamy beef, mushrooms, peas, and corn.',
    imageBrief: 'Upper Midwestern tater tot hotdish in a nine-by-thirteen pan, neat close rows of deeply crisp golden tots left fully exposed over a scratch creamy beef, mushroom, pea and corn filling bubbling at edges; one serving lifted, no buried or pale soggy tots.',
  }),
  DI037: spec({
    place: places.midwest,
    historyLead: 'Chicken and wild rice bake reflects Upper Midwestern use of wild rice in hearty communal casseroles; this version preserves the grain’s chewy split texture by cooking and draining it before the chicken, mushroom sauce, and almond-topped bake.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 2, phrase: '9-by-13-inch dish',
    rationale: 'A nine-by-thirteen pan spreads the rice and chicken shallowly enough to heat through evenly while the uncovered almonds toast instead of steaming.',
    heroAltText: 'Chicken and wild rice bake with distinct split grains, roasted chicken, mushrooms, herbs, parsley, and toasted almonds.',
    imageBrief: 'Upper Midwestern chicken and wild rice casserole in a nine-by-thirteen dish, distinct dark split wild-rice grains and juicy diced chicken in light mushroom-herb sauce, parsley and toasted sliced almonds across the top; cohesive but not soupy, no white-rice substitution visual.',
  }),
  DI038: spec({
    place: places.southwest,
    historyLead: 'Stacked green chile enchilada casseroles adapt New Mexican chile-and-tortilla traditions to a family-size baking dish; the defining flavor comes from roasted green chile and enough sauce to soften layered corn tortillas without making them pasty.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 2, phrase: '9-by-13-inch dish',
    rationale: 'The standard rectangular dish supports three even tortilla layers, keeps sauce distributed to every edge, and leaves enough surface for the cheese to bubble and brown.',
    heroAltText: 'Green chile chicken enchilada bake with visible corn-tortilla layers, tender chicken, roasted chile sauce, browned cheese, and cilantro.',
    imageBrief: 'Southwestern green chile chicken enchilada bake in a nine-by-thirteen dish, a clean square serving showing three soft distinct corn-tortilla layers, shredded chicken and speckled roasted green chile sauce under bubbling lightly browned cheese and cilantro; no red sauce or soggy collapsed stack.',
  }),
  DI039: spec({
    difficulty: 'Advanced', place: places.quebec,
    historyLead: 'Tourtière is a Québécois meat pie associated with Christmas and Réveillon tables; fillings and seasoning vary by family and region, while the familiar double-crust version encloses finely cooked pork and other meat with warm spice.',
    needId: 'pie-pan', needLabel: '9-inch pie plate', reviewCategoryId: '9-inch-pie-pan', instructionIndex: 2, phrase: '9-inch pie plate',
    rationale: 'A sturdy nine-inch pie plate gives the chilled double crust enough support for a generous meat filling and a clean crimp while conducting heat into the bottom pastry.',
    heroAltText: 'Québécois tourtière with a deeply golden double crust and a firm savory pork-and-beef filling.',
    imageBrief: 'Québécois tourtière on a simple holiday table, deep golden double pastry crust with hand-crimped rim and steam vents, one clean wedge revealing fine cohesive pork-and-beef filling with subtle warm spice; no gravy flood, mashed filling or lattice top.',
  }),
  DI040: spec({
    costTier: '$', difficulty: 'Advanced', place: places.quebec,
    historyLead: 'Poutine emerged in rural Québec in the late 1950s and became defined by three parts served hot together: crisp fries, fresh squeaky cheese curds, and pourable brown gravy.',
    needId: 'wire-rack', needLabel: 'Wire cooling racks', reviewCategoryId: 'wire-rack', instructionIndex: 1, phrase: 'racks',
    rationale: 'Wire racks let steam escape after the first fry so the potatoes cool dry before their hotter second fry, preserving the crisp exterior needed to withstand gravy.',
    heroAltText: 'Québécois poutine with deep-golden fries, fresh white cheese curds, and glossy hot brown gravy.',
    imageBrief: 'Classic Québec poutine in a warm shallow bowl, irregular deep-golden twice-fried potato batons, fresh white cheese curds distributed throughout and glossy pourable brown beef-chicken gravy coating some fries while others remain crisp; no shredded cheese or opaque gluey gravy.',
  }),
  DI041: spec({
    difficulty: 'Easy', place: places.canada,
    historyLead: 'Maple-glazed salmon is a contemporary Canadian preparation that joins two nationally important ingredients in a practical roast; mustard, vinegar, and soy keep pure maple syrup from becoming one-dimensionally sweet.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 1, phrase: 'foil-lined sheet pan',
    rationale: 'A preheated rimmed sheet gives the salmon immediate bottom heat, catches the thin maple glaze safely, and leaves the fillets uncrowded for fast roasting.',
    heroAltText: 'Canadian maple-glazed salmon with a thin amber sheen, moist coral flakes, lemon, and lightly caramelized edges.',
    imageBrief: 'Contemporary Canadian maple-glazed salmon fillets, coral centers just flaking and moist, thin translucent amber maple-Dijon glaze with lightly caramelized edges, lemon alongside; no candy-thick sauce, black burns or dry opaque interior.',
  }),
  DI042: spec({
    costTier: '$', place: places.northAmerica,
    historyLead: 'Corn, beans, and squash are often called the Three Sisters because many Indigenous nations cultivated them in mutually supporting systems; traditions differ widely, so this stuffed squash is a modern North American interpretation rather than a claim to one nation’s ceremonial recipe.',
    needId: 'sheet-pan', needLabel: 'Rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'rimmed sheet pan',
    rationale: 'A rimmed sheet holds all six squash halves cut-side down with enough exposed metal for caramelization, then safely supports their filled second bake.',
    heroAltText: 'Roasted acorn squash filled with black beans, hominy, corn, pumpkin seeds, cilantro, and lime.',
    imageBrief: 'Modern North American Three Sisters stuffed acorn squash, six tender caramelized halves holding shape, filled with distinct black beans, hominy and corn, toasted pumpkin seeds, cilantro and lime; respectful natural table setting, no invented tribal symbols or costume motifs.',
  }),
  DI043: spec({
    difficulty: 'Advanced', place: places.rome,
    historyLead: 'Carbonara is a modern Roman pasta whose exact origin remains debated; its defining contemporary structure uses guanciale, egg, Pecorino Romano, black pepper, and starchy pasta water—never cream—to form a glossy off-heat sauce.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 1, phrase: 'cool skillet',
    rationale: 'A wide skillet renders guanciale evenly and provides enough tossing room to coat spaghetti with the egg-cheese emulsion off heat without scrambling it.',
    heroAltText: 'Roman spaghetti carbonara with glossy egg-Pecorino sauce, crisp guanciale, black pepper, and distinct noodles.',
    imageBrief: 'Roman spaghetti carbonara in a warm shallow bowl, distinct al dente strands coated in glossy pale-gold egg-Pecorino emulsion, crisp small guanciale pieces and coarse black pepper, no cream pool, parsley, peas or scrambled egg curds.',
  }),
  DI044: spec({
    difficulty: 'Advanced', place: places.bologna,
    historyLead: 'Ragù alla bolognese belongs to Bologna and Emilia-Romagna, where meat, pancetta, soffritto, wine, modest tomato, and milk are slowly cooked into a rich sauce traditionally paired with fresh egg tagliatelle rather than spaghetti.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'heavy pot',
    rationale: 'A heavy wide pot browns the meat without crowding, then buffers the very low uncovered simmer so the ragù reduces gradually for more than two hours.',
    heroAltText: 'Tagliatelle alla bolognese with broad egg noodles coated in rich meat ragù and Parmigiano-Reggiano.',
    imageBrief: 'Bologna-style tagliatelle al ragù, broad golden fresh-egg ribbons lightly but thoroughly coated in fine rich beef-pancetta ragù with subdued tomato and Parmigiano, sauce clinging rather than pooling; no spaghetti, giant meat chunks or bright marinara.',
  }),
  DI045: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.bologna,
    historyLead: 'Lasagne verdi al forno is strongly associated with Bologna and Emilia-Romagna, layering pasta, ragù, béchamel, and Parmigiano; Italian-American beef lasagna often enlarges the pan and portions while retaining that layered logic.',
    needId: 'baking-pan', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 1, phrase: '9-by-13-inch dish',
    rationale: 'A deep standard nine-by-thirteen dish supports five or six thin even layers and contains bubbling ragù and béchamel through the covered and browned baking phases.',
    heroAltText: 'Classic beef lasagna with distinct pasta, slow beef ragù, creamy béchamel, Parmigiano, and browned edges.',
    imageBrief: 'Bolognese-inspired beef lasagna in a nine-by-thirteen dish, one rested square showing five or six distinct thin pasta layers with fine rich ragù, creamy white béchamel and Parmigiano, browned bubbling top and stable cut edges; no ricotta clumps or collapsed sauce pool.',
  }),
  DI046: spec({
    costTier: '$', difficulty: 'Advanced', place: places.rome,
    historyLead: 'Cacio e pepe is a Roman pasta built from Pecorino Romano, black pepper, pasta, and starchy cooking water; its apparent simplicity depends on temperature control so the cheese emulsifies instead of clumping.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 0, phrase: 'wide dry skillet',
    rationale: 'A wide skillet toasts the pepper gently and gives the pasta room to finish in shallow starchy water before the cheese paste is incorporated off heat.',
    heroAltText: 'Roman cacio e pepe with glossy Pecorino sauce, toasted black pepper, and distinct tonnarelli strands.',
    imageBrief: 'Roman cacio e pepe in a warm shallow bowl, distinct tonnarelli or spaghetti strands under a glossy ivory Pecorino emulsion with abundant coarse toasted black pepper, creamy without visible cream; no cheese clumps, oil puddle or parsley.',
  }),
  DI047: spec({
    difficulty: 'Advanced', place: places.rome,
    historyLead: 'Amatriciana is associated with Amatrice and became a Roman trattoria standard; the canonical family centers guanciale, tomato, Pecorino Romano, chile, and pasta, with bucatini a familiar Roman pairing.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 0, phrase: 'cool wide skillet',
    rationale: 'A wide skillet renders guanciale slowly without scorching, reduces the tomato sauce briskly, and leaves enough surface to finish long bucatini with pasta water.',
    heroAltText: 'Roman bucatini all’amatriciana with tomato, crisp guanciale, Pecorino Romano, chile, and glossy coated pasta.',
    imageBrief: 'Roman bucatini all’amatriciana, hollow bucatini strands coated in concentrated brick-red tomato sauce with crisp rendered guanciale, fine Pecorino Romano and restrained chile; glossy and clinging, no onion, garlic, basil or meatball garnish.',
  }),
  DI048: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.liguria,
    historyLead: 'Pesto Genovese belongs to Genoa and Liguria, traditionally combining basil, pine nuts, garlic, salt, Parmigiano, Pecorino, and olive oil; trofie is often served with potato and green beans cooked in the same water.',
    needId: 'food-processor', needLabel: 'Food processor', reviewCategoryId: 'food-processor', instructionIndex: 0, phrase: 'processor bowl and blade',
    rationale: 'A chilled food processor makes the household batch quickly while short pulses limit friction heat that can darken basil and split the oil; a marble mortar remains the traditional no-purchase alternative.',
    heroAltText: 'Ligurian trofie al pesto with bright green basil sauce, potato, green beans, pine nuts, and grated cheese.',
    imageBrief: 'Ligurian trofie al pesto, twisted pasta with tender potato pieces and green beans evenly coated off heat in vivid bright-green basil pesto, a few pine nuts and fine cheese; no browned pesto, cream, tomato or oil slick.',
  }),
  DI049: spec({
    difficulty: 'Easy', place: places.southernItaly,
    historyLead: 'Puttanesca is a mid-twentieth-century southern Italian pasta whose exact birthplace and colorful name stories remain disputed among Naples, Ischia, Rome, and elsewhere; its reliable identity is the fast briny tomato sauce itself.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 0, phrase: 'wide skillet',
    rationale: 'A wide skillet melts the anchovy and cooks garlic gently, reduces tomato quickly, and gives spaghetti enough room to finish with the olives and capers intact.',
    heroAltText: 'Spaghetti puttanesca with bright tomato, olives, capers, anchovy, garlic, chile, parsley, and glossy noodles.',
    imageBrief: 'Southern Italian spaghetti puttanesca, distinct strands coated in a bright concentrated tomato sauce with torn dark olives, capers, dissolved anchovy depth, sliced garlic, chile and parsley; glossy but not wet, no cheese or invented origin symbolism.',
  }),
  DI050: spec({
    difficulty: 'Advanced', place: places.italianAmerican,
    historyLead: 'Vodka sauce rose to prominence in Italy and the United States during the late twentieth century; the creamy tomato-paste rigatoni now strongly associated with Italian-American restaurants uses vodka functionally to deglaze and bridge tomato with dairy.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 0, phrase: 'wide skillet',
    rationale: 'A wide skillet exposes tomato paste to enough direct heat to caramelize it deeply, allows vodka to reduce safely, and provides room to finish rigatoni into a stable glossy emulsion.',
    heroAltText: 'Rigatoni alla vodka with glossy orange tomato-cream sauce, Parmigiano-Reggiano, basil, and sauce-filled tubes.',
    imageBrief: 'Italian-American rigatoni alla vodka in a warm shallow bowl, al dente tubes heavily coated and filled with glossy cohesive orange tomato-cream sauce, fine Parmigiano and torn basil, subtle chile; no pink watery cream pool, raw tomato paste or excessive cheese stretch.',
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
