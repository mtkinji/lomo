import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-10.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({
  decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative,
});
const sitePublished = { publishedAt: '2026-08-21T13:00:00.000Z' };
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const mediaRoot = 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media';
const publishedHeroImages = {
  DI076: `${mediaRoot}/catalog/di076/kwilt-recipe-hero-v2/8a5a785f9b45fdd4-b4a4352fd5434489/candidate-0.webp`,
  DI077: `${mediaRoot}/catalog/di077/kwilt-recipe-hero-v2/c0eab17b542c14ef-0b55c3073b47c189/candidate-1.webp`,
  DI078: `${mediaRoot}/catalog/di078/kwilt-recipe-hero-v2/667139c5a9ed63bb-8c51d6e33dc0f089/candidate-1.webp`,
  DI079: `${mediaRoot}/catalog/di079/kwilt-recipe-hero-v2/ba9d0fb9958f3c95-531d16aeee9ee2bc/candidate-1.webp`,
  DI080: `${mediaRoot}/catalog/di080/kwilt-recipe-hero-v2/2fb4edc7bebbd227-97a55cb4f9f5f60f/candidate-0.webp`,
  DI081: `${mediaRoot}/catalog/di081/kwilt-recipe-hero-v2/670dfe87edec4482-22575e550673b0b0/candidate-1.webp`,
  DI082: `${mediaRoot}/catalog/di082/kwilt-recipe-hero-v2/c22fc15477782085-5389d7aec381a37c/candidate-1.webp`,
  DI083: `${mediaRoot}/catalog/di083/kwilt-recipe-hero-v2/b0f8b197f6728ef9-2e12ffda1adda408/candidate-0.webp`,
  DI084: `${mediaRoot}/catalog/di084/kwilt-recipe-hero-v2/aea79c3b7670b764-34b4e8d004ee75b0/candidate-1.webp`,
  DI085: `${mediaRoot}/catalog/di085/kwilt-recipe-hero-v2/964807259616077d-a368553a3bf76217/candidate-0.webp`,
  DI086: `${mediaRoot}/catalog/di086/kwilt-recipe-hero-v2/f3cbef1a3988499b-f777ea338fb521bc/candidate-1.webp`,
  DI087: `${mediaRoot}/catalog/di087/kwilt-recipe-hero-v2/c7ec02f324603c8a-e7463c5687840ddd/candidate-0.webp`,
  DI088: `${mediaRoot}/catalog/di088/kwilt-recipe-hero-v2/e04d00f46556bba2-58a10ea47f84d870/candidate-1.webp`,
  DI089: `${mediaRoot}/catalog/di089/kwilt-recipe-hero-v2/933be0cffdafa1bd-cdb60a26fc01d394/candidate-1.webp`,
  DI090: `${mediaRoot}/catalog/di090/kwilt-recipe-hero-v2/d8dd3ee5920b9d1b-c699b0901a5e2a17/candidate-0.webp`,
  DI091: `${mediaRoot}/catalog/di091/kwilt-recipe-hero-v2/34ebdd344d659b1f-3d5640e610b62861/candidate-1.webp`,
  DI092: `${mediaRoot}/catalog/di092/kwilt-recipe-hero-v2/f48b66f3553e7311-5d6b65089856ab39/candidate-1.webp`,
  DI093: `${mediaRoot}/catalog/di093/kwilt-recipe-hero-v2/f54331a6b1d0b8d3-4950079f54ed4a9c/candidate-1.webp`,
  DI094: `${mediaRoot}/catalog/di094/kwilt-recipe-hero-v2/287cf4e21d82c65d-2fcf65e34ac8abb6/candidate-0.webp`,
  DI095: `${mediaRoot}/catalog/di095/kwilt-recipe-hero-v2/3ff4e7f14078d364-225082cd502a0a5d/candidate-0.webp`,
  DI096: `${mediaRoot}/catalog/di096/kwilt-recipe-hero-v2/754f02120b214755-248da37ba9adb21e/candidate-0.webp`,
  DI097: `${mediaRoot}/catalog/di097/kwilt-recipe-hero-v2/57a42090331c52ba-abaa99e4b51dbfce/candidate-1.webp`,
  DI098: `${mediaRoot}/catalog/di098/kwilt-recipe-hero-v2/f860bcc0d5c4dd3d-26a41647733bcce9/candidate-1.webp`,
  DI099: `${mediaRoot}/catalog/di099/kwilt-recipe-hero-v2/459cf410a7dd8919-3e76065682861880/candidate-0.webp`,
  DI100: `${mediaRoot}/catalog/di100/kwilt-recipe-hero-v2/ad27672976be78b1-a2d4bbe3d17afd24/candidate-0.webp`,
};

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
  hidalgo: origin('Hidalgo, Mexico', 'Central Mexican barbacoa traditions', 20.0911, -98.7624, '484', 820),
  mexico: origin('Mexico', 'Mexican regional and household cooking', 23.6345, -102.5528, '484', 520),
  veracruz: origin('Veracruz, Mexico', 'Gulf-coast Veracruz cooking traditions', 19.1738, -96.1342, '484', 820),
  oaxaca: origin('Oaxaca, Mexico', 'Oaxacan cooking traditions', 17.0732, -96.7266, '484', 820),
  tijuana: origin('Tijuana, Baja California', 'Modern northern Mexican and cross-border taquería culture', 32.5149, -117.0382, ['484', '840'], 720),
  centralMexico: origin('Central Mexico', 'Central Mexican enchilada traditions', 19.4326, -99.1332, '484', 700),
  puebla: origin('Puebla, Mexico', 'Seasonal Poblano cooking traditions', 19.0414, -98.2063, '484', 840),
  borderlands: origin('Texas–Mexico borderlands', 'South Texas and northern Mexican border cooking', 26.9, -99.2, ['840', '484'], 640),
  texMex: origin('Texas, United States', 'Tex-Mex household and restaurant cooking', 29.4241, -98.4936, ['840', '484'], 650),
  southwest: origin('Southwestern United States', 'Southwestern, New Mexican, and Tex-Mex restaurant traditions', 34.5199, -105.8701, ['840', '484'], 560),
  guerrero: origin('Guerrero coast, Mexico', 'Whole fire-grilled fish traditions of Guerrero', 17.6417, -101.5517, '484', 760),
  sichuan: origin('Sichuan, China', 'Sichuan cooking traditions', 30.5728, 104.0668, '156', 720),
  chineseAmerican: origin('United States', 'Chinese American restaurant cooking', 37.7749, -122.4194, ['840', '156'], 520),
  china: origin('China', 'Chinese household cooking', 35.8617, 104.1954, '156', 520),
  chongqing: origin('Sichuan and Chongqing, China', 'Sichuan–Chongqing restaurant cooking', 29.563, 106.5516, '156', 650),
  hunan: origin('Hunan, China', 'Hunan red-braising traditions', 28.2282, 112.9388, '156', 760),
  cantonese: origin('Guangdong and Hong Kong', 'Cantonese siu mei roast-meat traditions', 22.3193, 114.1694, '156', 680),
};

