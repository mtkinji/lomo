import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-03.json');
const seed = require('../../../../src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');

const accept = (...positions) => Object.fromEntries(positions.map((position) => [position, { accept: true }]));
const approved = (rationale) => ({ decision: 'approved', rationale });
const reviewCategory = (needId, reviewCategoryId, rationale, noPurchaseAlternative) => ({ decision: 'review_category', needId, reviewCategoryId, rationale, noPurchaseAlternative });
const publishedImage = (storageRef, altText) => ({ state: 'published', storageRef, altText, width: 1536, height: 1024 });
const sitePublished = { publishedAt: '2026-08-20T23:30:00.000Z' };

const publishedHeroImages = {
  BR021: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br021/kwilt-recipe-hero-v2/b461d70fc5a5c892-02baf104f8daf29a/candidate-0.webp',
  BR022: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br022/kwilt-recipe-hero-v2/7f050963b7c56804-5c5fe5ffbe7f7276/candidate-1.webp',
  BR023: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br023/kwilt-recipe-hero-v2/3dffffe237cb784e-510af1782e0c9a6c/candidate-1.webp',
  BR024: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br024/kwilt-recipe-hero-v2/d64c6d7f48483c15-4ae14ac10488ac47/candidate-1.webp',
  BR025: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br025/kwilt-recipe-hero-v2/28d267abed6e0608-43e3affc5847ee1d/candidate-0.webp',
  BR026: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br026/kwilt-recipe-hero-v2/5c2b6746eb001e59-83ad591ca36676ec/candidate-1.webp',
  BR027: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br027/kwilt-recipe-hero-v2/d9ad4dcc22c5a724-4ad438f990a45527/candidate-0.webp',
  BR028: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br028/kwilt-recipe-hero-v2/fc169cd57664bb57-00288f15886f7f53/candidate-2.webp',
  BR029: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br029/kwilt-recipe-hero-v2/3ae2788ff221a924-293a8e1f63b23c0c/candidate-1.webp',
  BR030: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br030/kwilt-recipe-hero-v2/c21b08f124628fbe-3a8b6325d374752b/candidate-0.webp',
  BR031: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br031/kwilt-recipe-hero-v1/3e74d0f685d6dfa6-642dc91ce0f2ee70/candidate-1.webp',
  BR032: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br032/kwilt-recipe-hero-v2/2144c7b0d1f46a91-eea787c4fc465b50/candidate-1.webp',
  BR033: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br033/kwilt-recipe-hero-v2/4e78dd9cdd575fc1-5256952b94fea1d8/candidate-0.webp',
  BR034: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br034/kwilt-recipe-hero-v2/705942b85b7304e8-dedebc9a3b94b256/candidate-0.webp',
  BR035: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br035/kwilt-recipe-hero-v2/22d732e63a382c7d-c92cbed32dee897e/candidate-0.webp',
  BR036: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br036/kwilt-recipe-hero-v2/2bff976a0278f18b-b2e424aadd9c2def/candidate-0.webp',
  BR037: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br037/kwilt-recipe-hero-v2/6661b1964125accf-1f223017853a1d0e/candidate-0.webp',
  BR038: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br038/kwilt-recipe-hero-v2/b461f121881bd19f-8d109e5cca4cfe4a/candidate-2.webp',
  BR039: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br039/kwilt-recipe-hero-v2/e6da9b46475d3bf0-88def0cab8f6e9dd/candidate-0.webp',
  BR040: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br040/kwilt-recipe-hero-v2/eb91259abfbdcdc3-b989edea46dbcd97/candidate-0.webp',
  BR041: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br041/kwilt-recipe-hero-v2/d5914580c6e703d6-02be1fe247edf34f/candidate-0.webp',
  BR042: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br042/kwilt-recipe-hero-v2/9f2dc3e5f7d4fdd4-0860d878f3dbb0da/candidate-0.webp',
  BR043: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br043/kwilt-recipe-hero-v2/6d2f89497fd65339-65711280f6998f4a/candidate-2.webp',
  BR044: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br044/kwilt-recipe-hero-v2/b6b6f56808e939e5-1d7d0a6d5d4cce3b/candidate-2.webp',
  BR045: 'https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/recipe-catalog-media/catalog/br045/kwilt-recipe-hero-v2/53e2c26aa04f8d5d-1e7d76bcce755507/candidate-1.webp',
};

