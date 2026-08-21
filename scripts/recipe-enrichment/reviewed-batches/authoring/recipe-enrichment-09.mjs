import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-09.json');
const seed = require('../../../../src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({
  decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative,
});
const sitePublished = { publishedAt: '2026-08-21T11:00:00.000Z' };
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const mediaRoot = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media';
const publishedHeroImages = {
  DI051: `${mediaRoot}/catalog/di051/kwilt-recipe-hero-v2/6a7c42075a4c2a9e-4cc09294dedafa2f/candidate-1.webp`,
  DI052: `${mediaRoot}/catalog/di052/kwilt-recipe-hero-v2/4e1d24b303461820-c05e5844ee16090b/candidate-0.webp`,
  DI053: `${mediaRoot}/catalog/di053/kwilt-recipe-hero-v2/838123311da487ca-bbc191d30e4c7ab0/candidate-1.webp`,
  DI054: `${mediaRoot}/catalog/di054/kwilt-recipe-hero-v2/b44d68c2064adda5-8cbc398244eb4e24/candidate-0.webp`,
  DI055: `${mediaRoot}/catalog/di055/kwilt-recipe-hero-v2/c802dc1362393556-1b1be6f56036f58e/candidate-0.webp`,
  DI056: `${mediaRoot}/catalog/di056/kwilt-recipe-hero-v2/a00cad87b4cc0bd9-3d38bf53305a7cdc/candidate-0.webp`,
  DI057: `${mediaRoot}/catalog/di057/kwilt-recipe-hero-v2/be09c2918fa95948-b01747f4ff31348c/candidate-1.webp`,
  DI058: `${mediaRoot}/catalog/di058/kwilt-recipe-hero-v2/c8280a9d58874f27-48d6a536a95496dc/candidate-0.webp`,
  DI059: `${mediaRoot}/catalog/di059/kwilt-recipe-hero-v2/2694a6b4199660e2-7a135bb82e480439/candidate-0.webp`,
  DI060: `${mediaRoot}/catalog/di060/kwilt-recipe-hero-v2/a506a54ef539c91d-131ee156ee76c0e7/candidate-0.webp`,
  DI062: `${mediaRoot}/catalog/di062/kwilt-recipe-hero-v2/d8e8f5435935dd7f-26af2f02d7a51cc8/candidate-0.webp`,
  DI063: `${mediaRoot}/catalog/di063/kwilt-recipe-hero-v2/3a609e75be6da57c-00c99c43fe293ecf/candidate-1.webp`,
  DI064: `${mediaRoot}/catalog/di064/kwilt-recipe-hero-v2/ad7cc60ff7e3ce8e-0f4a41113c6196df/candidate-1.webp`,
  DI065: `${mediaRoot}/catalog/di065/kwilt-recipe-hero-v2/352869227fe4b74d-75837a09ded8da80/candidate-0.webp`,
  DI066: `${mediaRoot}/catalog/di066/kwilt-recipe-hero-v2/55e316d1f489e130-0cdf7bedd686a5e9/candidate-1.webp`,
  DI067: `${mediaRoot}/catalog/di067/kwilt-recipe-hero-v2/a695172bf29da904-9fef6cef8220fb8a/candidate-0.webp`,
  DI068: `${mediaRoot}/catalog/di068/kwilt-recipe-hero-v2/cfb077c08b2662cd-c32efa88c66eb31a/candidate-0.webp`,
  DI069: `${mediaRoot}/catalog/di069/kwilt-recipe-hero-v2/6934c64d8b9b126b-14382176abfcfbf9/candidate-0.webp`,
  DI070: `${mediaRoot}/catalog/di070/kwilt-recipe-hero-v2/2e69ec40e5d7581b-ad44605543c38090/candidate-0.webp`,
  DI071: `${mediaRoot}/catalog/di071/kwilt-recipe-hero-v2/15d79f042ed8d495-cda5eeb607f1660c/candidate-1.webp`,
  DI072: `${mediaRoot}/catalog/di072/kwilt-recipe-hero-v2/3d467a62bfca0882-687827df943ffaae/candidate-0.webp`,
  DI073: `${mediaRoot}/catalog/di073/kwilt-recipe-hero-v2/a23831d69bb56d4c-6f909cac9b38156a/candidate-0.webp`,
  DI074: `${mediaRoot}/catalog/di074/kwilt-recipe-hero-v2/dcc6838c43ac8e63-a27dc76845446c71/candidate-1.webp`,
  DI075: `${mediaRoot}/catalog/di075/kwilt-recipe-hero-v2/7dd1e5342fda4950-2e2dbb56a4349c92/candidate-1.webp`,
};
const existingByRosterId = new Map(seed.recipes.map((record) => [record.rosterId, record]));