const spec = (value) => ({ costTier: '$$', difficulty: 'Moderate', sourceIndexes: [0, 1], ...value });
const specs = {
  DI076: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.hidalgo,
    historyLead: 'Central Mexican barbacoa de borrego is especially associated with Hidalgo, Tlaxcala, and Estado de México, where maguey-wrapped lamb traditionally cooks overnight in an earth pit above a consommé vessel.',
    needId: 'roasting-pan', needLabel: 'Deep roasting pan with rack', reviewCategoryId: 'roasting-pan', instructionIndex: 1, phrase: 'deep roasting pan',
    rationale: 'A deep roasting pan with a sturdy rack recreates the two-level steaming structure: the banana-leaf-wrapped lamb remains above the broth while its drippings season the consommé below.',
    heroAltText: 'Banana-leaf-wrapped lamb barbacoa pulled into large tender pieces beside chickpea-rice consommé, tortillas, onion, cilantro, and lime.',
    imageBrief: 'Central Mexican lamb barbacoa household adaptation, opened glossy banana-leaf parcel with collagen-rich lamb pulled into large moist pieces, separate clear reddish consommé with chickpeas and rice, warm tortillas, diced onion, cilantro and lime; no buried meat in broth, dry shreds or claim of an earth pit.',
  }),
  DI077: spec({
    place: places.mexico,
    historyLead: 'Pollo asado names many Mexican grilled-chicken expressions rather than one national formula. Achiote belongs to some regional and household branches, while others rely on different chile, citrus, and spice balances.',
    needId: 'grill', needLabel: 'Two-zone outdoor grill', reviewCategoryId: 'outdoor-grill', instructionIndex: 1, phrase: 'grill',
    rationale: 'A grill with distinct direct and indirect zones gives the spatchcocked chicken deep skin color first, then controlled finishing heat for separate breast and thigh endpoints without flare-up scorching.',
    heroAltText: 'Carved achiote-citrus pollo asado with deeply marked skin, juicy breast and thigh meat, tortillas, pico de gallo, and lime.',
    imageBrief: 'Mexican achiote-citrus pollo asado, spatchcocked whole chicken or clearly connected carved quarters with deeply marked red-orange skin, juicy fully cooked breast and thigh meat, restrained tortillas, pico de gallo and lime; no raw center, blackened skin or sugary glaze.',
  }),
  DI078: spec({
    place: places.veracruz,
    historyLead: 'Pescado a la veracruzana reflects the Gulf port’s Indigenous Mexican ingredients alongside Spanish and wider trade influences: tomato and chile meet olives, capers, herbs, onion, and garlic.',
    needId: 'covered-skillet', needLabel: 'Wide lidded skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 1, phrase: 'wide lidded skillet',
    rationale: 'A wide lidded skillet reduces the tomato mixture efficiently, then holds the fish pieces in one layer for gentle covered cooking without breaking or crowding them.',
    heroAltText: 'Veracruz-style fish fillets in chunky tomato sauce with olives, capers, güero chiles, herbs, and intact flaky pieces.',
    imageBrief: 'Mexican Gulf-coast pescado a la veracruzana household fillet branch, several intact white-fish portions nestled in a chunky glossy fresh-tomato sauce with visible green olives, capers, pale güero chiles, onion and parsley; no whole-snapper claim, red bell-pepper strips or broken fish stew.',
  }),
  DI079: spec({
    place: places.mexico,
    historyLead: 'A la diabla describes a spicy red-chile preparation, not one fixed nationwide sauce. Mexican coastal cooks variously reach for árbol, guajillo, chipotle, serrano, tomato, orange, or other household balances.',
    needId: 'skillet', needLabel: 'Wide skillet', reviewCategoryId: '12-inch-covered-skillet', instructionIndex: 2, phrase: 'wide skillet',
    rationale: 'A wide skillet sears the shrimp quickly in one layer, then provides enough exposed surface to fry and concentrate the strained chile-tomato sauce before the shrimp return briefly.',
    heroAltText: 'Camarones a la diabla with plump shrimp in a glossy guajillo, árbol, chipotle, and tomato sauce beside rice and tortillas.',
    imageBrief: 'Mexican camarones a la diabla, plump loose-C shrimp just cooked through in a glossy deep-red guajillo-árbol-chipotle tomato sauce, cilantro, rice and tortillas alongside; no rubbery tight curls, breading, cream or generic sweet chile glaze.',
  }),
  DI080: spec({
    costTier: '$', place: places.oaxaca,
    historyLead: 'A tlayuda is both Oaxaca’s oversized, partially toasted corn tortilla and the prepared antojito built upon it. Calling it Mexican pizza erases its own tortilla, texture, ingredients, and service traditions.',
    needId: 'comal', needLabel: 'Large comal or cast-iron griddle', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'large comal, griddle, or grill',
    rationale: 'A broad heavy cast-iron surface supplies steady contact heat for an oversized tlayuda, allowing smoky brown spots and crisp edges while the center remains flexible enough to fold.',
    heroAltText: 'Folded Oaxacan tlayuda with black beans, asiento, quesillo, cabbage, tomato, avocado, salsa, and smoky brown spots.',
    imageBrief: 'Oaxacan tlayuda on a broad comal-style surface or simple plate, one oversized corn tortilla folded and cut to reveal a thin black-bean spread, restrained asiento, stringy quesillo, shredded cabbage, tomato and avocado, smoky brown spots with crisp-chewy edges; no flour tortilla, pizza sauce or thick cheese blanket.',
  }),
  DI081: spec({
    place: places.tijuana,
    historyLead: 'Quesabirria is a modern Mexican preparation closely associated with Tijuana and its later cross-border rise: birria and melting cheese crisped in a tortilla and served with consommé.',
    needId: 'griddle', needLabel: 'Cast-iron griddle', reviewCategoryId: 'cast-iron-skillet', instructionIndex: 1, phrase: 'cast-iron griddle',
    rationale: 'A broad cast-iron griddle gives each lightly fat-brushed tortilla direct contact for a crisp red-brown surface while leaving room to fold without trapping steam from adjacent tacos.',
    heroAltText: 'Crisp red-brown quesabirria tacos filled with juicy birria and melted cheese beside hot consommé, onion, cilantro, and lime.',
    imageBrief: 'Modern Tijuana-associated quesabirria service, four crisp red-brown corn-tortilla tacos with juicy drained birria and restrained melted Oaxaca cheese, not greasy or stacked, small bowl of hot consommé plus onion, cilantro and lime; no historical Jalisco-origin claim or orange oil puddle.',
  }),
  DI082: spec({
    costTier: '$', place: places.centralMexico,
    historyLead: 'Enchiladas verdes are a central Mexican tomatillo-sauced branch within a much larger enchilada family. Sauces may be boiled or roasted and fillings vary by region, household, and occasion.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 1, phrase: 'Blend with half the cilantro',
    rationale: 'A countertop blender turns the blistered tomatillo, serrano, onion, garlic, cilantro, and stock into a fluid salsa that can be fried and coat tortillas without becoming a chunky relish.',
    heroAltText: 'Central Mexican enchiladas verdes with chicken-filled corn tortillas, bright roasted tomatillo salsa, crema, queso fresco, onion, and cilantro.',
    imageBrief: 'Central Mexican enchiladas verdes served immediately, four distinct rolled soft corn tortillas filled with coarse chicken and coated in fluid bright-green roasted tomatillo-serrano salsa, crema, queso fresco, thin onion and cilantro; no cheese-heavy baked casserole or dry tortilla edges.',
  }),
  DI083: spec({
    costTier: '$', place: places.oaxaca,
    historyLead: 'Enfrijoladas are tortillas bathed in bean sauce, strongly associated with Oaxaca while also appearing across Mexican regions with black, bayo, and other local beans.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 0, phrase: 'Blend beans and broth',
    rationale: 'A countertop blender makes the beans, broth, avocado leaf, chile, aromatics, and cheese completely smooth so the hot sauce flows over and clings to supple tortillas.',
    heroAltText: 'Oaxacan-style black-bean enfrijoladas folded in flowing avocado-leaf bean sauce with queso fresco, crema, onion, cilantro, and salsa.',
    imageBrief: 'Oaxaca-associated enfrijoladas, three folded soft corn tortillas per warm plate clearly visible beneath a smooth flowing black-bean and avocado-leaf sauce, crumbled queso fresco, crema, thin onion, cilantro and a little tomatillo-chipotle salsa; no dry bean paste, baked cheese or meat filling.',
  }),
  DI084: spec({
    difficulty: 'Advanced', place: places.mexico,
    historyLead: 'Pipián is a Mexican family of seed-thickened sauces with green and red regional forms, rooted in long-standing use of squash seeds. It is related to, but not interchangeable with, every sauce called mole verde.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 2, phrase: 'Blend toasted seeds',
    rationale: 'A strong countertop blender integrates toasted pepitas with roasted vegetables and herbs while retaining the ground-seed body that defines pipián rather than straining it into salsa verde.',
    heroAltText: 'Chicken in green pumpkin-seed pipián with a smooth seed-forward tomatillo-herb sauce, tender chicken, toasted pepitas, and tortillas.',
    imageBrief: 'Mexican green pipián, bone-in chicken pieces coated but not buried in a smooth thick pale-green pumpkin-seed, tomatillo and herb sauce, visible toasted pepita garnish and tortillas; no bright watery salsa verde, cream swirl or strained seedless sauce.',
  }),
  DI085: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.puebla,
    historyLead: 'Chiles en nogada are a seasonal emblem of Puebla built around late-summer poblanos, nuez de Castilla, local orchard fruit, pomegranate, and a cool walnut sauce. Popular convent-and-Iturbide origin stories remain culturally important but historically disputed.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 3, phrase: 'Blend with remaining 1/2 cup fresh milk',
    rationale: 'A countertop blender makes soaked walnuts, fresh milk, goat cheese, and sherry satin-smooth and pourable without heating the cool nogada or leaving a coarse nut paste.',
    heroAltText: 'Pueblan chiles en nogada filled with pork, beef, orchard fruit, raisins, and almonds under cool walnut sauce, pomegranate, and parsley.',
    imageBrief: 'Seasonal Pueblan chiles en nogada, two intact peeled poblano chiles with stems and visible fruit-rich pork-beef picadillo, covered at service with cool ivory walnut nogada, bright pomegranate seeds and parsley; unbattered branch, no synthetic red dye, protected biznaga candy or hot boiled sauce.',
  }),
  DI086: spec({
    costTier: '$', difficulty: 'Easy', place: places.mexico,
    historyLead: 'Picadillo is a broad minced-meat family across Latin America and the Philippines. Mexican picadillos themselves branch through local vegetables, fruits, briny ingredients, spices, and household preferences.',
    needId: 'blender', needLabel: 'Countertop blender', reviewCategoryId: 'blender', instructionIndex: 0, phrase: 'Blend tomatoes',
    rationale: 'A countertop blender quickly turns ripe tomato, onion, garlic, jalapeño, water, and salt into the smooth fresh sauce that cooks around the browned beef and diced vegetables.',
    heroAltText: 'Mexican beef picadillo with browned crumbled beef, diced potatoes, carrots, peas, fresh tomato sauce, cilantro, and tortillas.',
    imageBrief: 'Mexican household picadillo in the potato-carrot-pea branch, browned small beef crumbles with distinct tender diced potato and carrot, green peas, moist reduced fresh-tomato sauce and cilantro, tortillas alongside; no raisins, olives, soupiness or generic taco-shell presentation.',
  }),
  DI087: spec({
    place: places.mexico,
    historyLead: 'Mexican adobo is a family of chile, acid, aromatic, and spice preparations used across meats and regions. It is distinct from Filipino adobo and from the prepared condiment called chipotles en adobo.',
    needId: 'dutch-oven', needLabel: 'Wide Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 2, phrase: 'wide Dutch oven',
    rationale: 'A wide Dutch oven browns the chicken skin in batches, gives the strained adobo broad contact for frying, and then holds the dark-meat pieces skin-side up during a controlled gentle braise.',
    heroAltText: 'Pollo en adobo with browned chicken thighs in a glossy guajillo-ancho, tomato, orange, and vinegar sauce beside tortillas.',
    imageBrief: 'Mexican guajillo-ancho pollo en adobo, browned bone-in chicken thighs with skin remaining visible above a glossy brick-red strained chile-tomato-orange sauce, tortillas alongside; no blackened chiles, watery braise, boneless cubes or Filipino soy-vinegar presentation.',
  }),
  DI088: spec({
    difficulty: 'Easy', place: places.borderlands,
    historyLead: 'Fajitas grew from the Texas–Mexico borderlands and South Texas ranch cooking. The word originally referred to grilled skirt steak; chicken fajitas are a later restaurant and household extension.',
    needId: 'sheet-pan', needLabel: 'Heavy rimmed half-sheet pan', reviewCategoryId: 'rimmed-half-sheet', instructionIndex: 0, phrase: 'heavy rimmed sheet pan',
    rationale: 'A heavy preheated rimmed half-sheet gives the chicken immediate browning space and enough perimeter to add peppers and onions without piling them into a pale, watery steam bath.',
    heroAltText: 'One-pan chicken fajitas with browned ancho-lime chicken thighs, charred peppers and onions, warm flour tortillas, pico de gallo, and avocado.',
    imageBrief: 'Texas–Mexico borderlands one-pan chicken fajita adaptation on a heavy rimmed sheet pan, distinct browned chicken-thigh strips with charred red, yellow and green peppers and onion, lime juices, warm flour tortillas, pico and avocado; no pale steamed vegetables, pooled water or sizzling restaurant skillet claim.',
  }),
  DI089: spec({
    costTier: '$', difficulty: 'Easy', place: places.texMex,
    historyLead: 'Taco casserole is an American Tex-Mex household format rather than a traditional Mexican taco preparation. Its appeal is a familiar layered combination of seasoned beef, beans, corn, tortillas, cheese, and cool garnishes.',
    needId: 'baking-dish', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 3, phrase: '9-by-13-inch dish',
    rationale: 'A standard nine-by-thirteen dish holds two even tortilla-and-beef layers at a shallow enough depth for bubbling browned edges and cohesive slices after the required rest.',
    heroAltText: 'Sliced Tex-Mex beef taco casserole with layered corn tortillas, seasoned beef, beans, corn, browned cheese, lettuce, tomato, sour cream, and scallions.',
    imageBrief: 'American Tex-Mex beef taco casserole, one rested square cut showing two distinct layers of lightly dried corn tortilla quarters, reduced seasoned beef, black beans, corn and melted browned cheese, fresh lettuce, tomato, sour cream and scallions added only after baking; no crushed-chip mush or Mexican authenticity claim.',
  }),
  DI090: spec({
    costTier: '$', place: places.southwest,
    historyLead: 'Smothered or wet burritos belong to intertwined Southwestern, New Mexican, and Tex-Mex restaurant traditions rather than one universal Mexican form.',
    needId: 'baking-dish', needLabel: '9-by-13-inch baking dish', reviewCategoryId: '9-by-13-baking-pan', instructionIndex: 2, phrase: '9-by-13-inch dish',
    rationale: 'A nine-by-thirteen dish keeps the tightly rolled burritos seam-side down in one layer, containing just enough hot ancho gravy for a brief bake without flooding and dissolving the tortillas.',
    heroAltText: 'Tex-Mex smothered beef burritos with flour tortillas, seasoned beef, refried beans, ancho gravy, bubbling Jack cheese, tomato, and scallions.',
    imageBrief: 'Tex-Mex smothered beef burritos in a rectangular baking dish, four or six tightly rolled flour tortillas still structurally distinct beneath spoon-coating reddish ancho gravy and bubbling Monterey Jack, one cut end showing reduced beef and beans, tomato and scallion finish; no flooded soggy casserole or enchilada label.',
  }),
  DI091: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.guerrero,
    historyLead: 'Pescado a la talla is a whole fire-grilled fish tradition of Guerrero’s coast, including Ixtapa–Zihuatanejo and Acapulco. Red adobo is foundational; Gabriela Cámara’s influential Contramar version popularized a two-tone red-and-green presentation.',
    needId: 'fish-basket', needLabel: 'Whole-fish grilling basket', reviewCategoryId: 'whole-fish-grilling-basket', instructionIndex: 0, phrase: 'large fish-grilling basket',
    rationale: 'A whole-fish basket supports the snapper across both turns, keeps the skin against the heat for release and browning, and protects the adobo-coated flesh from tearing over the grate.',
    heroAltText: 'Whole grilled huachinango a la talla with one red-adobo half, one parsley-serrano half, browned skin, tortillas, beans, and pickled onion.',
    imageBrief: 'Guerrero-coast huachinango a la talla in Gabriela Cámara’s influential bicolor lineage, one butterflied whole red snapper with head and tail, browned intact skin and cooked flaky flesh, one half brushed brick-red guajillo adobo and the other vivid parsley-serrano green, tortillas, beans and pickled onion; no fillets, raw center or generic rainbow-trout identity.',
  }),
  DI092: spec({
    place: places.sichuan,
    historyLead: 'Gong bao ji ding is a Sichuan dish with Chinese regional and international variations. This branch keeps diced chicken, peanuts, dried chiles, Sichuan pepper, scallion, and a restrained sweet-sour-savory glaze rather than the syrupy bell-pepper-heavy Chinese American form.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 1, phrase: 'wok',
    rationale: 'A responsive carbon-steel wok reaches the intense heat needed to sear evenly diced chicken, then cools quickly enough to bloom dried chiles and peppercorns for seconds without blackening them.',
    heroAltText: 'Sichuan-leaning kung pao chicken with evenly diced glazed chicken, peanuts, dried chiles, Sichuan pepper, and scallions.',
    imageBrief: 'Sichuan-leaning gong bao ji ding, small evenly diced chicken just glazed rather than saucy, roasted peanuts, dried red chiles, visible scallion segments and restrained Sichuan pepper on a simple shared plate, rice alongside; no bell peppers, broccoli, syrup pool or breaded chicken.',
  }),
  DI093: spec({
    place: places.chineseAmerican,
    historyLead: 'Beef and broccoli is a Chinese American restaurant dish related to Chinese beef-and-gai-lan stir-fries but built around widely available American broccoli.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 2, phrase: 'wok',
    rationale: 'A broad carbon-steel wok supplies the high heat and open surface needed to sear thin velveted beef in batches, boil the sauce rapidly, and toss in blanched broccoli without steaming either component.',
    heroAltText: 'Chinese American beef and broccoli with thin browned flank steak, vivid green florets, and a light glossy oyster-soy sauce over rice.',
    imageBrief: 'Chinese American restaurant-style beef and broccoli, thin across-grain flank steak slices visibly browned and tender, vivid crisp-tender broccoli florets, light glossy oyster-soy glaze that clings without pooling, rice alongside; no gray beef, limp olive broccoli or thick brown gravy.',
  }),
  DI094: spec({
    difficulty: 'Advanced', place: places.sichuan,
    historyLead: 'Mapo tofu is a Sichuan dish defined by tender tofu, chile-bean paste, fermented black beans, meat, and the hot-numbing fragrance of fresh-ground Sichuan pepper.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 1, phrase: 'wok',
    rationale: 'A carbon-steel wok gives beef and Pixian doubanjiang direct contact for browning and red-oil development while its sloped sides let the cook shake and nudge fragile tofu rather than stir it apart.',
    heroAltText: 'Sichuan mapo tofu with intact tender tofu cubes, crisp beef, fluid red chile-bean sauce, scallions, and ground Sichuan pepper.',
    imageBrief: 'Sichuan mapo tofu in a shallow shared bowl, many intact soft white tofu cubes suspended in a fluid glossy brick-red doubanjiang and douchi sauce, small crisp beef bits, scallion greens and finely ground Sichuan pepper; no thick paste blanket, broken tofu scramble or bell peppers.',
  }),
  DI095: spec({
    costTier: '$', difficulty: 'Easy', place: places.china,
    historyLead: 'Tomato-and-egg stir-fry—fanqie chao dan or xihongshi chao jidan—is everyday Chinese home cooking, with family preferences ranging from dry to saucy and savory to lightly sweet.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 0, phrase: 'wok',
    rationale: 'A responsive carbon-steel wok sets broad glossy egg curds quickly, then cooks tomato wedges just long enough to release juice before the eggs return for only a few folds.',
    heroAltText: 'Chinese tomato and egg stir-fry with broad soft yellow curds, juicy red tomato wedges, scallions, and a light glossy sauce over rice.',
    imageBrief: 'Everyday Chinese tomato-and-egg stir-fry, broad soft glossy yellow egg curds still bite-size, ripe red tomato wedges with collapsed edges but intact centers, light natural tomato juices and scallion greens over or beside rice; no ketchup-red sauce, dry scrambled bits or omelet form.',
  }),
  DI096: spec({
    difficulty: 'Advanced', place: places.sichuan,
    historyLead: 'Hui guo rou literally describes pork returned to the wok and is a foundational Sichuan home-style dish. Its first cook sets the belly; chilling enables thin slices; the second cook renders and curls them in fermented chile-bean sauce.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 2, phrase: 'Heat a wok over medium-high',
    rationale: 'A carbon-steel wok renders thin belly slices quickly until they curl, then provides responsive lower heat for frying doubanjiang, sweet wheat paste, and douchi before the pork returns.',
    heroAltText: 'Sichuan twice-cooked pork with thin curled belly slices, leeks, green chiles, scallions, and a glossy fermented chile-bean coating.',
    imageBrief: 'Sichuan hui guo rou, very thin skin-fat-meat pork-belly slices curled into shallow cups with rendered bronze edges, crisp-tender leeks, long green chiles and scallions in a thin red-brown doubanjiang coating, rice alongside; no cabbage, bell-pepper pile or thick sweet sauce.',
  }),
  DI097: spec({
    place: places.sichuan,
    historyLead: 'Gan bian si ji dou is a Sichuan dry-fried green-bean dish in which wrinkled beans, a small amount of pork, and sui mi ya cai create a dry, intensely savory finish.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 0, phrase: 'wok',
    rationale: 'A broad carbon-steel wok shallow-fries thoroughly dry beans in controlled batches for the defining blistered wrinkles, then concentrates pork, ya cai, chiles, and aromatics into a dry cling.',
    heroAltText: 'Sichuan dry-fried green beans with blistered wrinkled pods, crisp pork, ya cai, dried chiles, garlic, ginger, and no loose sauce.',
    imageBrief: 'Sichuan gan bian green beans, long green pods visibly blistered and wrinkled yet intact, sparse tiny crisp pork and sui mi ya cai bits, dried red chiles, garlic and ginger clinging dryly on a shared plate, rice alongside; no glossy sauce pool, steamed bright beans or large meat chunks.',
  }),
  DI098: spec({
    costTier: '$$$', difficulty: 'Advanced', place: places.chongqing,
    historyLead: 'Shui zhu yu literally means water-boiled fish: a Sichuan–Chongqing restaurant dish whose delicate poached fish sits beneath a dramatic chile, peppercorn, and hot-oil aromatic finish.',
    needId: 'wok', needLabel: 'Flat-bottom carbon-steel wok', reviewCategoryId: 'carbon-steel-wok', instructionIndex: 1, phrase: 'wok',
    rationale: 'A carbon-steel wok fries Pixian doubanjiang and aromatics, holds a controlled bare simmer for thin fish slices, and then heats the finishing oil rapidly enough to bloom fresh chiles and peppercorns at service.',
    heroAltText: 'Sichuan–Chongqing boiled fish with delicate white fish slices, bean sprouts, red broth, dried chiles, Sichuan peppercorns, scallions, and sizzling oil.',
    imageBrief: 'Sichuan–Chongqing shui zhu yu in a large heatproof serving bowl, delicate intact thin white-fish slices visibly poached in red broth only halfway up, bean sprouts beneath, dramatic but plausible dried chiles, green and red Sichuan peppercorns, garlic and scallion aromatics sizzling on top; not deep-fried fish or an opaque oil bath.',
  }),
  DI099: spec({
    difficulty: 'Advanced', place: places.hunan,
    historyLead: 'Red-braised pork exists across China. Mao-style hongshao rou is a Hunan variant associated with Mao Zedong because it was reportedly a favorite, not because he invented red braising.',
    needId: 'dutch-oven', needLabel: 'Heavy wok or Dutch oven', reviewCategoryId: 'dutch-oven', instructionIndex: 1, phrase: 'heavy wok or Dutch oven',
    rationale: 'A heavy Dutch oven gives the rock-sugar caramel stable low heat, contains the long gentle belly braise, and retains enough even heat for a final reduction that glazes rather than scorches the tender cubes.',
    heroAltText: 'Hunan-style red-braised pork belly with glossy amber-red cubes, intact skin and layers, light chile warmth, rice, and bok choy.',
    imageBrief: 'Hunan Mao-style red-braised pork belly, large even cubes with intact skin-fat-meat layers, fully tender but holding shape under a glossy clinging amber-red caramel and rice-wine glaze, a few dried chiles, rice and bok choy; no black sauce pool, shredded pork or claim that Mao invented the dish.',
  }),
  DI100: spec({
    difficulty: 'Advanced', place: places.cantonese,
    historyLead: 'Char siu is Cantonese fork-roasted pork within the siu mei roast-meat tradition, traditionally hung in a specialized high-heat oven for airflow, rendered edges, repeated glazing, and char.',
    needId: 'wire-rack', needLabel: 'Oven-safe wire rack', reviewCategoryId: 'wire-rack', instructionIndex: 2, phrase: 'rack over a foil-lined pan',
    rationale: 'An oven-safe wire rack exposes the long pork strips to hot air on every side while the lined water pan catches drips, supporting repeated glazing and edge char without letting the meat stew in its runoff.',
    heroAltText: 'Cantonese char siu pork with glossy mahogany strips, charred edges, juicy sliced centers, rice, and bok choy.',
    imageBrief: 'Cantonese home-oven char siu, several long thick pork-shoulder strips with glossy natural mahogany fermented-bean-curd and maltose glaze, watched black-charred edges and juicy fully cooked slices cut across grain, rice and bok choy; no synthetic neon-red dye, wet sauce pool or boneless rib shape.',
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