const origin = (label, region, latitude, longitude, countryId, scale = 600) => ({
  label,
  region,
  markers: [{ label, latitude, longitude }],
  map: { center: [longitude, latitude], scale, highlightedCountryIds: [countryId] },
});

const places = {
  southIndia: origin('South India', 'South Indian breakfast traditions', 13.0827, 80.2707, '356', 720),
  northIndia: origin('North India', 'North Indian and Punjabi breakfast traditions', 28.6139, 77.209, '356', 690),
  india: origin('India', 'Indian breakfast traditions', 22.9734, 78.6569, '356', 560),
  china: origin('China', 'Chinese breakfast traditions', 35.8617, 104.1954, '156', 540),
  taiwan: origin('Taiwan', 'Taiwanese breakfast-shop tradition', 23.6978, 120.9605, '158', 780),
  japan: origin('Japan', 'Japanese household breakfast tradition', 36.2048, 138.2529, '392', 620),
  korea: origin('Korea', 'Korean household breakfast tradition', 36.5, 127.8, '410', 690),
  thailand: origin('Thailand', 'Thai breakfast tradition', 15.87, 100.9925, '764', 640),
  vietnam: origin('Vietnam', 'Vietnamese breakfast tradition', 14.0583, 108.2772, '704', 620),
  philippines: origin('Philippines', 'Filipino silog and breakfast traditions', 12.8797, 121.774, '608', 610),
  malaysia: origin('Malaysia', 'Malaysian breakfast tradition', 4.2105, 101.9758, '458', 650),
  singapore: origin('Singapore', 'Singaporean kopitiam breakfast tradition', 1.3521, 103.8198, '702', 980),
  indonesia: origin('Indonesia', 'Indonesian breakfast tradition', -2.5489, 118.0149, '360', 530),
};

const spec = (costTier, difficulty, place, historyLead, needId, needLabel, reviewCategoryId, instructionIndex, phrase, rationale, heroAltText, imageBrief = heroAltText) => ({
  costTier, difficulty, place, historyLead, needId, needLabel, reviewCategoryId, instructionIndex, phrase, rationale, heroAltText, imageBrief,
});