const origin = (label, region, latitude, longitude, countryIds, scale = 700) => ({
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
  southernItaly: origin('Southern Italy', 'Southern Italian cooking traditions', 40.8518, 14.2681, '380', 720),
  italianAmerican: origin('United States', 'Italian American restaurant and home cooking', 40.7128, -74.006, ['840', '380'], 500),
  milan: origin('Milan, Lombardy', 'Milanese and Lombard cooking traditions', 45.4642, 9.19, '380', 900),
  rome: origin('Rome, Lazio', 'Roman cooking traditions', 41.9028, 12.4964, '380', 880),
  northernItaly: origin('Northern Italy', 'Northern Italian rice and polenta traditions', 45.4384, 10.9916, '380', 690),
  italy: origin('Italy', 'Italian regional home cooking', 42.8333, 12.8333, '380', 560),
  palermo: origin('Palermo, Sicily', 'Palermitan and Sicilian baking traditions', 38.1157, 13.3615, '380', 900),
  coastalItaly: origin('Italian Mediterranean coast', 'Italian coastal cooking traditions', 41.1171, 16.8719, '380', 680),
  centralItaly: origin('Central Italy', 'Central Italian porchetta traditions', 42.5, 12.5, '380', 670),
  mexico: origin('Mexico', 'Mexican regional home cooking', 23.6345, -102.5528, '484', 520),
  jalisco: origin('Jalisco, Mexico', 'Jalisciense birria traditions', 20.6597, -103.3496, '484', 780),
  northernMexico: origin('Northern Mexico', 'Northern Mexican grilling traditions', 27.5, -105.0, '484', 650),
  mexicoCity: origin('Mexico City', 'Central Mexican taquería traditions', 19.4326, -99.1332, '484', 840),
  yucatan: origin('Yucatán, Mexico', 'Yucatecan Maya-rooted cooking traditions', 20.9674, -89.5926, '484', 780),
  michoacan: origin('Michoacán, Mexico', 'Michoacán carnitas traditions', 19.5665, -101.7068, '484', 760),
  puebla: origin('Puebla, Mexico', 'Poblano cooking traditions', 19.0414, -98.2063, '484', 820),
};

const spec = (value) => ({ costTier: '$$', difficulty: 'Moderate', sourceIndexes: [0, 1], ...value });
const specs = {
  DI051: spec({
    place: places.southernItaly, sourceIndexes: [0, 2],
    historyLead: 'Parmigiana di melanzane belongs to southern Italian cooking, but Sicily, Campania, and Parma all appear in competing origin explanations. Its enduring identity is more useful than a false single birthplace: thin fried eggplant, concentrated tomato, basil, mozzarella, and aged cheese assembled in restrained layers.',
    needId: 'baking-dish', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 3, phrase: '9-by-13-inch baking dish',
    rationale: 'A standard nine-by-thirteen dish keeps four eggplant layers snug and evenly sauced while providing enough exposed edge for bubbling and browning without making the center excessively deep.',
    heroAltText: 'Eggplant parmigiana with four thin layers of fried eggplant, concentrated tomato, basil, mozzarella, and Parmigiano.',
    imageBrief: 'Southern Italian eggplant parmigiana in a modest rectangular baking dish, one rested square showing four thin silky unbreaded fried eggplant layers, concentrated brick-red tomato, restrained melted mozzarella, Parmigiano and basil, browned bubbling edges; no breadcrumb crust, watery sauce pool or cheese-heavy casserole.',
  }),
  DI052: spec({
    difficulty: 'Easy', place: places.italianAmerican,
    historyLead: 'Chicken piccata is an Italian American restaurant classic descended from Italian scaloppine preparations. In Italy, piccata is more traditionally associated with veal; the familiar American chicken version keeps the thin cutlet and bright pan-sauce structure while using capers and lemon prominently.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 1, phrase: 'wide skillet',
    rationale: 'A wide skillet browns four thin cutlets without steaming and preserves enough exposed fond for the reduced wine, stock, caper, lemon, and cold-butter sauce.',
    heroAltText: 'Golden chicken piccata cutlets with a glossy lemon-butter pan sauce, capers, parsley, and lemon.',
    imageBrief: 'Italian American chicken piccata, four thin evenly golden cutlets on a warm platter, glossy translucent lemon-butter pan sauce spooned lightly over and around them, visible capers, parsley and lemon; chicken remains crisp-edged and fully cooked, no thick flour gravy or deep sauce bath.',
  }),
  DI053: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.milan,
    historyLead: 'Osso buco is specifically Milanese: cross-cut veal shanks whose name points to the marrow-filled “bone with a hole.” White wine, broth, a restrained soffritto, and last-minute parsley-lemon-garlic gremolata preserve the older white-braise family rather than turning the dish into a tomato stew.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'wide Dutch oven',
    rationale: 'A wide heavy Dutch oven holds six shanks in one snug layer after browning, buffers the covered oven braise, and reduces the cooking liquid without dislodging the marrow.',
    heroAltText: 'Milanese osso buco with tender veal shanks, intact marrow bones, pale braising sauce, vegetables, and fresh gremolata.',
    imageBrief: 'Milanese osso buco, one or two cross-cut veal shanks with round marrow centers intact, fork-tender meat still attached to bone in a glossy pale wine-stock sauce with fine soffritto, bright parsley-lemon-garlic gremolata scattered at serving; no tomato-heavy red stew or detached bare bones.',
  }),
  DI054: spec({
    place: places.rome,
    historyLead: 'Saltimbocca alla romana is canonically thin veal with prosciutto and sage, though its deeper birthplace is debated. This chicken version is a transparent poultry adaptation: it preserves the defining trio and a simple wine-butter pan sauce without pretending to be the original Roman cutlet.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 1, phrase: 'wide skillet',
    rationale: 'A wide skillet gives the prosciutto-covered cutlets direct contact for crisp adhesion, then retains their fond for a fast reduced wine-and-butter sauce.',
    heroAltText: 'Chicken saltimbocca cutlets topped with crisp prosciutto and sage beside a glossy white-wine butter sauce.',
    imageBrief: 'Chicken saltimbocca adaptation on a simple platter, four thin golden chicken cutlets with one crisp prosciutto sheet and two visible sage leaves adhered to each, glossy reduced white-wine butter sauce spooned around rather than over the ham; no cheese, capers or breadcrumb coating.',
  }),
  DI055: spec({
    difficulty: 'Advanced', place: places.milan,
    historyLead: 'Risotto alla milanese is a codified Lombard preparation, not generic saffron rice. Marrow, meat broth, onion, wine, butter, aged cheese, and saffron build its flavor, while all’onda describes the loose, rippling finish that should spread rather than mound.',
    needId: 'pan', needLabel: 'Wide heavy pan', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 1, phrase: 'wide heavy pan',
    rationale: 'A wide heavy pan keeps rice in a shallow, evenly simmering layer and provides enough room to beat in cold butter and Parmigiano for the flowing all’onda finish.',
    heroAltText: 'Risotto alla milanese with flowing saffron-gold Carnaroli rice, Parmigiano, and a glossy all’onda finish.',
    imageBrief: 'Milanese saffron risotto in a wide warm shallow bowl, vivid natural saffron-gold Carnaroli grains suspended in glossy flowing all’onda sauce that settles outward, fine Parmigiano only; no stiff mound, cream pool, turmeric-orange color or decorative saffron overload.',
  }),
  DI056: spec({
    difficulty: 'Advanced', place: places.northernItaly,
    historyLead: 'Mushroom risotto belongs broadly to northern Italian rice cooking rather than to one protected town recipe. Dried porcini deepen the broth while separately browned fresh mushrooms preserve distinct texture; “wild” describes the flavor family and does not imply every mushroom was foraged.',
    needId: 'pan', needLabel: 'Wide pan', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 1, phrase: 'wide pan',
    rationale: 'A wide pan gives fresh mushrooms enough contact to brown in batches, then keeps the rice at a controlled shallow simmer for a flowing final emulsion.',
    heroAltText: 'Wild mushroom risotto with flowing Carnaroli rice, browned mixed mushrooms, porcini, parsley, and Parmigiano.',
    imageBrief: 'Northern Italian mushroom risotto in a broad shallow bowl, distinct al dente Carnaroli grains in a loose glossy sauce, deeply browned cremini, shiitake, oyster or maitake pieces and porcini with parsley and fine Parmigiano; no stiff rice mound, raw pale mushrooms or cream soup texture.',
  }),
  DI057: spec({
    costTier: '$', difficulty: 'Advanced', place: places.italy,
    historyLead: 'Potato gnocchi appear across several Italian regions and households, with texture governed more by potato dryness and gentle handling than by one universal formula. Baking floury potatoes, ricing them hot, and folding in minimal flour produces pillows rather than dense dumplings.',
    needId: 'ricer', needLabel: 'Fine potato ricer', reviewCategoryId: 'potato-ricer', instructionIndex: 0, phrase: 'through a ricer',
    rationale: 'A fine-hole potato ricer turns hot baked russets into dry, even strands without the shearing action that can release excess starch and make gnocchi gluey.',
    heroAltText: 'Potato gnocchi pillows glazed with brown butter, crisp sage, Parmigiano, and black pepper.',
    imageBrief: 'Italian potato gnocchi with brown butter sage, small irregular hand-cut pillows holding clean rounded edges, lightly glossy with hazelnut-brown butter, crisp whole sage leaves, fine Parmigiano and black pepper; tender matte interiors visible in one cut piece, no dense giant dumplings or cream sauce.',
  }),
  DI058: spec({
    difficulty: 'Advanced', place: places.italy,
    historyLead: 'Ricotta-filled ravioli have many legitimate Italian regional forms, sauces, and cheese traditions. This cow’s-milk ricotta version is intentionally broad rather than presented as one universal original, pairing carefully sealed fresh pasta with a restrained tomato-butter sauce.',
    needId: 'pasta-machine', needLabel: 'Hand-cranked pasta machine', reviewCategoryId: 'pasta-machine', instructionIndex: 2, phrase: 'pasta machine',
    rationale: 'A stable hand-cranked roller thins rested dough gradually into matching translucent sheets, making it easier to expel air and form tender sealed edges around the ricotta.',
    heroAltText: 'Handmade ricotta ravioli with thin sealed pasta, tomato-butter sauce, basil, and Pecorino Romano.',
    imageBrief: 'Italian ricotta ravioli in a warm shallow bowl, six or seven handmade square or round parcels with thin translucent pasta and clearly sealed unburst edges, lightly coated in bright tomato-butter sauce with basil and fine Pecorino; no overfilled balloons, torn pasta or heavy marinara pool.',
  }),
  DI059: spec({
    place: places.italianAmerican,
    historyLead: 'Italian American manicotti developed along two established household branches: delicate filled crespelle and accessible dried pasta tubes. This version chooses the latter while keeping the filling dry, seasoned, and structured enough to bake without turning watery.',
    needId: 'baking-dish', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 2, phrase: '9-by-13-inch dish',
    rationale: 'A standard nine-by-thirteen dish holds fourteen filled tubes in one snug layer, keeps them covered with enough sauce to finish tender, and exposes the cheese for a short final browning.',
    heroAltText: 'Spinach-ricotta manicotti tubes baked in marinara with browned mozzarella, Pecorino, and basil.',
    imageBrief: 'Italian American spinach-ricotta manicotti in a nine-by-thirteen dish, intact filled pasta tubes in one layer under bright marinara and a restrained browned mozzarella-Pecorino top, one serving revealing dry green-speckled ricotta filling; no collapsed pasta or watery cheese puddle.',
  }),
  DI060: spec({
    costTier: '$', difficulty: 'Advanced', place: origin('Naples, Campania', 'Neapolitan pizza traditions', 40.8518, 14.2681, '380', 900),
    historyLead: 'Pizza Margherita belongs to Naples and the protected Neapolitan pizza tradition, but a home oven cannot reproduce or certify a roughly 900°F, 60-to-90-second bake. This is explicitly a Neapolitan-style household adaptation that preserves the restrained tomato, fior di latte, basil, and oil balance.',
    needId: 'baking-steel', needLabel: 'Baking steel or stone', reviewCategoryId: 'baking-steel', instructionIndex: 1, phrase: 'baking steel or stone',
    rationale: 'A thoroughly preheated steel or stone stores the intense bottom heat a home oven needs to spring and spot a hand-stretched ten-inch crust before its restrained toppings overcook.',
    heroAltText: 'Home-oven Margherita pizza with a risen spotted rim, restrained tomato, drained fior di latte, basil, and olive oil.',
    imageBrief: 'Neapolitan-style home-oven Margherita pizza, one ten-inch round with a fully risen irregular rim and honest dark spotting, thin hand-stretched center, restrained crushed tomato, small melted fior di latte patches, basil and olive oil; no overloaded cheese blanket, cracker crust or impossible 900-degree leopard pattern.',
  }),
  DI062: spec({
    place: places.italy,
    historyLead: 'Cacciatora means hunter-style, but Italy has no single national chicken formula: tomato may be absent, while wine, herbs, olives, mushrooms, and cured pork vary by region. This recipe openly chooses the familiar red branch rather than presenting its ingredient set as universal.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'wide Dutch oven',
    rationale: 'A wide Dutch oven browns bone-in chicken without crowding, develops mushrooms and soffritto in the fond, and supports a gentle partially covered braise with exposed skin.',
    heroAltText: 'Chicken cacciatore with browned bone-in chicken, tomato-wine sauce, mushrooms, green olives, herbs, and exposed crisp skin.',
    imageBrief: 'Italian red-style chicken cacciatore in a wide pot, browned bone-in thighs and drumsticks with some skin left exposed above a thick rustic tomato-wine sauce, whole mushroom quarters, green olives, fine soffritto and parsley; no boneless cubes, watery soup or completely submerged pale skin.',
  }),
  DI063: spec({
    costTier: '$$$', place: places.coastalItaly,
    historyLead: 'Branzino is the Italian name for European or Mediterranean sea bass. Roasting the fish whole is common across Italian coastal cooking because the bones and skin protect its delicate flesh, though diners still need a clear warning that cleaned whole fish contains pin bones.',
    needId: 'sheet-pan', needLabel: 'Heavy rimmed sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'heavy rimmed sheet pan',
    rationale: 'A heavy preheated rimmed sheet gives two dried whole fish immediate contact heat for better skin while safely containing their oil, lemon, herbs, and juices.',
    heroAltText: 'Two whole roasted branzino with scored crisp skin, lemon, garlic, thyme, parsley, and lemon oil.',
    imageBrief: 'Italian coastal whole-roasted branzino, two intact scaled and gutted fish on a hot rimmed pan or platter, lightly crisp silver skin scored three times, cavities visibly scented with thin lemon, garlic, thyme and parsley, moist opaque flesh at one opened score; no fillets, raw glassy center or excessive char.',
  }),
  DI064: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.centralItaly,
    historyLead: 'Porchetta is a family of regional central Italian whole-pig preparations whose seasonings and local claims vary. Wrapping skin-on pork belly around a loin is a practical home adaptation, not a literal reconstruction, while fennel, herbs, tight rolling, rendered belly, and crisp skin keep the governing structure visible.',
    needId: 'roasting-pan', needLabel: 'Roasting pan with rack', reviewCategoryId: 'roasting-pan', instructionIndex: 2, phrase: 'rack over a roasting pan',
    rationale: 'A sturdy rack and roasting pan lift the tied roast so hot air reaches the skin while safely catching the substantial rendered belly fat through both the high-heat blister and slow roast.',
    heroAltText: 'Sliced home-style porchetta with blistered crackling, a visible herb spiral, pork belly, and juicy loin.',
    imageBrief: 'Central Italian-inspired household porchetta, tightly rolled belly around loin with deeply blistered golden-brown crackling, half-inch slices revealing a clear spiral of juicy pale loin, rendered belly and fennel-herb filling, twine removed; no flat roast, rubbery skin or raw pink seam.',
  }),
  DI065: spec({
    difficulty: 'Advanced', place: places.northernItaly,
    historyLead: 'Soft polenta with long-braised meat belongs broadly to northern Italian cold-weather cooking rather than to one protected town formula. “Creamy” describes the cornmeal’s flowing texture and butter-cheese finish, not the addition of heavy cream.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'heavy Dutch oven',
    rationale: 'A heavy Dutch oven provides enough surface to crust beef in batches and enough thermal stability for the long covered braise that turns chuck tender without scorching the reduced ragù.',
    heroAltText: 'Flowing yellow polenta topped with coarse tender beef ragù, tomato, herbs, and Parmigiano-Reggiano.',
    imageBrief: 'Northern Italian creamy polenta with beef ragù in warm shallow bowls, flowing sunny-yellow coarse polenta spreading beneath large moist shreds of fork-tender beef in concentrated tomato-wine sauce, fine Parmigiano and herbs; no stiff polenta block, ground-meat sauce or cream puddle.',
  }),
  DI066: spec({
    difficulty: 'Easy', place: places.italianAmerican,
    historyLead: 'Sausage and peppers is an Italian American festival, deli, and household staple rather than a standard dish imported unchanged from Italy. Tomato ranges from absent to abundant; this version uses caramelized paste and wine to support browned links and silky peppers without burying them in red sauce.',
    needId: 'braiser', needLabel: 'Wide braiser', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 0, phrase: 'wide braiser',
    rationale: 'A wide covered pan browns whole links, gives onions and peppers room to caramelize instead of steam, and then holds a shallow covered simmer until the sausages are safely cooked.',
    heroAltText: 'Italian American sausage and peppers with browned links, silky red and yellow peppers, onions, basil, and light pan juices.',
    imageBrief: 'Italian American sausage and peppers on a generous platter, whole or diagonally sliced deeply browned pork sausage links among silky red, yellow and poblano pepper strips and caramelized onion wedges, basil and light brick-red pan juices; no boiled gray sausage or abundant marinara.',
  }),
  DI067: spec({
    place: places.mexico,
    historyLead: 'Enchiladas rojas vary across Mexican households and regions in chile blend, filling, folding, and garnish. This is a rolled guajillo-ancho chicken branch, not a universal formula and not the flour-thickened chile gravy associated with some Tex-Mex plates.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 1, phrase: 'blend chiles and stock',
    rationale: 'A full-size blender turns the softened dried chiles, stock, aromatics, and spices into a smooth pourable purée before straining and frying, avoiding coarse skin fragments in the sauce.',
    heroAltText: 'Red chicken enchiladas with soft corn tortillas, guajillo-ancho sauce, queso fresco, crema, onion, and cilantro.',
    imageBrief: 'Mexican enchiladas rojas, three or four small rolled corn tortillas filled with moist shredded chicken and coated in a smooth deep-red guajillo-ancho sauce, queso fresco, thin crema, white onion and cilantro; pliable distinct tortillas, no melted yellow cheese blanket or long casserole bake.',
  }),
  DI068: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.jalisco,
    historyLead: 'Birria is a Jalisco tradition historically prepared with goat, lamb, or beef. Birria de res is a legitimate beef branch, while the now-famous fried quesabirria taco is a later service style and should not erase the foundational braised meat and consomé.',
    needId: 'dutch-oven', needLabel: 'Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'Dutch oven',
    rationale: 'A covered Dutch oven holds chuck and short ribs beneath the strained chile adobo and buffers the long oven braise that develops tender meat and a clear, separable consomé.',
    heroAltText: 'Jalisco-style beef birria in red consomé with large tender beef pieces, onion, cilantro, and lime.',
    imageBrief: 'Jalisco-style birria de res served as stew, large moist shreds and chunks of beef chuck and short rib in a deep red but translucent chile consomé with a few bright fat droplets, diced white onion, cilantro and lime alongside; no cheese, fried tacos or muddy gravy.',
  }),
  DI069: spec({
    place: places.northernMexico,
    historyLead: 'Carne asada literally means grilled meat and takes many forms across Mexico, especially in northern grilling cultures. Some cooks use citrus adobos and others little more than salt; this is one short-marinated skirt-steak branch, not the definition of the entire tradition.',
    needId: 'grill', needLabel: 'Charcoal or gas grill', reviewCategoryId: 'outdoor-grill', instructionIndex: 1, phrase: 'charcoal or gas grill',
    rationale: 'A grill capable of very high direct heat chars thin skirt steak before its interior overcooks and lets the surface dry rather than steam in residual marinade.',
    heroAltText: 'Thinly sliced carne asada with deep grill char, a juicy center, warm corn tortillas, cilantro, and lime.',
    imageBrief: 'Northern Mexican-style carne asada, broad skirt-steak sections deeply charred over high heat then sliced very thin across the long grain, juicy warm pink-to-brown interior appropriate to diner doneness, cilantro, lime and warm corn tortillas beside it; no thick steak cubes or wet citrus marinade pool.',
  }),
  DI070: spec({
    difficulty: 'Advanced', place: places.mexicoCity,
    historyLead: 'Tacos al pastor are a central Mexican taquería tradition shaped by Lebanese vertical-spit cooking: thin achiote-chile pork is stacked on a trompo, browned, and shaved to order. This paired-skewer oven stack is explicitly a household adaptation rather than a claim of trompo equivalence.',
    needId: 'skewers', needLabel: 'Long flat metal skewers', reviewCategoryId: 'metal-skewers', instructionIndex: 1, phrase: 'two parallel metal skewers',
    rationale: 'Two long flat stainless skewers support the thin pork stack vertically, resist rotation, and keep the improvised oven trompo stable over its onion base while the outside browns.',
    heroAltText: 'A tacos al pastor platter with crisp-edged achiote pork, charred pineapple, tortillas, onion, cilantro, lime, and salsa.',
    imageBrief: 'Central Mexican-inspired tacos al pastor platter from an honest oven-stack adaptation, thin shaved achiote-red pork with dark crisp edges and fully cooked juicy centers, small chopped charred pineapple, warm corn tortillas, diced white onion, cilantro, lime and salsa; no restaurant trompo, giant pineapple crown or raw inner pork.',
  }),
  DI071: spec({
    difficulty: 'Advanced', place: places.yucatan,
    historyLead: 'Cochinita pibil is a Yucatecan Maya-rooted dish: pibil refers to food wrapped and cooked in a píib earth oven, not merely to achiote seasoning. Banana leaves and a sealed home oven preserve the aromatic wrapped-braise logic while remaining an explicit adaptation.',
    needId: 'dutch-oven', needLabel: 'Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'Dutch oven',
    rationale: 'A covered Dutch oven supports crossed banana leaves and seals the achiote-marinated pork into a compact moist braise while containing its citrus juices through the long cook.',
    heroAltText: 'Yucatecan-style cochinita pibil with achiote pork, banana leaves, pickled red onion, habanero, tortillas, and citrus juices.',
    imageBrief: 'Yucatecan cochinita pibil household adaptation, coarse juicy orange-red achiote pork shreds resting in opened glossy banana leaves, bright pickled red onion and restrained habanero beside warm corn tortillas, visible citrusy juices; no barbecue sauce, cheese or false earth-oven scene.',
  }),
  DI072: spec({
    difficulty: 'Advanced', place: places.michoacan,
    historyLead: 'Carnitas are especially associated with Michoacán, where several pork cuts cook in large copper cazos of lard. This Dutch-oven version preserves the confit-then-fry structure at household scale without claiming to reproduce the vessel, volume, or communal context of a traditional carnitas shop.',
    needId: 'dutch-oven', needLabel: 'Heavy Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 0, phrase: 'heavy Dutch oven',
    rationale: 'A heavy Dutch oven safely contains shoulder, belly, water, and lard for a low lazy oven confit, then allows the clear cooking fat to separate for the final crisping step.',
    heroAltText: 'Michoacán-style carnitas with crisp bronze edges, juicy pork centers, tortillas, onion, cilantro, lime, and salsa verde.',
    imageBrief: 'Michoacán-style household carnitas platter, irregular large pork chunks chopped to show deeply crisp bronze edges beside juicy tender centers from shoulder and belly, warm corn tortillas, white onion, cilantro, lime and salsa verde; no uniform dry shreds, orange soda glaze or barbecue sauce.',
  }),
  DI073: spec({
    difficulty: 'Advanced', place: places.puebla,
    historyLead: 'Mexico has many chiles rellenos with different chiles, fillings, sauces, and battered or unbattered finishes. This is the familiar cheese-filled roasted poblano with airy capeado de huevo and tomato caldillo rather than a claim that one preparation represents them all.',
    needId: 'skillet', needLabel: 'Deep skillet', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 2, phrase: 'deep skillet',
    rationale: 'A deep heavy skillet holds enough oil for the fragile egg-battered poblanos to float and brown evenly while providing room to spoon hot oil over exposed batter safely.',
    heroAltText: 'Cheese-filled chiles rellenos with airy golden egg batter over tomato caldillo and molten Oaxaca cheese.',
    imageBrief: 'Mexican cheese chiles rellenos, whole roasted poblanos enclosed in an airy evenly golden egg capeado, one cut just enough to reveal molten Oaxaca-style cheese, each set over—not drowned under—a smooth red tomato caldillo; no breadcrumb crust, raw green skin or heavy sauce over the crisp batter.',
  }),
  DI074: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.puebla,
    historyLead: 'Mole poblano is an iconic Puebla sauce with many household formulas and contested convent-origin legends. Its depth comes from separately developing chiles, nuts, seeds, fruit, bread, tortilla, aromatics, and spice before frying and simmering the purées; chocolate remains one balancing note, not the main flavor.',
    needId: 'pot', needLabel: 'Heavy pot', reviewCategoryId: 'dutch-oven', instructionIndex: 3, phrase: 'heavy pot',
    rationale: 'A heavy deep pot provides thermal stability and splatter protection while two strained purées are fried and then simmered for more than an hour without scorching their nuts, seeds, fruit, or chiles.',
    heroAltText: 'Puebla-style mole poblano chicken coated in a dark chile-nut sauce and finished with sesame seeds.',
    imageBrief: 'Puebla-style mole poblano chicken, bone-in thigh and drumstick pieces generously coated in a smooth deep mahogany-brown chile-nut-seed sauce with subtle red undertone and sesame garnish, complex savory presentation rather than glossy chocolate dessert; no black paste, candy sweetness or raw chile flecks.',
  }),
  DI075: spec({
    difficulty: 'Advanced', place: places.mexico,
    historyLead: 'Tamales are ancient Mesoamerican foods with hundreds of regional and household forms; tamal is singular and tamales plural. Red-chile pork is one widely loved branch and naturally suits the collaborative work of a tamalada rather than standing in for every tamal tradition.',
    needId: 'steamer', needLabel: 'Tall tamale steamer', reviewCategoryId: 'tamale-steamer', instructionIndex: 4, phrase: 'steamer',
    rationale: 'A tall purpose-built steamer holds the folded tamales upright above steadily simmering water with enough headroom and circulation for the masa to set evenly across a household batch.',
    heroAltText: 'Red chile pork tamales in corn husks with set masa, moist pork filling, red chile sauce, and an opened tamal.',
    imageBrief: 'Mexican red-chile pork tamales after steaming and resting, several folded corn husks in a warm basket or platter with one tamal opened to show set tender pale masa surrounding a moist deep-red guajillo-ancho pork filling, clean husk release; no dry crumbly masa, cheese filling or banana leaves.',
  }),
};