const specs = {
  BR021: spec('$$', 'Advanced', places.southIndia, 'Masala dosa pairs a fermented rice-and-urad batter with a dry spiced potato filling and is widely served with sambar and coconut chutney across South India.', 'griddle', 'Flat griddle or wide heavy skillet', 'cast-iron-skillet', 4, 'flat griddle', 'A broad heavy cooking surface supports the fast circular spread and crisp release that define a thin dosa.', 'A crisp folded masala dosa with visible potato filling, sambar, coconut chutney, and curry leaves.', 'One long, thin, deeply crisp South Indian dosa folded around a modest dry potato masala, with distinct bowls of sambar and coconut chutney; believable fermented lace and no thick pancake texture.'),
  BR022: spec('$', 'Moderate', places.southIndia, 'Idli are steamed South Indian rice-and-lentil cakes whose light texture depends on aerated urad dal batter and warm fermentation.', 'blender', 'High-powered blender', 'blender', 3, 'Blend coconut', 'A capable blender makes the aerated dal batter and spoonable coconut chutney practical without leaving coarse, heavy pockets.', 'Soft white idli with coconut chutney, mustard-seed tempering, curry leaves, and green chile.', 'Six plump matte-white idli with softly rounded tops and an airy torn center beside fresh coconut chutney topped with mustard seeds and curry leaves; no browned surfaces.'),
  BR023: spec('$', 'Easy', places.india, 'Poha is a broad Indian family of dishes built from flattened rice; the onion, mustard, curry-leaf, peanut, turmeric, and lemon form is especially familiar in western and central India.', 'skillet', 'Wide heavy skillet', 'cast-iron-skillet', 1, 'Heat oil over medium', 'A broad skillet gives the tempering room to bloom and lets the hydrated flakes steam without being crushed.', 'Yellow vegetable poha with separate flattened-rice flakes, peanuts, peas, onion, cilantro, and lemon.', 'Warm yellow poha with visibly separate flexible flakes, crisp peanuts, peas, translucent onion, cilantro and lemon; shallow serving bowl, never wet or mashed.'),
  BR024: spec('$', 'Easy', places.southIndia, 'Upma is a South Indian savory breakfast commonly made by roasting rava, tempering aromatics and lentils, and hydrating the grain with hot water.', 'whisk', 'Balloon whisk', 'balloon-whisk', 3, 'whisking continuously', 'A comfortable whisk helps rain the roasted semolina into boiling water without forming dense lumps.', 'Fluffy savory semolina upma with carrot, peas, mustard seeds, curry leaves, ginger, and cilantro.', 'Soft but fluffy South Indian rava upma mounded in a bowl, separate fine grains with carrot, peas, mustard seeds and curry leaves; cilantro and lemon, no paste-like surface.'),
  BR025: spec('$', 'Moderate', places.northIndia, 'Aloo paratha is a North Indian stuffed flatbread, particularly associated with Punjabi cooking, built by enclosing a dry seasoned potato filling in atta dough before griddling.', 'tawa', 'Wide heavy tawa or skillet', 'cast-iron-skillet', 4, 'hot dry tawa', 'A broad heavy surface supplies the even contact needed for brown blisters without scorching the filled center.', 'Golden aloo paratha with brown blisters, one wedge showing spiced potato filling, yogurt, and pickle.', 'Two round North Indian aloo parathas with irregular brown blisters and light ghee sheen, one cut to show an even thin layer of dry spiced potato, yogurt and pickle alongside.'),
  BR026: spec('$$', 'Advanced', places.northIndia, 'Chole bhature is a North Indian pairing strongly associated with Punjabi and Delhi food culture: spiced chickpeas served with a large, freshly fried leavened bread.', 'fry-thermometer', 'Clip-on frying thermometer', 'clip-on-frying-thermometer', 4, 'frying oil to 375°F', 'A clip-on thermometer keeps the oil hot enough to puff bhature quickly while limiting greasiness and scorching.', 'Punjabi chole with two puffed golden bhature, red onion, lemon, cilantro, and glossy chickpea gravy.', 'Deep bowl of dark glossy Punjabi chole with intact creamy chickpeas beside two large freshly puffed golden bhature, red onion, lemon and cilantro; no flat oily bread.'),
  BR027: spec('$', 'Easy', places.india, 'Masala omelets are a common Indian home, street, and canteen breakfast, with finely cut onion, tomato, chile, cilantro, and warm spices cooked into a thin egg layer.', 'skillet', '8-inch skillet', '8-inch-skillet', 1, '8-inch skillet', 'An 8-inch skillet keeps each three-egg omelet thin enough to brown quickly while the vegetables stay distributed.', 'Thin browned Indian masala omelet with onion, tomato, green chile, cilantro, cumin, and buttered toast.', 'One thin golden Indian masala omelet folded loosely with tiny red onion, seeded tomato, green chile and cilantro visible throughout, buttered toast at the side; no thick French roll.'),
  BR028: spec('$', 'Easy', places.china, 'Congee is a broad Chinese rice-porridge tradition with many regional and household forms; chicken and ginger make a gentle savory version suited to breakfast.', 'pot', 'Heavy covered pot or Dutch oven', 'dutch-oven', 0, 'Bring to a boil', 'A heavy pot moderates the long lively simmer and reduces scorching as the rice breaks down and thickens.', 'Loose chicken congee with tender ginger-marinated chicken, scallions, fried shallots, and sesame oil.', 'Wide bowl of flowing Cantonese-style chicken congee with rice grains mostly broken down, several just-cooked chicken slices, fine ginger, scallion and fried shallot; pale and glossy, not a solid mound.'),
  BR029: spec('$', 'Moderate', places.china, 'Jianbing is a Chinese street breakfast crepe assembled to order with egg, scallion, sauces, herbs, and a brittle fried crisp folded inside.', 'skillet', '10-inch nonstick skillet', '10-inch-nonstick-skillet', 1, '10-inch nonstick skillet', 'A low-sided 10-inch nonstick pan lets the thin batter spread, flip, and release before the crisp center is folded in.', 'Folded jianbing breakfast crepe with egg, scallion, cilantro, sesame, chile sauce, and crisp wonton sheets.', 'Chinese jianbing folded into a rectangular handheld packet, a cut end revealing thin crepe, egg, scallion, cilantro, dark sauce and a visibly crisp wonton layer; griddle-stall feel without overstuffing.'),
  BR030: spec('$', 'Moderate', places.taiwan, 'Dan bing are a Taiwanese breakfast-shop staple: a chewy starch-enriched crepe bonded to egg, rolled, sliced, and served with thick soy and chile sauce.', 'skillet', '8-inch nonstick skillet', '8-inch-skillet', 2, '8-inch nonstick skillet', 'A small nonstick skillet makes the thin crepe easy to swirl, bond to egg, roll, and release intact.', 'Sliced Taiwanese dan bing egg crepe with scallions, chewy layers, thick soy sauce, and chile sauce.', 'Taiwanese dan bing sliced into six bite-size rolled pieces, distinct thin chewy crepe and egg layers with scallion, thick soy and chile sauce nearby; simple breakfast-shop plate.'),
  BR032: spec('$', 'Easy', places.japan, 'Tamago kake gohan is a Japanese bowl of steaming rice mixed rapidly with raw egg and soy sauce; egg handling and rice temperature are central to this version.', 'rice-cooker', 'Short-grain rice cooker', 'rice-cooker', 1, 'steaming-hot rice', 'A reliable short-grain setting makes the genuinely hot, evenly hydrated rice that gives this minimal bowl its texture.', 'Japanese tamago kake gohan with glossy egg-coated short-grain rice, scallion, nori, sesame, and soy.', 'Small Japanese rice bowl of glossy short-grain rice beaten with pasteurized egg until lightly foamy, topped sparingly with scallion, torn nori and sesame; no intact raw egg shell or decorative clutter.'),
  BR033: spec('$', 'Easy', places.japan, 'Okayu is Japanese rice porridge, typically gentler and less broken-down than many other Asian porridges, with simple salty toppings such as umeboshi.', 'pot', 'Heavy covered pot or Dutch oven', 'dutch-oven', 1, 'heavy pot', 'A heavy covered pot maintains the very gentle simmer that softens short-grain rice without requiring constant stirring.', 'Japanese okayu with very soft short-grain rice, umeboshi, scallion, sesame, and nori strips.', 'Quiet bowl of pale Japanese okayu with very soft but still identifiable short-grain rice, one red umeboshi, scallion, sesame and fine nori strips; clean restrained presentation.'),
  BR034: spec('$$', 'Moderate', places.japan, 'A traditional Japanese breakfast often combines rice, miso soup, pickles, and grilled fish; shiozake uses measured salt and refrigerated drying to season salmon and crisp its skin.', 'rack', 'Wire rack', 'wire-rack', 1, 'rack over a tray', 'A wire rack lets the salted salmon drain and dry under refrigeration so the broiler can blister rather than steam the skin.', 'Japanese salted salmon breakfast with rice, miso soup, grated daikon, and cucumber pickle.', 'Balanced Japanese breakfast tray with a modest blistered skin-on shiozake fillet, separate rice and miso bowls, grated daikon and cucumber sunomono; no teriyaki glaze.'),
  BR035: spec('$', 'Easy', places.korea, 'Kimchi bokkeumbap is a Korean fried-rice preparation that uses mature kimchi and often leftover rice, with the kimchi cooked down before the grains are fried.', 'skillet', 'Wide heavy skillet', 'cast-iron-skillet', 1, 'wide skillet', 'A broad skillet provides enough evaporation and contact area to caramelize kimchi before the cold rice is added.', 'Red kimchi fried rice with distinct grains, caramelized kimchi, a crisp-edged fried egg, gim, scallion, and sesame.', 'Korean kimchi bokkeumbap in a shallow bowl, distinct evenly red rice grains and caramelized kimchi topped with one crisp-edged runny-yolk egg, gim, scallion and sesame; not wet or saucy.'),
  BR036: spec('$', 'Easy', places.korea, 'Gyeran bap is a fast Korean household meal of hot rice, fried egg, soy, sesame oil, gim, and simple garnishes mixed together just before eating.', 'skillet', '8-inch skillet', '8-inch-skillet', 1, 'skillet over medium-high', 'A small skillet concentrates the butter and oil around one or two eggs for set whites, crisp edges, and runny yolks.', 'Korean gyeran bap with hot rice, a crisp-edged runny egg, gim, scallion, sesame, soy, and kimchi.', 'Warm Korean rice bowl topped with one lacy crisp-edged fried egg and runny yolk, crumbled gim, scallion and sesame, small kimchi dish alongside; simple household breakfast.'),
  BR037: spec('$', 'Moderate', places.thailand, 'Jok is a Thai breakfast rice porridge cooked until the grains fully collapse, often served with seasoned pork, ginger, aromatics, and a softly set egg.', 'pot', 'Heavy covered pot or Dutch oven', 'dutch-oven', 0, 'Simmer rice in water', 'A deep heavy pot gives the porridge room to bubble while limiting hot spots during the long breakdown of the rice.', 'Thai jok with smooth rice porridge, seasoned pork, a soft egg, ginger, scallion, cilantro, and fried garlic.', 'Deep bowl of smooth flowing Thai jok with rice fully broken down, small tender pork pieces, a softly set egg emerging from the center, julienned ginger, scallion, cilantro and fried garlic.'),
  BR038: spec('$', 'Advanced', places.vietnam, 'Bánh cuốn are Vietnamese steamed rice rolls: paper-thin translucent wrappers folded around a dry pork and wood-ear filling and served with herbs, vegetables, shallots, and nước chấm.', 'skillet', '10-inch nonstick skillet', '10-inch-nonstick-skillet', 3, 'nonstick skillet', 'A broad low-sided nonstick pan supports the home-kitchen steaming method and clean release of extremely thin wrappers.', 'Vietnamese bánh cuốn rice rolls with pork and wood ear, fried shallots, herbs, cucumber, sprouts, and nước chấm.', 'Several translucent white Vietnamese bánh cuốn rolls loosely wrapped around a fine pork and wood-ear filling, topped with fried shallots beside herbs, cucumber, sprouts and clear amber nước chấm; delicate not rubbery.'),
  BR039: spec('$$$', 'Moderate', places.vietnam, 'Bò kho is a Vietnamese aromatic beef stew commonly eaten with bread or noodles and served across the day, including as a hearty breakfast.', 'dutch-oven', 'Covered Dutch oven', 'dutch-oven', 1, 'Dutch oven', 'A heavy Dutch oven supports batch browning, a stable long simmer, and the late addition of carrots without rapid evaporation.', 'Vietnamese bò kho with tender beef, carrots, aromatic red broth, herbs, lime, onion, and a crisp baguette.', 'Vietnamese bò kho in a deep bowl with large tender beef and carrot pieces in a clear brick-red lightly glossy broth, Thai basil, cilantro, lime and crisp small baguette alongside; no opaque gravy.'),
  BR040: spec('$$', 'Moderate', places.philippines, 'Tosilog is a Filipino silog plate combining sweet-cured tocino, sinangag garlic rice, and itlog egg, with tomato and spiced vinegar for contrast.', 'skillet', 'Wide heavy skillet', 'cast-iron-skillet', 1, 'wide skillet', 'A broad skillet provides room to simmer the sliced pork tender and then caramelize its sugary cure without crowding.', 'Filipino tosilog with caramelized red tocino, garlic fried rice, fried egg, tomato, and spiced vinegar.', 'Filipino tosilog plate with glossy caramelized reddish pork tocino slices, mound of garlic fried rice with pale-gold garlic, one fried egg, ripe tomato and spiced vinegar; no fluorescent color.'),
  BR041: spec('$$', 'Moderate', places.philippines, 'Longsilog is a Filipino breakfast plate of longganisa, garlic fried rice, and egg; this skinless household version rests the seasoned pork before simmering and browning.', 'skillet', 'Wide heavy skillet', 'cast-iron-skillet', 1, 'skillet', 'A broad heavy skillet lets the shaped links simmer through and then brown evenly after the water evaporates.', 'Filipino longsilog with browned skinless longganisa, garlic rice, fried egg, tomato, and spiced vinegar.', 'Filipino longsilog plate with three short browned skinless longganisa links, garlic fried rice, one fried egg, tomato wedges and chile vinegar; juicy cooked centers and no raw pink pork.'),
  BR042: spec('$$', 'Easy', places.philippines, 'Champorado is Filipino chocolate rice porridge made with glutinous rice and traditionally balanced by evaporated milk and a salty accompaniment such as tuyo.', 'pot', 'Heavy covered pot or Dutch oven', 'dutch-oven', 0, 'heavy pot', 'A heavy pot moderates the sticky rice as it thickens and reduces the chance of scorching after tablea is whisked in.', 'Filipino champorado with glossy chocolate glutinous-rice porridge, evaporated milk, crisp tuyo, and mango.', 'Bowl of flowing dark Filipino champorado with visible tender glutinous rice and a pale evaporated-milk swirl, two small crisp fried tuyo served clearly alongside and a few mango slices; not pudding-stiff.'),
  BR043: spec('$$', 'Advanced', places.malaysia, 'Nasi lemak is a defining Malaysian coconut-rice meal commonly eaten at breakfast, accompanied by sambal, crisp anchovies, peanuts, egg, and cucumber.', 'blender', 'High-powered blender', 'blender', 1, 'Blend chiles', 'A blender turns soaked chiles, aromatics, belacan, tamarind, and anchovy into the fine paste needed for a long, oil-separating sambal cook.', 'Malaysian nasi lemak with coconut rice, dark sambal, crisp anchovies, peanuts, egg, and cucumber.', 'Classic Malaysian nasi lemak plate with pandan coconut rice, separate dark glossy sambal, crisp ikan bilis, roasted peanuts, halved egg and cucumber; crisp items kept out of the sauce.'),
  BR044: spec('$$', 'Advanced', places.singapore, 'Kaya toast with soft eggs is a Singaporean kopitiam breakfast: crisp thin toast sandwiches pandan-coconut egg jam and cold butter, served with very soft eggs, dark soy, and white pepper.', 'saucepan', 'Medium saucepan', 'medium-saucepan', 1, 'barely simmering water', 'A stable medium saucepan forms the controlled water bath that cooks the egg-rich kaya gently to a safe, smooth texture.', 'Singaporean kaya toast fingers with cold butter and pandan kaya beside soft eggs seasoned with dark soy and white pepper.', 'Singapore kopitiam breakfast: thin crisp kaya toast sandwiches cut into fingers with visible cold butter and caramel-green pandan kaya, beside a shallow bowl holding two very soft eggs with dark soy and white pepper.'),
  BR045: spec('$$', 'Moderate', places.indonesia, 'Bubur ayam is Indonesian chicken rice porridge served with aromatic yellow broth, shredded chicken, sweet soy, herbs, fried shallots, crackers, and sambal.', 'pot', 'Heavy covered pot or Dutch oven', 'dutch-oven', 0, 'Simmer rice', 'A deep heavy pot provides room for the long porridge simmer and reduces scorching as the rice breaks down.', 'Indonesian bubur ayam with creamy rice porridge, yellow chicken broth, shredded chicken, kecap manis, herbs, shallots, crackers, and sambal.', 'Indonesian bubur ayam in a deep bowl: pale broken-rice porridge moistened with clear yellow chicken broth, shredded chicken, kecap manis, scallion, fried shallot, celery leaves, sambal and crackers held crisp on top.'),
};

function authorRecipe(manifestRecipe) {
  const task = manifestRecipe.researchTask;
  const value = specs[manifestRecipe.rosterId];
  const source = (entry) => ({ title: entry.title, publisher: entry.publisher, url: entry.url });
  return {
    cookingReview: approved(`Reviewed against the batch evidence: ${task.existingResearch.nonNegotiableTechniques.join(' ')} The method retains the defining texture and sequencing cues and addresses the documented failure risks.`),
    reviewedAt: '2026-08-20',
    publication: sitePublished,
    costTier: value.costTier,
    difficulty: value.difficulty,
    ingredientReview: accept(...task.ingredients.map((_, position) => position)),
    commerce: reviewCategory(value.needId, value.reviewCategoryId, value.rationale, `Use a sturdy ${value.needLabel.toLowerCase()} already owned and follow the same heat, spacing, and doneness cues.`),
    equipmentNeeds: [{ id: value.needId, label: value.needLabel, reviewCategoryId: value.reviewCategoryId }],
    equipmentAnnotations: [{ instructionIndex: value.instructionIndex, phrase: value.phrase, needId: value.needId, focus: 'specialty' }],
    origin: value.place,
    history: {
      paragraphs: [value.historyLead, `${task.notes} This Kwilt version follows the reviewed household adaptation: ${task.existingResearch.adaptationDecision}`],
      sources: task.sources.slice(0, 2).map(source),
    },
    heroImage: publishedImage(publishedHeroImages[manifestRecipe.rosterId], value.heroAltText),
    heroAltText: value.heroAltText,
    imageBrief: value.imageBrief,
  };
}