const sicilianPizza = spec({
  costTier: '$', place: places.palermo,
  historyLead: 'Palermo’s sfincione is a thick, soft bread topped more like a seasoned loaf than a thin Neapolitan pizza. Its name is commonly connected to the Latin spongia, or sponge, matching the airy crumb; the Palermo and nearby Bagheria versions differ enough that neither should be flattened into one formula.',
  needId: 'sheet-pan', needLabel: '13-by-18-inch rimmed sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 2, phrase: '13-by-18-inch rimmed sheet pan',
  rationale: 'A true half-sheet pan gives the very soft dough its intended shallow thickness and enough perimeter for an evenly browned, oil-crisp bottom and edges.',
  heroAltText: 'Sheet-pan Sicilian sfincione with tomato, onion, anchovy, aged cheese, breadcrumbs, and oregano.',
  imageBrief: 'Palermitan sfincione in a 13-by-18-inch sheet pan, thick soft sponge-like bread with an oil-crisp bottom, dry onion-tomato topping, anchovy pressed into the base, caciocavallo, oregano and golden breadcrumbs; no thin New York slice, mozzarella blanket or wet sauce pool.',
});

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
  if (manifestRecipe.rosterId === 'DI061') {
    const existing = existingByRosterId.get('DI061');
    if (!existing?.heroImage || existing.heroImage.state !== 'published') throw new Error('DI061 published image evidence is missing.');
    return {
      cookingReview: approved('Previously reviewed sfincione was revalidated against the canonical ingredients and method. Its soft dough, onion-tomato reduction, anchovy, aged cheese, breadcrumb finish, half-sheet footprint, and Palermo-versus-Bagheria distinction remain intact.'),
      reviewedAt: '2026-08-20', publication: sitePublished,
      costTier: sicilianPizza.costTier, difficulty: sicilianPizza.difficulty,
      ingredientReview: accept(...Array.from({ length: 30 }, (_, position) => position)),
      commerce: reviewCategory(sicilianPizza.needId, sicilianPizza.reviewCategoryId, sicilianPizza.rationale, 'Use a sound 13-by-18-inch rimmed sheet pan already owned; oil it generously and preserve the specified dough depth.'),
      equipmentNeeds: [
        { id: 'mixing-bowl', label: 'Large mixing bowl' },
        { id: sicilianPizza.needId, label: sicilianPizza.needLabel, reviewCategoryId: sicilianPizza.reviewCategoryId },
        { id: 'wide-skillet', label: 'Wide skillet or sauté pan' },
        { id: 'bench-scraper', label: 'Bench scraper or flexible spatula' },
      ],
      equipmentAnnotations: [{ instructionIndex: sicilianPizza.instructionIndex, phrase: sicilianPizza.phrase, needId: sicilianPizza.needId, focus: 'specialty' }],
      origin: sicilianPizza.place,
      history: {
        paragraphs: [
          sicilianPizza.historyLead,
          'The American category called Sicilian pizza grew in its own direction, especially as square pan pizza, so it should not be treated as interchangeable with sfincione. Kwilt’s sheet-pan version looks back toward Palermo through very soft dough, deeply cooked onion and tomato, anchovy, caciocavallo, oregano, and breadcrumbs while remaining explicit about its household pan adaptation.',
        ],
        sources: [
          { title: 'Sfinciuni', publisher: 'Visit Sicily', url: 'https://www.visitsicily.info/en/ricetta/sfinciuni/' },
          { title: 'Palermo street food: what to eat in historic markets', publisher: 'Italia.it', url: 'https://www.italia.it/en/sicily/palermo/things-to-do/palermo-street-food-what-eat-historic-markets' },
        ],
      },
      heroImage: existing.heroImage,
      heroAltText: sicilianPizza.heroAltText,
      imageBrief: sicilianPizza.imageBrief,
    };
  }

  const task = manifestRecipe.researchTask;
  const value = specs[manifestRecipe.rosterId];
  if (!task || !value) throw new Error(`Missing reviewed authoring input for ${manifestRecipe.rosterId}.`);
  return {
    cookingReview: approved(`Reviewed against the batch evidence: ${task.existingResearch.nonNegotiableTechniques.join(' ')} The method preserves the defining texture, sequence, doneness, and safety cues while stating the documented household adaptation honestly.`),
    reviewedAt: '2026-08-20', publication: sitePublished,
    costTier: value.costTier, difficulty: value.difficulty,
    ingredientReview: accept(...task.ingredients.map((_, position) => position)),
    commerce: reviewCategory(value.needId, value.reviewCategoryId, value.rationale, `Use a sound ${value.needLabel.toLowerCase()} already owned and follow the same heat, spacing, handling, and doneness cues.`),
    equipmentNeeds: [{ id: value.needId, label: value.needLabel, reviewCategoryId: value.reviewCategoryId }],
    equipmentAnnotations: [{ instructionIndex: value.instructionIndex, phrase: value.phrase, needId: value.needId, focus: 'specialty' }],
    origin: value.place,
    history: authoredHistory(task, value),
    ...(publishedHeroImages[manifestRecipe.rosterId]
      ? { heroImage: publishedImage(publishedHeroImages[manifestRecipe.rosterId], value.heroAltText) }
      : {}),
    heroAltText: value.heroAltText,
    imageBrief: value.imageBrief,
  };
}

export default Object.fromEntries(manifest.recipes.map((recipe) => [recipe.rosterId, authorRecipe(recipe)]));