function authorExisting(record) {
  const tamagoyakiSource = { title: 'Classic Tamagoyaki', publisher: 'Just One Cookbook', url: 'https://www.justonecookbook.com/tamagoyaki/' };
  return {
    cookingReview: approved('Previously reviewed and published; retained without downgrading its cooking, ingredient, origin, history, equipment, commerce, image, or publication evidence.'),
    reviewedAt: record.review.reviewedAt,
    publication: record.publication ?? sitePublished,
    costTier: record.costTier ?? '$$',
    difficulty: record.difficulty ?? 'Moderate',
    ingredientReview: accept(...Array.from({ length: 16 }, (_, position) => position)),
    commerce: record.commerce ?? reviewCategory('tamagoyaki-pan', 'tamagoyaki-pan', 'A rectangular pan makes the repeated thin layers easier to roll evenly without overbrowning.', 'Use a well-seasoned 8-inch skillet over medium-low heat and expect rounded ends.'),
    equipmentNeeds: record.equipmentNeeds,
    equipmentAnnotations: record.equipmentAnnotations,
    origin: record.origin,
    history: {
      ...record.history,
      sources: record.history.sources.some(({ url }) => url === tamagoyakiSource.url)
        ? record.history.sources
        : [...record.history.sources, tamagoyakiSource],
    },
    heroImage: record.heroImage,
    heroAltText: record.heroImage.altText,
    imageBrief: record.heroImage.altText,
  };
}

const existingById = new Map(seed.recipes.map((record) => [record.rosterId, record]));
export default Object.fromEntries(manifest.recipes.map((manifestRecipe) => [
  manifestRecipe.rosterId,
  manifestRecipe.researchTask ? authorRecipe(manifestRecipe) : authorExisting(existingById.get(manifestRecipe.rosterId)),
]));
