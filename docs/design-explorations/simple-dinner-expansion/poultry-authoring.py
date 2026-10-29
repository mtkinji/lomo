import json
from pathlib import Path
base=Path('docs/design-explorations/simple-dinner-expansion')
recipes=json.loads((base/'batch-01-draft.json').read_text())['recipes']
S={}
def source(key,slug,signal,host='budgetbytes.com'):
 data=next((r for r in json.loads((base/'poultry-research.json').read_text()) if r['url']==f'https://www.{host}/{slug}/' and 'title' in r),None)
 assert data,(key,slug)
 S[key]={'publisher':{'budgetbytes.com':'Budget Bytes','recipetineats.com':'RecipeTin Eats','skinnytaste.com':'Skinnytaste'}[host],'title':data['title'],'url':data['url'],'rating':None,'ratingCount':None,'signal':signal}
source('chowder','potato-corn-chowder','Small potatoes soften before dairy; gentle heat protects milk.')
source('sloppy','skinny-sloppy-joes','Finely cut vegetables and reduced tomato sauce make a cohesive sandwich filling.','skinnytaste.com')
source('pestopasta','one-pot-creamy-pesto-chicken-pasta','Pasta absorbs measured broth; cream cheese and pesto finish the sauce.')
source('fried','chicken-fried-rice','Cooked dry rice and separately cooked egg avoid a wet, broken-down mixture.','recipetineats.com')
source('stroganoff','chicken-stroganoff','Brown chicken and mushrooms separately; flour thickens the sour-cream sauce.','recipetineats.com')
source('ricesoup','chicken-and-rice-soup','Rice changes broth absorption; whole bone-in chicken needs substantially longer than diced cooked meat.','recipetineats.com')
source('broccoli','chicken-and-broccoli-noodle-casserole','Parcook noodles; control broccoli moisture before adding a thickened milk sauce.','skinnytaste.com')
source('alfredo','chicken-alfredo','Reserve pasta water, rest seared chicken, and melt Parmesan gently into cream.')
source('chili','turkey-chili','Brown turkey before simmering beans and tomatoes; longer simmering develops the sauce.')
source('salad','chicken-salad','Cooked chicken, crisp vegetables and fruit balance a substantial cold meal.')
source('lettuce','chicken-lettuce-wraps','Prepare sauce before cooking; add crisp vegetables after browning mince.')
source('sausage','sausage-and-vegetable-skillet','Brown sausage first and avoid overcooking frozen vegetables.')
source('rice','creamy-chicken-and-rice-skillet','Covered rice needs moisture checks; vegetables and cheese enter late.')
source('whitechili','creamy-white-chicken-chili','Beans add body; dairy goes in after simmering and shredding chicken.')
source('mushroom','creamy-mushroom-soup','Evaporate mushroom moisture before adding flour and broth.')
source('quesadilla','quesadilla','Dry cooked filling and cheese on both sides help folded tortillas hold together.','recipetineats.com')
source('roastrice','oven-baked-chicken-and-rice','Raw rice and bone-in thighs require long covered cooking; not adopted for quick dinners.','recipetineats.com')
source('salisbury','salisbury-steak-with-mushroom-gravy','Moisten crumbs for cohesive patties; brown before finishing in mushroom gravy.','recipetineats.com')
source('orzo','one-pot-italian-chicken-orzo-risoni-pasta','Orzo requires frequent stirring and a moist finish to prevent sticking.','recipetineats.com')
source('peppers','turkey-stuffed-peppers-45-pts','Cook the filling before stuffing; covered peppers need time to soften.','skinnytaste.com')
source('shells','stuffed-shells','Undercook shells slightly for baking; excess boiling tears them during filling.')
source('lemon','easy-lemon-pepper-chicken','Even thin cutlets cook predictably; deglaze browned bits for the pan sauce.')
source('burger','skillet-cheeseburger-pasta','Covered pasta cooks in tomato broth; cheddar and relish are finishing ingredients.')
source('nachos','chicken-nachos','Spread chips in layers; fresh toppings follow melting cheese in the oven.')
source('pestoveg','easy-pesto-chicken-and-vegetables','Add squash after firmer vegetables and finish with pesto off heat.')
source('noodlesoup','chicken-noodle-soup','Soften aromatic vegetables before broth; noodles cook after chicken.')
source('fries','oven-baked-steak-fries','Single-layer potato wedges need turning and sufficient oven time.')
source('strawberry','strawberry-spinach-salad','Balsamic, berries and feta balance greens; dress shortly before serving.')
source('roast','roasted-chicken-and-vegetables','Vegetable size and exposed chicken surface govern even roasting.')
source('gnocchi','chicken-gnocchi-soup','Add gnocchi and spinach near the finish; slurry thickens the broth.','skinnytaste.com')
source('zucchini','taco-stuffed-zucchini-boats','Hollow zucchini and reduce its filling; soften boats before serving.','skinnytaste.com')
source('beanstomato','white-beans-with-mushrooms-and-marinara','Cook mushroom liquid away before adding beans, tomato and cheese.')
source('pestochicken','creamy-pesto-chicken','Thin cutlets sear quickly; tomatoes soften before pesto and cream.')
source('sesame','sesame-noodles','Mix the sauce first; noodles absorb seasoning and need tossing before serving.')
source('saute','simple-sauteed-vegetables','Stagger firm carrots and tender squash to retain texture.')
source('dumpling','easy-dumpling-soup','Follow frozen dumpling package cooking instructions; greens enter at the end.')
source('polenta','creamy-polenta','Whisk polenta into boiling liquid and finish with dairy off heat.')
source('couscous','roasted-vegetable-couscous','Quick couscous steeps covered off heat; this is not pearl couscous.')
def a(n,title,desc,ingredients,steps,keys,decision,risk,prep=10,cook=25,cuisine='Contemporary American',hands=20):
 assert n==331+len(recipes),(n,len(recipes))
 recipes.append(dict(rosterId=f'DI{n}',title=title,description=desc,category='Dinner',cuisine=cuisine,tier='household-anchor',yieldQuantity=4,yieldUnit='servings',prepMinutes=prep,cookMinutes=cook,inactiveMinutes=0,ingredients=ingredients.split('|'),instructions=steps,notes=decision+f' Estimated hands-on work: {hands} minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.',artworkIndex=(n-331)%24,kitchenTestState='desk-reviewed',research=dict(accessedAt='2026-10-16',sources=[S[k] for k in keys.split()],nonNegotiableTechniques=[steps[-2]],repeatedSuccessSignals=['The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed.'],repeatedFailureRisks=[risk],adaptationDecision=decision)))
a(337,'Chicken tortilla soup with avocado','Tomato broth, tender chicken, black beans and corn under a crunchy tortilla topping.',
'1 tablespoon olive oil|1 small onion, diced|1 teaspoon ground cumin|1 can (14.5 ounces) diced tomatoes|4 cups low-sodium chicken broth|1 can (15 ounces) black beans, rinsed and drained|1 cup frozen corn|2 cups shredded cooked rotisserie chicken|1 tablespoon lime juice|1 avocado, diced|4 ounces plain tortilla chips',[
'Heat the oil in a large soup pot over medium heat. Soften the onion for 5 minutes, then stir in the cumin for 30 seconds.',
'Add tomatoes with their juices, broth and beans. Bring to a simmer and cook for 10 minutes, stirring once or twice.',
'Add corn and chicken. Return to a simmer for 5–7 minutes until the corn is tender and the chicken reaches 165°F. Add a splash of water if the broth has reduced too far.',
'Remove from heat and add lime juice. Divide among four bowls and finish with avocado and crushed tortilla chips just before eating.'
],'chili whitechili nachos','A broth-based Tex-Mex-inspired supper distinct from the tortilla skillet: crunchy chips and cool avocado remain separate until serving.','Chips soften rapidly if left in the soup.',cook=25,cuisine='Tex-Mex-inspired',hands=15)
a(338,'Chicken pesto flatbreads with tomato salad','Crisp flatbreads topped with chicken, basil pesto and melted mozzarella, with juicy tomato salad.',
'4 naan flatbreads, about 3 ounces each|1/4 cup basil pesto|2 cups chopped cooked chicken|1 cup shredded mozzarella|5 ounces baby spinach|1 pint cherry tomatoes, halved|1 tablespoon balsamic vinegar|1 tablespoon olive oil|1/4 teaspoon fine salt',[
'Heat the oven to 425°F. Arrange naan on two baking sheets. Spread each with 1 tablespoon pesto, leaving the rim clear.',
'Divide chicken, half the spinach and mozzarella over the breads. Keep toppings in an even thin layer so the center heats through.',
'Bake for 10–14 minutes, switching sheet positions halfway, until cheese bubbles, edges are crisp and chicken reaches 165°F.',
'Toss tomatoes and remaining spinach with vinegar, oil and salt. Cut the hot flatbreads into wedges and serve immediately alongside the salad.'
],'pestoveg pestochicken nachos','Purchased naan supplies a crisp dinner base without dough preparation; spinach is divided between the hot topping and fresh side.','Overloaded naan stays soft in the center.',prep=10,cook=15,hands=15)
a(339,'Chicken and sweetcorn chowder','A creamy potato-and-corn supper with tender chicken and a gentle thyme aroma.',
'1 tablespoon butter|1 small onion, diced|2 celery ribs, thinly sliced|1 pound Yukon Gold potatoes, cut into 1/2-inch cubes|3 cups low-sodium chicken broth|2 cups frozen corn|1/2 teaspoon dried thyme|2 cups diced cooked chicken|1 cup whole milk|2 tablespoons all-purpose flour|4 whole-grain dinner rolls',[
'Melt butter in a large pot over medium heat. Cook onion and celery for 5 minutes, stirring until softened.',
'Add potatoes, broth and thyme. Bring to a simmer, cover loosely and cook 12–15 minutes until a knife easily enters the potatoes.',
'Whisk the flour into cold milk until smooth. Stir into the soup with corn and chicken; simmer gently for 5–7 minutes, stirring, until thickened and chicken reaches 165°F.',
'Mash a few potatoes against the pot to thicken further if desired. Divide into four bowls and serve with the rolls; do not boil hard after adding milk.'
],'chowder whitechili noodlesoup','Potato and flour supply body without canned soup; cooked chicken shortens the schedule while rolls make the portions dinner-sized.','Large potato pieces remain hard after the stated simmer.',cook=30,hands=18)
a(340,'Chicken stroganoff with mushrooms and noodles','Golden chicken and mushrooms in a tangy cream sauce, tucked into soft egg noodles with peas.',
'10 ounces egg noodles|1 cup frozen peas|1 pound chicken breast, cut into 1/2-inch strips|1 tablespoon olive oil|8 ounces presliced mushrooms|1 small onion, thinly sliced|1 tablespoon all-purpose flour|1 cup low-sodium chicken broth|1 tablespoon Dijon mustard|1/2 cup sour cream|1/2 teaspoon fine salt|1/4 teaspoon black pepper',[
'Bring a saucepan of water to a boil and cook noodles according to their package; add peas for the final 2 minutes. Drain, reserving 1/2 cup cooking water.',
'While the water heats, season chicken with salt and pepper. Heat oil in a wide skillet and brown chicken for 6–8 minutes, turning, until 165°F; move to a clean plate.',
'Cook mushrooms and onion in the same skillet for 6–8 minutes until their liquid evaporates. Stir in flour for 1 minute, then slowly add broth and mustard. Simmer 3 minutes until lightly thickened.',
'Reduce heat to low. Stir in sour cream and chicken without boiling. Toss in noodles and peas, adding a little reserved water to make a coating sauce, then serve.'
],'stroganoff mushroom broccoli','A full noodle supper uses peas for a vegetable and a small amount of sour cream for the characteristic tang; unlike Marsala, there is no wine reduction.','Boiling sour cream can split the sauce.',cook=25,hands=20)
a(341,'Turkey cheeseburger skillet pasta','Tender pasta shells, savory turkey and sweet peas in a creamy tomato-cheddar sauce.',
'1 tablespoon olive oil|1 pound ground turkey|1 small onion, diced|8 ounces small pasta shells|1 can (15 ounces) tomato sauce|2 cups low-sodium chicken broth|1 cup frozen peas|1 cup shredded sharp cheddar|1 tablespoon yellow mustard|2 tablespoons chopped dill pickles|1/4 teaspoon black pepper',[
'Heat oil in a deep lidded skillet. Cook turkey and onion over medium-high heat for 7–8 minutes, breaking up the meat until it reaches 165°F.',
'Stir in shells, tomato sauce and broth. Bring to a simmer, cover and reduce heat to low. Cook for 10–12 minutes, stirring every few minutes and replacing the lid.',
'Add peas for the final 3 minutes. Check that the pasta is tender; add water a splash at a time if it dries before cooking through.',
'Take off the heat. Stir in cheddar, mustard, pickles and pepper until creamy. Let stand 2 minutes and spoon into four bowls.'
],'burger rice sloppy','Turkey, peas and chopped pickles turn the cheeseburger flavor into a complete one-pan pasta; no flour thickener is needed with the pasta starch.','Unstirred shells stick to the skillet base.',cook=25,hands=18)
a(342,'Turkey zucchini taco boats','Tender zucchini boats filled with mildly seasoned turkey, beans and melted cheese.',
'4 medium zucchini, 8 ounces each|1 tablespoon olive oil|1 pound ground turkey|1 teaspoon ground cumin|1 teaspoon sweet paprika|1 can (15 ounces) black beans, rinsed and drained|1 cup mild salsa|3/4 cup shredded Monterey Jack|8 small corn tortillas|1/4 cup water',[
'Heat the oven to 425°F. Halve zucchini lengthwise and scoop out centers, leaving 1/4-inch walls. Chop the removed flesh. Place boats in a large baking dish with water, cover with foil and bake 12 minutes while preparing the filling.',
'Heat oil in a skillet. Cook turkey for 7–8 minutes, breaking it apart, until 165°F. Add chopped zucchini, cumin and paprika; cook 3 minutes. Stir in beans and salsa and simmer 3 minutes until not watery.',
'Carefully uncover the boats, drain excess water and fill with the turkey mixture, mounding it evenly. Scatter cheese over top and bake uncovered for 10–12 minutes until zucchini is easily pierced.',
'Wrap tortillas in a damp paper towel and microwave 30–60 seconds. Serve two boats per person with two tortillas and any filling that did not fit alongside.'
],'zucchini peppers chili','Prebaking zucchini while cooking turkey avoids long assembly time; beans and tortillas make this a full dinner rather than a low-starch side.','Wet filling leaks from the boats; reduce before stuffing.',prep=10,cook=30,cuisine='Tex-Mex-inspired',hands=20)
a(343,'Chicken broccoli Alfredo linguine','Silky Parmesan linguine with tender chicken and bright broccoli florets.',
'10 ounces linguine|12 ounces small broccoli florets|1 pound chicken breast cutlets, 1/2 inch thick|1 tablespoon olive oil|1 tablespoon butter|2 garlic cloves, minced|3/4 cup heavy cream|1/2 cup finely grated Parmesan|1/2 teaspoon fine salt|1/4 teaspoon black pepper',[
'Bring a large saucepan of water to a boil. Cook linguine as directed, adding broccoli for the last 3 minutes. Reserve 1 cup pasta water before draining.',
'Meanwhile season chicken with salt and pepper. Heat oil in a wide skillet and cook cutlets 3–5 minutes per side until 165°F. Rest on a clean plate while making the sauce.',
'Lower heat and melt butter in the skillet. Stir garlic for 30 seconds, then add cream and simmer gently for 2 minutes. Remove from heat and stir in Parmesan.',
'Slice the chicken. Add pasta, broccoli and chicken to the cream sauce, tossing with reserved pasta water a little at a time until silky. Serve promptly before the sauce tightens.'
],'alfredo broccoli pestopasta','American-style creamy Alfredo becomes a complete two-vessel dinner with broccoli cooked in the pasta water.','Boiling Parmesan hard or letting the pasta sit makes the sauce grainy or thick.',cook=25,hands=20)
a(344,'Tangy chicken and peppers with skillet potatoes','Tender chicken, sweet peppers and potatoes in a bright garlic-vinegar pan sauce.',
'1 pound baby potatoes, cut into 1/2-inch pieces|1/2 cup water|1 1/4 pounds boneless skinless chicken thighs, cut into 1-inch pieces|2 tablespoons olive oil, divided|2 bell peppers, sliced|2 garlic cloves, minced|1/2 cup low-sodium chicken broth|2 tablespoons red wine vinegar|1 teaspoon honey|1 teaspoon dried oregano|1/2 teaspoon fine salt',[
'Put potatoes and water in a microwave-safe covered bowl with a vent. Microwave on high 7–9 minutes, stirring halfway, until nearly tender. Drain carefully.',
'While the potatoes microwave, heat half the oil in a large skillet. Season chicken with salt and brown over medium-high heat 7–9 minutes, turning, until 165°F. Transfer to a clean plate.',
'Add remaining oil and potatoes to the skillet. Cook 4 minutes to color, then add peppers and cook 4 minutes. Stir garlic and oregano for 30 seconds.',
'Add broth, vinegar and honey. Simmer 3–4 minutes until potatoes are tender, return chicken and juices, and heat through. Divide potatoes, peppers and chicken among four plates.'
],'lemon roast saute','An original sweet-and-sour chicken skillet. The simpler name avoids presenting this sausage-free, mild dish as traditional scarpariello. Microwave-started potatoes keep the full dinner practical.','Potatoes must soften before the acidic sauce is added.',prep=10,cook=30,hands=20)
a(345,'Lemon garlic chicken couscous with cucumber yogurt','Golden chicken, fluffy couscous and cool cucumber yogurt with a lemony finish.',
'1 cup dry plain couscous|1 cup low-sodium chicken broth|4 chicken breast cutlets, 5 ounces each and 1/2 inch thick|1 tablespoon olive oil|2 garlic cloves, finely grated|2 tablespoons lemon juice, divided|1 cucumber, diced|3/4 cup plain Greek yogurt|1 pint cherry tomatoes, halved|1/2 teaspoon fine salt, divided|1/4 teaspoon black pepper',[
'Bring broth to a boil in a small saucepan. Stir in couscous, cover and remove from heat for 5 minutes, or follow its package liquid ratio. Fluff with a fork.',
'Season chicken with half the salt and the pepper. Heat oil in a wide skillet over medium heat. Cook 3–5 minutes per side until the thickest part reaches 165°F.',
'Lower heat and add garlic plus 2 tablespoons water to the chicken pan. Stir for 30 seconds, then remove from heat and drizzle with 1 tablespoon lemon juice.',
'Mix cucumber, yogurt, remaining lemon juice and remaining salt. Divide couscous, chicken and tomatoes among four plates, spooning cucumber yogurt alongside.'
],'lemon couscous pestochicken','A fresh lemon-garlic plate with cucumber yogurt replaces the proposed paprika dinner to avoid duplicating existing smoky paprika chicken.','Choose quick couscous; pearl couscous does not steep in five minutes.',prep=10,cook=20,hands=18)
a(346,'Chicken mushroom quesadillas with cabbage salad','Crisp folded tortillas hold savory mushrooms and chicken, with crunchy lime slaw alongside.',
'1 tablespoon olive oil|8 ounces presliced mushrooms|2 cups shredded cooked chicken|1/2 teaspoon ground cumin|4 large flour tortillas, 10 inches|1 cup shredded Monterey Jack|4 cups bagged shredded cabbage and carrot mix|1/3 cup plain Greek yogurt|2 tablespoons lime juice|1/4 teaspoon fine salt',[
'Heat oil in a wide skillet and cook mushrooms over medium-high heat for 6–8 minutes until their liquid evaporates. Add chicken, cumin and 2 tablespoons water; stir 3–4 minutes until chicken reaches 165°F. Transfer to a bowl.',
'Mix cabbage with yogurt, lime juice and salt in a serving bowl. Let stand while the quesadillas cook.',
'Divide cheese and filling over half of each tortilla and fold closed. Wipe the skillet dry and lower to medium. Cook two folded quesadillas at a time for 2–3 minutes per side until crisp and the cheese melts.',
'Cut each into three wedges and serve with slaw. Keep the first pair under a loose foil tent; covering tightly traps steam and softens the crust.'
],'quesadilla mushroom nachos','A mushroom-forward filling and fresh slaw distinguish these from fajitas and saucy tortilla casseroles.','Moist mushrooms make the tortilla soggy.',prep=10,cook=25,cuisine='Tex-Mex-inspired',hands=20)
def save():
 Path('src/capabilities/recipes/data/simpleDinnerPoultry.ts').write_text("import type { EditorialRecipe } from './editorialRecipeCatalog';\n\n// Original formulations; source comparisons and desk review are not kitchen tests.\nexport const SIMPLE_DINNER_POULTRY: readonly EditorialRecipe[] = "+json.dumps(recipes,ensure_ascii=False,indent=2)+';\n')
save()
a(347,'Turkey spinach sloppy Joes with cucumber spears','Saucy turkey and spinach on soft buns, with crisp cucumber for a fresh bite.',
'1 tablespoon olive oil|1 pound ground turkey|1 small onion, diced|1 cup tomato sauce|2 tablespoons ketchup|1 tablespoon Worcestershire sauce|1 teaspoon yellow mustard|4 ounces baby spinach, chopped|4 whole-wheat hamburger buns|1 large cucumber, cut into spears|1/4 cup water',[
'Heat oil in a wide skillet over medium-high heat. Cook turkey and onion for 7–8 minutes, breaking the meat into small pieces, until turkey reaches 165°F.',
'Stir in tomato sauce, ketchup, Worcestershire, mustard and water. Reduce heat and simmer uncovered for 7 minutes, stirring occasionally.',
'Add spinach and cook 2–3 minutes until wilted. The mixture should mound on a spoon without liquid running off; simmer a little longer if needed.',
'Split the buns and fill with the turkey mixture. Divide the cucumber spears among four plates and serve alongside the sandwiches.'
],'sloppy burger chili','Chopped spinach adds greens to a familiar tomato-based sandwich; the filling is reduced enough to stay on the bun.','A loose sauce soaks through bread.',cook=20,hands=18)
a(348,'Chicken fried rice with peas and carrots','Savory rice with golden chicken, soft egg and colorful peas and carrots.',
'2 pouches (8.8 ounces each) ready-cooked plain long-grain rice|1 pound chicken breast, cut into 1/2-inch pieces|2 tablespoons neutral oil, divided|2 eggs, beaten|2 cups frozen peas and diced carrots|2 garlic cloves, minced|2 tablespoons low-sodium soy sauce|1 teaspoon toasted sesame oil|2 scallions, sliced',[
'Break up the ready-cooked rice in its unopened pouches, then open and tip into a bowl. Use shelf-stable cooked rice directly; do not substitute freshly boiled wet rice.',
'Heat 1 tablespoon oil in a wide nonstick skillet. Cook chicken over medium-high heat 6–8 minutes, turning until 165°F; transfer to a clean plate.',
'Add remaining oil and scramble eggs for 1 minute until set; transfer beside the chicken. Cook frozen vegetables in the skillet 4–5 minutes until hot and any surface water evaporates. Stir in garlic for 30 seconds.',
'Add rice and soy sauce, spreading out and stirring for 4–5 minutes until steaming throughout. Return chicken and egg; heat to 165°F. Finish with sesame oil and scallions and serve.'
],'fried lettuce sesame','Purchased cooked rice makes the quick timing explicit, without assuming rice was cooked and chilled yesterday.','Wet rice or a small skillet produces a steamed, sticky result.',prep=8,cook=22,cuisine='Chinese-inspired',hands=20)
a(349,'Chicken sesame cucumber rice-noodle salad','Cool rice noodles, juicy chicken and crisp cucumber in a tangy sesame dressing.',
'8 ounces thin rice noodles|3 cups chopped cooked chicken, chilled|1 large cucumber, cut into matchsticks|2 carrots, coarsely grated|2 scallions, sliced|2 tablespoons low-sodium soy sauce|2 tablespoons rice vinegar|1 tablespoon toasted sesame oil|1 tablespoon honey|1 tablespoon sesame seeds',[
'Cook or soak the rice noodles according to their package until tender, usually 3–6 minutes. Drain, rinse under cool running water and drain very well.',
'Whisk soy sauce, vinegar, sesame oil and honey in a large serving bowl until the honey dissolves.',
'Add chilled chicken, cucumber, carrots and scallions. Toss to coat, then gently lift the noodles through the dressing with tongs.',
'Divide among four plates and scatter with sesame seeds. Serve immediately or refrigerate promptly; toss again before serving because dressing settles beneath the noodles.'
],'sesame salad fried','This cold sesame-noodle meal replaces satay wraps to avoid duplicating the existing peanut satay bowl; no peanut sauce or curry marinade is used.','Poorly drained noodles dilute the dressing.',prep=12,cook=8,cuisine='East Asian-inspired',hands=18)
a(350,'Chicken cannellini tomato soup','A hearty tomato soup with tender chicken, white beans and ribbons of spinach, served with crusty bread.',
'1 tablespoon olive oil|1 small onion, diced|2 garlic cloves, minced|1 can (28 ounces) crushed tomatoes|3 cups low-sodium chicken broth|1 can (15 ounces) cannellini beans, rinsed and drained|2 cups shredded cooked chicken|5 ounces baby spinach|1 teaspoon dried Italian seasoning|1/4 cup grated Parmesan|4 thick slices crusty bread',[
'Heat oil in a large pot. Cook onion over medium heat for 5 minutes, then stir in garlic and Italian seasoning for 30 seconds.',
'Add tomatoes, broth and beans. Bring to a steady simmer, partially cover and cook 12 minutes, stirring occasionally.',
'Add chicken and simmer 5–7 minutes until it reaches 165°F. Add spinach in handfuls and stir for 2 minutes until wilted.',
'Portion into four bowls, sprinkle with Parmesan and serve with bread. The soup should remain brothy; add a small splash of water if reduced too far.'
],'beanstomato whitechili noodlesoup','A tomato-broth soup with bread, distinct from the existing creamy Tuscan chicken skillet and bean chili.','Adding spinach too early turns it dull and soft.',cook=30,hands=15)
a(351,'Turkey sweet potato chili','Mild tomato chili with tender sweet potato, turkey and kidney beans, finished with cool yogurt.',
'1 tablespoon olive oil|1 pound ground turkey|1 small onion, diced|1 pound peeled sweet potato, cut into 1/2-inch cubes|1 can (15 ounces) kidney beans, rinsed and drained|1 can (28 ounces) crushed tomatoes|1 cup low-sodium chicken broth|2 teaspoons ground cumin|1 teaspoon sweet paprika|1/2 cup plain Greek yogurt|1/2 teaspoon fine salt',[
'Heat oil in a large pot. Brown turkey and onion over medium-high heat for 7–8 minutes, breaking up the turkey until it reaches 165°F.',
'Stir in cumin, paprika and salt for 30 seconds. Add sweet potato, beans, tomatoes and broth and bring to a simmer.',
'Cover loosely and simmer 20–25 minutes, stirring occasionally, until the sweet potatoes are easily pierced. Add water by the splash if the chili gets too thick before they soften.',
'Serve in four deep bowls with yogurt spooned on after cooking. Let portions cool slightly before eating; sweet potato retains heat.'
],'chili whitechili chowder','Sweet potato supplies the starch within a mild turkey-and-bean chili, avoiding the existing white-bean chili flavor profile.','Large sweet potato cubes invalidate the short simmer.',prep=10,cook=35,hands=18)
a(352,'Chicken broccoli loaded potatoes','Fluffy potatoes filled with warm chicken, broccoli and a creamy cheddar sauce.',
'4 russet potatoes, 8 ounces each|12 ounces small broccoli florets|2 cups diced cooked chicken|3/4 cup whole milk|1 tablespoon cornstarch|1 cup shredded cheddar|1 teaspoon Dijon mustard|1/4 teaspoon fine salt|1/4 teaspoon black pepper|1/4 cup water',[
'Scrub and pierce potatoes all over. Place on a microwave-safe plate and microwave on high 14–20 minutes, turning halfway, until a knife slides through easily. Rest 3 minutes; timing varies with microwave wattage.',
'Meanwhile put broccoli and water in a lidded skillet. Steam over medium heat 4–5 minutes until just tender. Drain any excess water.',
'Whisk cornstarch into cold milk. Add to broccoli with chicken, mustard, salt and pepper. Stir over medium-low heat 4–6 minutes until thickened and chicken reaches 165°F; remove from heat and melt in cheddar.',
'Split potatoes carefully and fluff the centers with a fork. Divide the chicken-broccoli sauce among them. These microwave potatoes have soft skins rather than a crisp oven-baked crust.'
],'broccoli chowder alfredo','Microwave potatoes make a complete loaded-potato dinner achievable in half an hour; the title avoids a false oven-baked promise.','Four potatoes need longer than one; check each center.',cook=25,hands=15)
a(353,'Chicken asparagus lemon pasta','Lemon-butter pasta with tender chicken strips, sweet peas and crisp-tender asparagus.',
'10 ounces penne|1 bunch asparagus, 12 ounces, trimmed and cut into 1-inch pieces|1 cup frozen peas|1 pound chicken breast, cut into 1/2-inch strips|1 tablespoon olive oil|2 tablespoons butter|2 garlic cloves, minced|2 tablespoons lemon juice|1 teaspoon lemon zest|1/3 cup grated Parmesan|1/2 teaspoon fine salt',[
'Bring a large pot of water to a boil. Cook penne as directed, adding asparagus and peas for the last 3 minutes. Reserve 1 cup pasta water and drain.',
'Meanwhile season chicken with salt. Heat oil in a wide skillet and cook chicken over medium-high heat for 6–8 minutes, turning until 165°F. Transfer to a clean plate.',
'Lower heat and melt butter in the skillet. Stir garlic for 30 seconds; add lemon juice and 1/4 cup reserved pasta water and scrape up browned bits.',
'Add pasta, vegetables and chicken. Toss over low heat for 1 minute, then remove from heat and fold in Parmesan and zest. Add more reserved water as needed so the sauce lightly coats everything.'
],'lemon alfredo saute','A light lemon-butter sauce and spring vegetables distinguish this pasta from the cream-based Alfredo and florentine dishes.','Thin asparagus overcooks quickly; add it later if pencil-thin.',cook=25,hands=20)
a(354,'Chicken sausage gnocchi with spinach','Golden chicken sausage and pillowy gnocchi in a quick tomato sauce with wilted spinach.',
'1 tablespoon olive oil|12 ounces fully cooked chicken sausage, sliced|1 package (16 ounces) shelf-stable potato gnocchi|2 cups marinara sauce|3/4 cup water|5 ounces baby spinach|1/3 cup grated Parmesan|1 teaspoon dried oregano',[
'Heat oil in a deep lidded skillet over medium-high heat. Brown sausage slices for 4–5 minutes, turning once.',
'Add marinara, water and oregano and bring to a simmer. Stir in gnocchi, cover and cook gently for 5–7 minutes, stirring twice, until gnocchi are tender according to their package.',
'Stir in spinach in two handfuls and simmer 2–3 minutes until wilted. Check sausage reaches 165°F and add a splash of water if the sauce becomes too thick.',
'Remove from heat and sprinkle with Parmesan. Serve immediately in four shallow bowls; gnocchi continue absorbing sauce as they stand.'
],'gnocchi sausage beanstomato','Fully cooked chicken sausage and shelf-stable potato gnocchi make a quick tomato-based skillet without a separate pasta pot.','Do not substitute raw sausage without fully cooking it first.',prep=5,cook=20,hands=15)
a(355,'Chicken zucchini corn skillet with tortillas','Juicy chicken, sweet corn and tender zucchini in a mild lime-cumin skillet, ready to tuck into warm tortillas.',
'1 tablespoon olive oil|1 pound chicken breast, cut into 1/2-inch pieces|2 medium zucchini, diced|1 red bell pepper, diced|1 1/2 cups frozen corn|1 teaspoon ground cumin|1/2 teaspoon fine salt|2 tablespoons lime juice|1/2 cup crumbled feta|8 small flour tortillas',[
'Heat oil in a large skillet. Season chicken with cumin and salt and cook over medium-high heat for 6–8 minutes, turning until 165°F. Transfer to a clean plate.',
'Add pepper and corn to the skillet and cook 4 minutes, then add zucchini and cook 4–5 minutes until just tender and surface liquid has evaporated.',
'Return chicken and juices and heat through for 1 minute. Remove from heat and add lime juice and feta.',
'Wrap tortillas in a damp paper towel and microwave 30–60 seconds. Divide the skillet among four plates with two tortillas each for scooping or filling.'
],'pestoveg saute quesadilla','A corn-and-zucchini skillet with tangy feta differs from pepper-heavy fajitas; tender vegetables and loose warm tortillas are the focus.','Adding zucchini with the chicken makes it watery and soft.',cook=25,cuisine='Southwestern-inspired',hands=20)
a(356,'Chicken mushroom barley soup','A hearty broth with tender barley, browned mushrooms, chicken and spinach.',
'1 tablespoon olive oil|8 ounces presliced mushrooms|1 small onion, diced|2 carrots, thinly sliced|3/4 cup quick-cooking barley, labeled 10–12 minutes|5 cups low-sodium chicken broth|2 cups diced cooked chicken|1/2 teaspoon dried thyme|5 ounces baby spinach|1 tablespoon lemon juice',[
'Heat oil in a large pot over medium-high heat. Cook mushrooms and onion for 7–8 minutes until mushroom liquid evaporates and edges brown.',
'Add carrots, thyme and broth. Bring to a simmer and cook 5 minutes, then stir in quick-cooking barley.',
'Simmer for the barley package time, usually 10–12 minutes, stirring occasionally. Add chicken for the last 5 minutes and confirm it reaches 165°F.',
'When barley and carrots are tender, stir in spinach until wilted and finish with lemon juice. Divide among four bowls. Ordinary pearl barley takes longer and is not a time-neutral substitute.'
],'mushroom ricesoup noodlesoup','Quick-cooking barley gives the soup a chewy grain base; mushrooms are browned before broth rather than boiled from raw.','Standard pearl barley may require 40 minutes or more.',cook=30,hands=18)
save()
a(357,'Turkey pesto pita melts with tomato salad','Warm pita pockets with turkey, basil pesto and melting mozzarella, beside a bright tomato salad.',
'4 whole-wheat pita breads, 6 inches|12 ounces sliced cooked turkey breast|1/4 cup basil pesto|3/4 cup shredded mozzarella|2 cups baby spinach|1 pint cherry tomatoes, halved|1 cucumber, diced|1 tablespoon red wine vinegar|1 tablespoon olive oil|1/4 teaspoon fine salt',[
'Heat the oven to 400°F. Cut each pita in half to make pockets and place on a baking sheet.',
'Spread pesto inside the pockets and divide turkey, spinach and mozzarella among them. Arrange in one layer with the openings facing up.',
'Bake for 10–12 minutes until cheese melts and turkey reaches 165°F. Cover loosely with foil if the pita edges brown before the centers are hot.',
'Meanwhile toss tomatoes and cucumber with vinegar, oil and salt. Serve two filled halves per person with the salad.'
],'pestochicken pestoveg salad','Cooked turkey and pocket bread create an easy hot sandwich dinner with a full fresh vegetable side.','Overfilled pockets heat unevenly; spread filling thinly.',prep=10,cook=15,hands=15)
a(358,'Chicken couscous stuffed peppers','Sweet roasted peppers filled with chicken, fluffy couscous, spinach and tomato, with a little melted mozzarella.',
'4 large bell peppers|1 tablespoon olive oil|3/4 cup dry plain couscous|3/4 cup low-sodium chicken broth|2 cups diced cooked chicken|1 cup marinara sauce|3 ounces baby spinach, chopped|3/4 cup shredded mozzarella|1/2 teaspoon dried oregano|1/4 teaspoon fine salt|1/4 cup water',[
'Heat oven to 425°F. Halve peppers lengthwise and remove seeds. Place cut-side up in a large baking dish, brush with oil, add water around them and cover with foil. Bake 15 minutes.',
'Meanwhile boil broth in a saucepan. Stir in couscous, cover and remove from heat for 5 minutes; use package liquid ratio if different. Fluff and fold in chicken, marinara, spinach, oregano and salt.',
'Carefully uncover peppers. Fill all eight halves evenly and scatter mozzarella over the top. Cover again and bake 15 minutes.',
'Uncover and bake 5–10 minutes until peppers are tender and filling reaches 165°F in the center. Serve two halves per person with any extra filling alongside.'
],'peppers couscous beanstomato','Quick couscous and cooked chicken reduce filling preparation; peppers still receive enough covered oven time to soften.','Large thick-walled peppers may require the full baking range.',prep=12,cook=38,hands=20)
a(359,'Chicken cauliflower cheddar skillet','Tender chicken and cauliflower in a creamy cheddar sauce, served with crusty whole-grain bread.',
'1 tablespoon olive oil|1 pound chicken breast, cut into 1/2-inch pieces|1 pound small cauliflower florets|1/2 cup low-sodium chicken broth|3/4 cup whole milk|1 tablespoon cornstarch|1 cup shredded sharp cheddar|1 teaspoon Dijon mustard|1/2 teaspoon fine salt|1/4 teaspoon black pepper|4 thick slices whole-grain bread',[
'Heat oil in a deep lidded skillet. Season chicken with salt and pepper and cook over medium-high heat 5 minutes, turning; it will finish with the cauliflower.',
'Add cauliflower and broth, cover and simmer over medium-low heat 7–9 minutes until cauliflower is fork-tender and chicken reaches 165°F. Stir halfway.',
'Whisk cornstarch into cold milk and stir it into the skillet with mustard. Simmer gently, stirring, for 2 minutes until the sauce thickens.',
'Remove from heat and fold in cheddar until melted. Divide among four plates with the bread for the sauce; do not boil the cheese sauce.'
],'broccoli rice alfredo','A cauliflower-based skillet with bread as the starch provides a different texture from the catalog’s chicken broccoli rice casserole.','Large florets cook unevenly; keep them bite-sized.',cook=25,hands=18)
a(360,'Chicken ramen with corn and spinach','Springy noodles in a ginger-soy broth with chicken, sweet corn and tender spinach.',
'8 ounces plain dried ramen noodles, seasoning packets discarded|4 cups low-sodium chicken broth|2 cups water|3 cups shredded cooked chicken|1 1/2 cups frozen corn|5 ounces baby spinach|1 tablespoon finely grated ginger|2 tablespoons low-sodium soy sauce|1 teaspoon toasted sesame oil|2 scallions, sliced',[
'Combine broth, water and ginger in a large saucepan. Bring to a simmer and cook 5 minutes.',
'Add chicken and corn and simmer for 5–7 minutes until chicken reaches 165°F and corn is hot.',
'Add ramen and cook for the package time, usually 3–4 minutes, gently separating the strands. Stir in spinach during the final minute.',
'Take off heat and add soy sauce and sesame oil. Divide noodles and broth among four bowls and finish with scallions. Serve immediately so noodles do not absorb all the broth.'
],'dumpling noodlesoup sesame','An original quick noodle soup using prepared chicken and packaged plain ramen; it does not claim the long-simmered stock of traditional ramen.','Salt varies between broths; use low-sodium broth and omit noodle seasoning packets.',prep=8,cook=20,cuisine='Japanese-inspired',hands=15)
a(361,'Turkey mushroom patties with mashed potatoes','Juicy turkey patties in mushroom gravy, with creamy mash and peas.',
'1 1/2 pounds Yukon Gold potatoes, cut into 1-inch chunks|1 cup frozen peas|1 pound ground turkey|1/3 cup plain breadcrumbs|1 egg|1 tablespoon Worcestershire sauce|1 tablespoon olive oil|8 ounces presliced mushrooms|1 tablespoon all-purpose flour|1 cup low-sodium chicken broth|1/2 cup milk|1 tablespoon butter|1/2 teaspoon fine salt',[
'Cover potatoes with cold water in a saucepan. Bring to a boil and simmer 12–15 minutes until tender; add peas for the final 2 minutes. Drain, then mash with milk, butter and half the salt.',
'While potatoes cook, gently mix turkey, breadcrumbs, egg, Worcestershire and remaining salt. Shape four patties about 3/4 inch thick.',
'Heat oil in a wide skillet. Brown patties over medium heat 3 minutes each side and move to a plate. Add mushrooms and cook 5 minutes until their liquid evaporates. Stir in flour for 1 minute and gradually add broth.',
'Return patties and juices to the gravy. Cover and simmer 5–7 minutes until the centers reach 165°F. Serve each patty with mash, peas and mushroom gravy.'
],'salisbury stroganoff chowder','A turkey adaptation of a gravy-and-mash supper; the moist breadcrumb mixture helps lean mince remain tender. Thirteen ingredients including dairy are a deliberate exception to the twelve-ingredient target.','Browned patties can still be raw in the middle; verify internal temperature.',prep=12,cook=28,hands=20)
a(362,'Chicken squash ravioli skillet','Tender squash-filled ravioli, chicken and spinach in a light sage-butter sauce.',
'20 ounces refrigerated butternut squash ravioli|2 cups diced cooked chicken|5 ounces baby spinach|2 tablespoons butter|1/2 teaspoon rubbed sage|1/2 cup low-sodium chicken broth|1/4 cup grated Parmesan|1 tablespoon lemon juice|1/4 teaspoon black pepper',[
'Bring a large saucepan of water to a gentle boil. Cook ravioli for the package time, usually 3–5 minutes, stirring gently. Reserve 1/2 cup cooking water and drain carefully.',
'Meanwhile melt butter in a wide skillet over medium-low heat. Stir in sage for 30 seconds, then add broth and chicken.',
'Simmer 5–7 minutes until chicken reaches 165°F. Add spinach and stir until wilted, about 2 minutes.',
'Gently fold in ravioli, lemon juice, Parmesan and pepper off heat. Loosen with reserved cooking water if needed and serve immediately without breaking the filled pasta.'
],'alfredo gnocchi pestopasta','Purchased squash ravioli supplies both a soft filled pasta and a sweet vegetable note; sage butter replaces a heavy cream sauce.','Rapid boiling and rough tossing split ravioli.',prep=5,cook=20,hands=15)
a(363,'Chicken broccoli sesame noodles','Savory sesame noodles with crisp-tender broccoli and juicy chicken strips.',
'10 ounces spaghetti|12 ounces small broccoli florets|1 pound chicken breast, thinly sliced|1 tablespoon neutral oil|3 tablespoons low-sodium soy sauce|1 tablespoon rice vinegar|1 tablespoon toasted sesame oil|1 tablespoon honey|1 tablespoon sesame seeds|1 garlic clove, finely grated|2 scallions, sliced',[
'Bring a large saucepan of water to a boil. Cook spaghetti according to the package, adding broccoli during the final 3 minutes. Reserve 1/2 cup cooking water and drain.',
'Mix soy sauce, vinegar, sesame oil, honey and garlic in a small bowl until smooth.',
'Heat neutral oil in a large skillet over medium-high heat. Cook chicken for 6–8 minutes, turning until the thickest strips reach 165°F.',
'Add noodles, broccoli and dressing to the chicken. Toss over medium-low heat for 1–2 minutes, adding a little reserved water if dry. Finish with sesame seeds and scallions.'
],'sesame fried broccoli','A warm sesame-noodle meal with broccoli and freshly cooked chicken differs from the chilled cucumber rice-noodle salad in texture, vegetable and service.','Too much pasta water dilutes the small amount of dressing.',cook=25,cuisine='East Asian-inspired',hands=20)
a(364,'Chicken lemon dill soup with rice','A bright, brothy chicken-and-rice supper with carrots, peas and fresh dill.',
'1 tablespoon olive oil|1 small onion, diced|2 carrots, thinly sliced|5 cups low-sodium chicken broth|3/4 cup long-grain white rice|2 cups shredded cooked chicken|1 cup frozen peas|2 tablespoons lemon juice|2 tablespoons chopped fresh dill|1/4 teaspoon black pepper',[
'Heat oil in a large saucepan over medium heat. Cook onion and carrots for 5 minutes to soften their edges.',
'Add broth and rice. Bring to a simmer, cover loosely and cook 15 minutes, stirring twice so rice does not settle and stick.',
'Add chicken and peas. Simmer 5–7 minutes more until rice is tender and chicken reaches 165°F. Add water if the rice has absorbed too much broth.',
'Turn off heat and stir in lemon juice, dill and pepper. Serve promptly in four bowls; the rice continues expanding during storage.'
],'ricesoup noodlesoup lemon','A clear lemon-dill soup rather than egg-thickened avgolemono; uncooked white rice is included in the timeline.','Adding lemon too early dulls its brightness; rice must soften before service.',prep=10,cook=30,hands=15)
a(365,'Chicken taco pasta with corn','A mild tomato-cumin pasta skillet with chicken, corn, peppers and melting cheddar.',
'1 tablespoon olive oil|1 red bell pepper, diced|1 teaspoon ground cumin|8 ounces small pasta shells|1 can (15 ounces) tomato sauce|2 cups low-sodium chicken broth|1 cup frozen corn|2 cups shredded cooked chicken|3/4 cup shredded cheddar|1 tablespoon lime juice',[
'Heat oil in a deep lidded skillet over medium heat. Cook pepper for 5 minutes and stir in cumin for 30 seconds.',
'Add shells, tomato sauce and broth. Bring to a simmer, cover and cook gently for 10 minutes, stirring every few minutes.',
'Fold in corn and chicken and cook 5–7 minutes more, stirring, until shells are tender and chicken reaches 165°F. Add water a splash at a time if the sauce thickens before pasta softens.',
'Take off heat. Fold in cheddar and lime juice, then rest 2 minutes before serving in four bowls.'
],'burger chili pestopasta','Corn, lime and cumin create a mild taco-style pasta; there are no tortilla layers or enchilada sauce.','Cooked chicken added too early can become stringy.',cook=25,cuisine='Tex-Mex-inspired',hands=18)
a(366,'Chicken white bean nachos with tomato salsa','Warm layered nachos with chicken, creamy white beans and cheese, topped with fresh tomato salsa.',
'8 ounces sturdy tortilla chips|2 cups shredded cooked chicken|1 can (15 ounces) cannellini beans, rinsed and drained|1 cup shredded Monterey Jack|1 teaspoon ground cumin|1/4 cup water|3 Roma tomatoes, diced|1 cucumber, diced|1 tablespoon lime juice|1/4 cup chopped cilantro|1/4 teaspoon fine salt|1/2 cup plain Greek yogurt',[
'Heat oven to 400°F. Put chicken, beans, cumin and water in a skillet and heat over medium, stirring, 5–7 minutes until chicken reaches 165°F. Mash a few beans to bind the mixture.',
'Spread half the chips on a large baking sheet. Scatter half the warm filling and cheese over them; repeat with remaining chips, filling and cheese.',
'Bake 7–10 minutes until cheese is melted and chips at the edges are lightly toasted. Watch closely to prevent burning.',
'Meanwhile mix tomatoes, cucumber, lime, cilantro and salt. Spoon salsa and yogurt over the nachos only at serving; divide into four dinner portions.'
],'nachos quesadilla beanstomato','White beans, chicken and a generous fresh salsa make nachos a complete dinner; wet toppings stay off until serving.','Piling chips too deeply leaves dry untopped chips and cold filling.',prep=10,cook=20,cuisine='Tex-Mex-inspired',hands=20)
save()
a(367,'Turkey cabbage rolls in a skillet','Tender cabbage, savory turkey and rice simmered in a sweet tomato sauce without any rolling.',
'1 tablespoon olive oil|1 pound ground turkey|1 small onion, diced|12 ounces bagged shredded green cabbage|3/4 cup long-grain white rice|1 can (15 ounces) tomato sauce|2 cups low-sodium chicken broth|1 teaspoon sweet paprika|1 tablespoon apple cider vinegar|1 teaspoon brown sugar|1/2 teaspoon fine salt',[
'Heat oil in a deep lidded skillet. Brown turkey and onion over medium-high heat for 7–8 minutes, breaking up the meat until 165°F.',
'Add cabbage and paprika and cook for 3 minutes until cabbage begins to wilt. Stir in rice, tomato sauce, broth, vinegar, sugar and salt.',
'Bring to a simmer, cover and reduce heat to low. Cook 20–25 minutes, stirring twice and replacing the lid, until rice is tender; add water by the splash if drying.',
'Let stand covered off heat for 5 minutes. Fluff gently and serve in four bowls, checking that no hard rice remains before serving.'
],'rice peppers chili','An original deconstructed cabbage-roll supper; rice cooks in the tomato broth, removing the rolling and separate rice preparation.','Acidic tomato liquid slows rice cooking; allow the full range and check texture.',prep=8,cook=37,hands=18)
a(368,'Chicken balsamic strawberry salad with toast','Juicy strawberries, tender chicken and crisp greens with feta, balsamic dressing and warm toast.',
'3 cups chopped cooked chicken, chilled|6 ounces mixed salad greens|12 ounces strawberries, hulled and sliced|1 cucumber, sliced|1/2 cup crumbled feta|1/4 cup toasted sunflower seeds|3 tablespoons olive oil|2 tablespoons balsamic vinegar|1 teaspoon Dijon mustard|1 teaspoon honey|4 thick slices whole-grain bread',[
'Whisk oil, balsamic vinegar, mustard and honey in a large bowl until blended.',
'Add chicken and cucumber and toss with half the dressing, transferring any remaining dressing to a small bowl.',
'Toast bread in a toaster or dry skillet until crisp. Divide washed, thoroughly dried greens among four plates and add chicken, cucumber and strawberries.',
'Finish with feta, sunflower seeds and remaining dressing. Serve with toast immediately so the greens stay crisp.'
],'strawberry salad lemon','A fruit-and-greens dinner with sunflower seeds rather than candied nuts; cooked chicken and substantial toast make it a complete meal.','Wet greens dilute dressing; dressing too early wilts leaves.',prep=15,cook=5,hands=20)
a(369,'Barbecue chicken potato packets with green beans','Tender barbecue-glazed chicken and potatoes with green beans, cooked in easy foil packets.',
'1 pound baby potatoes, cut into 1/2-inch slices|1/4 cup water|4 chicken breast cutlets, 5 ounces each and 1/2 inch thick|12 ounces trimmed green beans|1/2 cup mild barbecue sauce|1 tablespoon olive oil|1/2 teaspoon sweet paprika|1/4 teaspoon fine salt',[
'Heat oven to 425°F. Microwave potatoes with water in a vented covered bowl for 6–8 minutes until almost tender, then drain carefully.',
'Lay four large double sheets of foil on a baking sheet. Divide potatoes and green beans among them, drizzle with oil and season with salt and paprika. Place one cutlet on each mound and spoon barbecue sauce over the chicken.',
'Fold foil edges together tightly to make sealed packets with a little headroom. Bake 20–25 minutes, then carefully open one away from your face and check chicken reaches 165°F and beans are tender.',
'If needed, reseal and bake a few minutes longer. Open all packets carefully and transfer contents and juices to plates. The sealed method produces tender vegetables rather than a crisp roast.'
],'roast fries lemon','Sealed barbecue packets replace the proposed herb traybake, avoiding duplication of the existing sheet-pan roast chicken and vegetables.','Raw potatoes may outlast thin chicken; microwave-start and check both.',prep=10,cook=35,hands=18)
a(370,'Turkey spinach ricotta shell bake','Pasta shells with savory turkey, spinach and creamy pockets of ricotta under melted mozzarella.',
'10 ounces medium pasta shells|1 tablespoon olive oil|1 pound ground turkey|1 teaspoon dried Italian seasoning|2 cups marinara sauce|5 ounces baby spinach|3/4 cup ricotta|3/4 cup shredded mozzarella|1/4 teaspoon fine salt',[
'Heat oven to 425°F. Boil shells in a saucepan for 2 minutes less than their package time; reserve 1/2 cup pasta water and drain.',
'Meanwhile heat oil in a wide oven-safe skillet. Brown turkey with Italian seasoning and salt for 7–8 minutes, breaking it up, until it reaches 165°F.',
'Add marinara and spinach; stir until spinach wilts. Fold in shells and 1/4 cup reserved pasta water. Dot ricotta over the pasta and scatter mozzarella on top.',
'Bake 10–12 minutes until sauce bubbles and cheese melts. Rest for 3 minutes before serving; add extra reserved water before baking if the sauce does not coat the shells.'
],'shells broccoli burger','Medium shells and dollops of ricotta replace hand-stuffed jumbo shells, keeping hands-on work below twenty minutes without losing the baked-pasta character.','Fully boiling shells before baking makes them soft.',prep=10,cook=30,hands=20)
a(371,'Chicken cranberry apple dinner salad','Crisp apple, dried cranberries and tender chicken over crunchy romaine, with cheddar and warm rolls.',
'3 cups diced cooked chicken, chilled|2 romaine hearts, chopped|2 crisp apples, cored and diced|2 celery ribs, thinly sliced|1/3 cup dried cranberries|1/2 cup cubed cheddar|1/3 cup plain Greek yogurt|2 tablespoons mayonnaise|1 tablespoon apple cider vinegar|1 teaspoon Dijon mustard|4 whole-grain dinner rolls',[
'Whisk yogurt, mayonnaise, vinegar and mustard in a large bowl to make a smooth dressing.',
'Add diced apples immediately and toss to slow browning. Fold in chicken, celery and cranberries.',
'Warm rolls in a toaster oven or microwave according to their package, if desired. Divide washed and dried romaine among four plates.',
'Spoon the chicken mixture over the greens and scatter with cheddar. Serve with rolls, keeping dressed filling separate from lettuce if making ahead.'
],'salad strawberry sloppy','A crisp apple-and-cranberry salad uses a yogurt dressing and cheddar rather than the existing ranch chopped salad or croissant filling.','Apple browns quickly unless dressed; greens soften if mixed ahead.',prep=18,cook=2,hands=20)
a(372,'Chicken black bean sweet potato hash','Golden sweet potato cubes, chicken and black beans with a lime-yogurt finish.',
'1 1/4 pounds peeled sweet potato, cut into 1/2-inch cubes|1/4 cup water|1 tablespoon olive oil|1 red bell pepper, diced|2 cups diced cooked chicken|1 can (15 ounces) black beans, rinsed and drained|1 teaspoon ground cumin|1/2 teaspoon sweet paprika|1/2 cup plain Greek yogurt|1 tablespoon lime juice|1/4 teaspoon fine salt',[
'Microwave sweet potato with water in a vented covered bowl for 6–8 minutes, stirring halfway, until just tender. Drain and let surface steam escape.',
'Heat oil in a wide skillet over medium-high heat. Spread sweet potato and pepper in a layer and cook 6–8 minutes, turning occasionally, until edges color.',
'Add chicken, beans, cumin, paprika and salt with 2 tablespoons water. Cook 4–6 minutes, folding gently, until chicken reaches 165°F and mixture is hot.',
'Mix yogurt and lime juice in a small bowl. Divide hash among four plates and spoon yogurt over it at serving.'
],'chili saute rice','A dry skillet hash rather than a chili or rice bowl; microwave-started sweet potato cuts waiting without turning the finished mixture into mash.','Undrained potatoes steam instead of browning.',cook=25,cuisine='Southwestern-inspired',hands=18)
a(373,'Chicken corn tortilla pie','Soft corn tortillas layered with chicken, sweet corn and tomato salsa under a golden cheese top.',
'8 small corn tortillas|2 cups shredded cooked chicken|1 can (15 ounces) pinto beans, rinsed and drained|1 cup frozen corn|1 red bell pepper, finely diced|2 cups mild tomato salsa|1 teaspoon ground cumin|1 cup shredded Monterey Jack|1/4 cup plain Greek yogurt',[
'Heat oven to 400°F. In a large microwave-safe bowl combine chicken, beans, corn, pepper, salsa and cumin. Cover with a vent and microwave 5–7 minutes, stirring halfway, until steaming throughout and chicken reaches 165°F.',
'Spread a thin layer of filling in an 8-inch-square baking dish. Tear tortillas to fit and layer half with half the remaining filling and half the cheese.',
'Repeat with remaining tortillas, filling and cheese. Cover with foil and bake 15 minutes; uncover and bake 5–8 minutes until bubbling throughout.',
'Rest 5 minutes to make slicing easier. Cut into four portions and serve with yogurt. The tortilla layers should be tender rather than crisp.'
],'quesadilla nachos chili','A layered salsa-and-pinto-bean tortilla pie with a baked set, distinct from rolled enchiladas and the loose red-sauce skillet.','Cold filling extends bake time and leaves a cool center.',prep=10,cook=30,cuisine='Tex-Mex-inspired',hands=18)
a(374,'Turkey meatball minestrone','Small tender turkey meatballs, white beans, pasta and vegetables in a savory tomato broth.',
'1 pound ground turkey|1/4 cup plain breadcrumbs|1 egg|1 teaspoon dried Italian seasoning|1/2 teaspoon fine salt|1 tablespoon olive oil|2 cups refrigerated diced onion, carrot and celery mix|1 can (14.5 ounces) diced tomatoes|5 cups low-sodium chicken broth|1 can (15 ounces) cannellini beans, rinsed and drained|1/2 cup small dry pasta shells|3 ounces baby spinach',[
'Gently mix turkey, crumbs, egg, half the Italian seasoning and salt. With damp hands form 20 small meatballs, about 1 inch across.',
'Heat oil in a large soup pot. Soften the diced vegetable mix for 5 minutes. Add remaining seasoning, tomatoes with juices, broth and beans and bring to a simmer.',
'Lower meatballs into the broth with a spoon and add pasta. Simmer gently for 12–15 minutes, stirring carefully once the meatballs firm up, until the largest meatball reaches 165°F and pasta is tender.',
'Stir in spinach for 1–2 minutes until wilted. Divide into four bowls, counting five meatballs per serving. Avoid a hard boil, which can break the meatballs.'
],'salisbury noodlesoup beanstomato','Small poached turkey meatballs give minestrone a hearty protein; pre-diced vegetables keep preparation manageable.','Oversized meatballs take longer than the pasta; maintain the stated size.',prep=15,cook=25,hands=20)
a(375,'Chicken carrot ginger dumpling soup','Plump chicken dumplings in a ginger broth with sweet carrots, spinach and tender shredded chicken.',
'1 teaspoon neutral oil|2 carrots, thinly sliced|1 tablespoon finely grated ginger|5 cups low-sodium chicken broth|1 tablespoon low-sodium soy sauce|1 package (20 ounces) frozen chicken dumplings suitable for boiling|1 cup shredded cooked chicken|5 ounces baby spinach|2 scallions, sliced|1 teaspoon toasted sesame oil',[
'Heat neutral oil in a large pot over medium heat. Cook carrots for 3 minutes, add ginger and stir for 30 seconds.',
'Add broth and soy sauce and bring to a simmer. Cook 5 minutes until carrots start to soften.',
'Add frozen dumplings and chicken. Return to a gentle boil and cook for the dumpling package boiling time, commonly 6–10 minutes, until a dumpling center and the chicken reach 165°F. Use the package endpoint if it requires longer.',
'Stir in spinach until wilted, turn off heat and finish with scallions and sesame oil. Divide among four bowls and serve promptly before dumpling wrappers soften too much.'
],'dumpling noodlesoup sesame','Purchased chicken dumplings and extra shredded chicken make a full soup supper; this replaces apricot couscous to avoid the existing harissa-apricot meal.','Dumpling brands differ; frozen raw poultry filling must cook through, not just float.',prep=8,cook=22,cuisine='East Asian-inspired',hands=15)
a(376,'Mild buffalo chicken potatoes with celery slaw','Soft jacket potatoes filled with creamy tangy chicken, alongside crunchy celery and cabbage slaw.',
'4 russet potatoes, 8 ounces each|3 cups shredded cooked chicken|2 tablespoons mild buffalo sauce|3/4 cup plain Greek yogurt, divided|1/2 cup shredded cheddar|3 celery ribs, thinly sliced|3 cups bagged shredded cabbage and carrot mix|1 tablespoon apple cider vinegar|1/4 cup water',[
'Scrub and pierce potatoes all over. Microwave on a microwave-safe plate for 14–20 minutes, turning halfway, until each is tender through the center. Rest for 3 minutes.',
'Meanwhile put chicken, buffalo sauce and water in a skillet. Cover and heat over medium-low heat 5–7 minutes, stirring, until chicken reaches 165°F.',
'Remove skillet from heat and fold in 1/4 cup yogurt and the cheddar. In a bowl mix remaining yogurt with vinegar, celery and cabbage mix.',
'Split potatoes, fluff their centers and fill with the warm chicken. Serve slaw alongside. Choose mild sauce; the yogurt softens but does not eliminate its heat.'
],'salad broccoli nachos','A small measured amount of buffalo sauce flavors a creamy potato filling; celery slaw supplies the cold crunch distinct from the existing buffalo chicken salad.','Potato size and microwave power affect the cooking time; test all four.',cook=25,hands=18)
save()
a(377,'Turkey mushroom lettuce wraps with rice','Savory turkey and mushrooms in crisp lettuce cups, with steamed rice and a mild ginger-soy glaze.',
'1 cup long-grain white rice|2 cups water|1 tablespoon neutral oil|1 pound ground turkey|8 ounces mushrooms, finely chopped|1 carrot, coarsely grated|1 tablespoon finely grated ginger|2 tablespoons low-sodium soy sauce|1 tablespoon rice vinegar|1 tablespoon honey|1 head butter lettuce, leaves separated|2 scallions, sliced',[
'Combine rice and water in a small saucepan. Bring to a boil, cover and cook over low heat for 18 minutes, then rest off heat for 5 minutes. Follow package ratio if different.',
'Meanwhile heat oil in a wide skillet. Brown turkey over medium-high heat for 7–8 minutes, breaking it up until it reaches 165°F.',
'Add mushrooms and carrot and cook 6–8 minutes until mushroom liquid evaporates. Stir in ginger, soy sauce, vinegar and honey and cook 2 minutes until lightly glazed.',
'Wash and thoroughly dry lettuce leaves. Spoon rice and filling into the leaves at the table, topping with scallions; serve any extra rice beside the wraps.'
],'lettuce fried mushroom','Mild mushroom-and-ginger wraps avoid the chile, basil and Sichuan pepper of existing turkey lettuce dishes; rice is cooked within the schedule.','Wet lettuce and excess mushroom liquid make unstable wraps.',prep=10,cook=25,cuisine='East Asian-inspired',hands=20)
a(378,'Chicken hummus crunch dinner pitas','Generous pita pockets with creamy hummus, tender chicken and crisp cucumber-carrot salad.',
'4 whole-wheat pita breads, 6 inches|3 cups chopped cooked chicken, chilled|1 cup prepared hummus|1 cucumber, diced|2 carrots, coarsely grated|1 pint cherry tomatoes, quartered|2 tablespoons lemon juice|1 tablespoon olive oil|1/4 teaspoon fine salt|2 cups shredded romaine',[
'Whisk lemon juice, oil and salt in a bowl. Add cucumber, carrots and tomatoes and toss until coated.',
'Warm pita briefly in a toaster or microwave just until flexible, then halve each to open eight pockets.',
'Spread hummus inside each pocket. Divide romaine and chilled chicken among the halves and spoon in some drained vegetable salad.',
'Serve two halves per person with remaining vegetable salad alongside. Fill shortly before eating so the pita does not become wet.'
],'salad couscous pestoveg','A cold hummus-and-raw-vegetable pita dinner distinct from shawarma, gyro and mayonnaise-based chicken salad.','Drain salad before filling so dressing does not soak the bread.',prep=18,cook=2,hands=20)
a(379,'Chicken spinach tomato polenta','Soft Parmesan polenta topped with tender chicken in a rich tomato-spinach sauce.',
'1 tablespoon olive oil|1 small onion, diced|2 cups marinara sauce|2 cups diced cooked chicken|5 ounces baby spinach|1 teaspoon dried oregano|1 cup quick-cooking polenta, labeled 5 minutes|4 cups low-sodium chicken broth|1 tablespoon butter|1/4 cup grated Parmesan',[
'Heat oil in a wide skillet over medium heat. Cook onion 5 minutes, then add marinara, oregano and chicken. Simmer gently 7–10 minutes until chicken reaches 165°F.',
'Meanwhile bring broth to a boil in a saucepan. Whisk in quick polenta gradually. Lower heat and stir often for the package time, usually 5 minutes, until creamy and tender; use package liquid ratio if different.',
'Stir spinach into the chicken sauce and cook 2 minutes until wilted. Remove polenta from heat and stir in butter and Parmesan.',
'Spoon polenta into four shallow bowls and ladle chicken sauce over it. Serve immediately; loosen polenta with hot water if it thickens while waiting.'
],'polenta beanstomato pestochicken','A tomato-spinach topping over soft polenta replaces another biscuit chicken pie, avoiding overlap with existing pot pie and dumpling recipes.','Ordinary coarse polenta takes much longer than the specified quick product.',prep=8,cook=22,hands=18)
a(380,'Turkey kale lemon orzo soup','Tiny pasta, savory turkey and tender kale in a bright lemon broth with Parmesan.',
'1 tablespoon olive oil|1 pound ground turkey|1 small onion, diced|2 carrots, thinly sliced|5 cups low-sodium chicken broth|3/4 cup dry orzo|4 ounces chopped kale, thick stems removed|2 tablespoons lemon juice|1/4 cup grated Parmesan|1/2 teaspoon dried thyme|1/2 teaspoon fine salt',[
'Heat oil in a large pot. Cook turkey and onion over medium-high heat for 7–8 minutes, breaking turkey into small pieces, until it reaches 165°F.',
'Add carrots, thyme, salt and broth. Bring to a simmer and cook 5 minutes to give the carrots a head start.',
'Stir in orzo and kale and simmer 10–12 minutes, stirring frequently, until pasta and carrots are tender. Add water if the soup thickens more than you like.',
'Remove from heat and stir in lemon juice. Divide into four bowls and sprinkle with Parmesan. Serve promptly because the orzo continues absorbing broth.'
],'orzo noodlesoup ricesoup','Loose ground turkey, kale and lemon make a simple broth supper with no meatball shaping and no cream sauce.','Orzo settles and sticks unless stirred; stem-free chopped kale softens more evenly.',prep=10,cook=30,hands=18)
save()
# Final desk-review corrections: preserve image-visible ingredients, fix timing and scaling.
def extra(key,publisher,title,url,signal):
 S[key]=dict(publisher=publisher,title=title,url=url,rating=None,ratingCount=None,signal=signal)
source('barley','vegetable-barley-soup','Pearled barley takes a long simmer; the quick product is explicitly required in this adaptation.')
source('slaw','simple-creamy-coleslaw','Fine cabbage shreds hold a modest creamy dressing; dress near serving for crunch.')
source('foil','bbq-chicken-foil-packets','Seal foil with headroom to retain steam; its oven method uses 425°F.','skinnytaste.com')
source('noodlesalad','asian-vermicelli-noodle-salad','Drain soaked rice noodles thoroughly to avoid diluted dressing; crisp raw vegetables provide contrast.','recipetineats.com')
source('yogurt','tzatziki','Cucumber moisture thins yogurt; remove watery seeds. Our diced cucumber side omits traditional herbs and resting.','recipetineats.com')
source('buffalo','skinny-buffalo-chicken-potato-skins','Buffalo chicken, cheddar and crunchy celery suit potato; this adaptation retains whole potatoes and skips slow cooking.','skinnytaste.com')
extra('potato','Iowa State University Extension','Microwave Baked Potato','https://spendsmart.extension.iastate.edu/recipe/microwave-baked-potato/','Prick and turn potatoes; cook no more than two at once and check tenderness rather than relying only on time.')
extra('waldorf','Well Plated','Whole30 Chicken Salad','https://www.wellplated.com/whole30-chicken-salad/','Cooked chicken, juicy fruit and celery pair with an acidic creamy dressing; the tahini formulation differs from this yogurt version.')
extra('hummuspita','Good Food Middle East','Chicken pitta pockets with hummus drizzle','https://www.bbcgoodfoodme.com/recipes/chicken-pitta-pockets-with-houmous-drizzle/','Warm pita opens for chicken, cucumber and grated carrot; hummus forms the creamy element.')
extra('hummus','RecipeTin Eats','Hummus','https://www.recipetineats.com/hummus/','Hummus combines chickpeas, tahini and lemon and works as a spread beneath meat and fresh vegetables.')
extra('hummusbowl','Budget Bytes','Mediterranean Hummus Bowls','https://www.budgetbytes.com/mediterranean-hummus-bowls/','Cucumber and tomato give freshness alongside a measured hummus portion and cooked protein.')
extra('tortillasoup','Budget Bytes','Slow Cooker Chicken Tortilla Soup','https://www.budgetbytes.com/slow-cooker-chicken-tortilla-soup/','Tomato, beans and corn build the soup; lime and crisp tortilla toppings are added at serving. Slow-cooker timing is not adopted.')
for n,keys in {337:'tortillasoup whitechili nachos',345:'lemon couscous yogurt',346:'quesadilla mushroom slaw',349:'sesame noodlesalad salad',352:'broccoli alfredo potato',356:'barley mushroom noodlesoup',357:'pestochicken hummuspita pestoveg',368:'strawberry salad waldorf',369:'foil roast fries',371:'salad strawberry waldorf',376:'buffalo potato slaw',378:'hummuspita hummus hummusbowl'}.items():
 recipes[n-331]['research']['sources']=[S[k] for k in keys.split()]
recipes[358-331]['cookMinutes']=45
recipes[367-331]['cookMinutes']=45
recipes[368-331]['instructions'][1]='Reserve half the dressing in a small bowl before adding chicken and cucumber to the large bowl. Toss to coat with the dressing left in the bowl.'
for n in [352,376]:
 r=recipes[n-331];r['cookMinutes']=30
 r['instructions'][0]='Scrub and pierce potatoes all over. Microwave two at a time on a microwave-safe plate for 8–12 minutes per pair, turning halfway, until a knife enters each center easily. Keep the first pair under a clean towel while cooking the second pair. Let the final pair rest 3 minutes; wattage and potato size affect the time.'
# The first six retain formulation but split-purpose amounts no longer conflict with scaled ingredients.
r=recipes[0]
r['ingredients'][1]='2 1/2 cups water for rice'
r['ingredients'].insert(2,'1/4 cup water for sauce')
r['instructions'][0]=r['instructions'][0].replace('2 1/2 cups of the water','the measured rice water')
r['instructions'][1]=r['instructions'][1].replace('the remaining 1/4 cup water','the measured sauce water')
r['instructions'][2]=r['instructions'][2].replace('1 tablespoon oil','half the oil')
r['instructions'][3]=r['instructions'][3].replace('the remaining tablespoon oil','the remaining oil')
r=recipes[1]
r['instructions'][0]=r['instructions'][0].replace('1 teaspoon of the measured oil','one ninth of the measured oil').replace('1 tablespoon oil','one third of the measured oil').replace('1/4 teaspoon salt','half the salt')
r['instructions'][1]=r['instructions'][1].replace('the remaining 1 tablespoon plus 2 teaspoons oil','the remaining oil')
r['instructions'][3]=r['instructions'][3].replace('remaining 1/4 teaspoon salt','remaining salt')
r=recipes[3]
r['instructions']=[s.replace('1/4 teaspoon salt','half the salt').replace('1 tablespoon butter','half the butter').replace('remaining tablespoon butter','remaining butter').replace('remaining half the salt','remaining salt') for s in r['instructions']]
r['ingredients'][-1]='12 cups water for boiling noodles'
r=recipes[4]
r['instructions']=[s.replace('1/4 teaspoon salt','half the salt').replace('remaining half the salt','remaining salt') for s in r['instructions']]
r=recipes[338-331];r['instructions'][0]=r['instructions'][0].replace('Spread each with 1 tablespoon pesto','Divide the pesto evenly over them')
r=recipes[345-331];r['instructions'][2]=r['instructions'][2].replace('1 tablespoon lemon juice','half the lemon juice');r['ingredients'][6]='1 cucumber, watery seeds removed, diced'
r=recipes[376-331];r['instructions'][2]=r['instructions'][2].replace('1/4 cup yogurt','one third of the yogurt')
save()
recipes[374-331]['instructions'][0]=recipes[374-331]['instructions'][0].replace('form 20 small meatballs, about 1 inch across','form meatballs about 1 inch across, about five per serving')
recipes[361-331]['instructions'][1]=recipes[361-331]['instructions'][1].replace('Shape four patties about 3/4 inch thick','Shape one patty per serving, each about 3/4 inch thick')
recipes[358-331]['instructions'][2]=recipes[358-331]['instructions'][2].replace('all eight halves','the prepared pepper halves')
recipes[369-331]['instructions'][1]=recipes[369-331]['instructions'][1].replace('Lay four large double sheets of foil on a baking sheet','Lay one large double sheet of foil per cutlet on a baking sheet')
recipes[373-331]['cookMinutes']=40
for r in recipes:
 r['instructions']=[s.replace('four plates','serving plates').replace('four bowls','serving bowls').replace('four shallow bowls','shallow serving bowls').replace('four deep bowls','deep serving bowls').replace('four dinner portions','one dinner portion per serving').replace('four portions','one portion per serving').replace('to make pockets and place','to make pockets and place').replace('to open eight pockets','to open the pockets') for s in r['instructions']]
save()
# Independent meat-lane review corrected timing margin and remaining scaled splits.
for n,v in {337:30,339:35,346:30,350:35,365:30,377:30}.items(): recipes[n-331]['cookMinutes']=v
recipes[335-331]['instructions']=[s.replace('a quarter of the spinach-orzo mixture','a proportional serving of the spinach-orzo mixture') for s in recipes[335-331]['instructions']]
recipes[348-331]['instructions'][1]=recipes[348-331]['instructions'][1].replace('1 tablespoon oil','half the oil')
recipes[353-331]['instructions'][2]=recipes[353-331]['instructions'][2].replace('1/4 cup reserved pasta water','a splash of reserved pasta water')
recipes[370-331]['instructions'][2]=recipes[370-331]['instructions'][2].replace('1/4 cup reserved pasta water','enough reserved pasta water to loosen the sauce')
save()

# Replace substantive overlap with an original miso-udon supper before final media approval.
extra('misoudon','Just One Cookbook','Miso Nikomi Udon','https://www.justonecookbook.com/miso-nikomi-udon/','The Japanese reference pairs miso broth with thick udon and poultry; this mild turkey version does not claim the traditional Nagoya formulation.')
extra('nikuudon','RecipeTin Japan','Beef Udon (Niku Udon)','https://japan.recipetineats.com/beef-udon-niku-udon/','Prepared udon is warmed separately from its seasoned meat topping; this comparison informs gentle noodle handling, not the beef flavor.')
extra('bokchoysoup','RecipeTin Eats','Chinese Noodle Soup','https://www.recipetineats.com/chinese-noodle-soup/','Infuse broth with ginger and cook bok choy briefly; noodles and vegetables need different cooking times.')
r=recipes[377-331]
r.update(title='Turkey mushroom miso udon soup',description='Thick udon noodles, savory turkey and tender mushrooms in a mild miso broth with bright bok choy.',cuisine='Japanese-inspired',prepMinutes=10,cookMinutes=30,ingredients=['1 tablespoon neutral oil','1 pound ground turkey','8 ounces presliced mushrooms','1 tablespoon finely grated ginger','4 cups low-sodium chicken broth','1 cup water','4 packages (7 ounces each) ready-cooked udon noodles','8 ounces bok choy, stems thinly sliced and leaves chopped separately','1/4 cup white miso paste','2 scallions, sliced'],instructions=['Heat oil in a large soup pot over medium-high heat. Cook turkey for 7–8 minutes, breaking it into small pieces, until it reaches 165°F.','Add mushrooms and cook 5–6 minutes until they soften and their surface moisture evaporates. Stir in ginger for 30 seconds, then add broth and water and bring to a simmer.','Add bok choy stems and simmer 3 minutes. Add the ready-cooked udon and bok choy leaves and simmer gently for the noodle package time, usually 2–3 minutes, separating the strands without tearing them.','Remove from heat. Put miso in a small bowl and whisk with a ladle of the hot broth until smooth, then stir back into the soup. Divide among serving bowls and finish with scallions. Serve promptly; do not hard-boil after adding miso.'],notes='An original mild turkey-and-mushroom udon supper using ready-cooked thick noodles and white miso. Unlike traditional Nagoya miso nikomi udon, this uses supermarket chicken broth and ground turkey rather than dashi and the usual toppings. Hands-on estimate:20minutes. Scale ingredients proportionally, use a larger pot and maintain separate stem/leaf cooking; do not scale cooking time. Desk-reviewed, not kitchen-tested.')
r['research']=dict(accessedAt='2026-10-16',sources=[S[k] for k in ['misoudon','nikuudon','bokchoysoup']],nonNegotiableTechniques=['Cook turkey to165°F before broth; add bok choy leaves and ready-cooked noodles late.','Dissolve miso in hot broth off heat to prevent lumps and preserve its aroma.'],repeatedSuccessSignals=['Source methods support staged noodle and vegetable cooking; no reader results for this original formulation are claimed.'],repeatedFailureRisks=['Dry udon is not a time-neutral substitute; hard boiling breaks prepared noodles and dulls white miso.'],adaptationDecision='Replaced the proposed turkey-mushroom lettuce cups because they substantially overlapped an existing Sichuan turkey lettuce bowl. This is a brothy white-miso supper with thick wheat noodles and bok choy, not a glaze over rice in lettuce.')
save()

# Bounded review receipts: distinct cooking constraints, ingredient roles and source comparisons.
import re
checks={
331:'Rice steams while thin thigh strips sear separately from bagged cabbage; cornstarch is dispersed in the sauce water before a final boil. One pound chicken plus rice and14ounces vegetables serves four.',
332:'Four5ounce half-inch cutlets fit a broad sheet with12ounces beans. Oil-coated panko browns before wet sauce and cheese are added. Quick couscous steeps while the oven finishes chicken to165°F.',
333:'Three-quarter-inch chicken pieces cook separately from snap peas. Orange juice supplies sauce liquid;2teaspoons starch thickens it only after boiling. Rice cooks concurrently.',
334:'Quarter-inch cutlets are removed at165°F before a separate Marsala reduction. Eight ounces noodles and2cups peas cook together;12cups water is vessel fill, not consumed broth.',
335:'One cup orzo hydrates in2.5cups broth with a little cream. Stirring beneath the cutlets prevents sticking; spinach wilts after chicken and pasta independently finish.',
336:'Cooked chicken, beans and corn are reheated before corn tortilla strips enter the sauce. Late covered cheese melting avoids breaking down tortillas further.',
337:'Two cups cooked chicken and one can beans are supported by4cups broth and a tomato can. Corn and chicken heat late; chips and avocado remain cool/crisp until service.',
338:'Four3ounce naan carry2cups chicken and1cup cheese. Thin toppings heat to165°F during10–14minutes in425°F oven; fresh tomatoes and half the spinach form the side.',
339:'One pound half-inch potato cubes soften in3cups broth before milk-flour slurry. Chicken and corn enter late, and milk remains at a gentle simmer. Rolls supply additional starch.',
340:'One pound chicken strips sears before mushrooms;1tablespoon flour thickens1cup broth. Sour cream is added at low heat; noodles and peas cook concurrently.',
341:'Eight ounces dry shells cook in2cups broth plus15ounces sauce; occasional stirring prevents sticking. One pound turkey is fully browned before the covered pasta stage.',
342:'Zucchini shells pre-soften12minutes while turkey cooks. Chopped centers reduce with filling; beans and eight small tortillas supply a substantial dinner beyond the vegetable boats.',
343:'Ten ounces linguine shares its pot with12ounces broccoli. Half-inch cutlets reach165°F separately; cream and Parmesan emulsify with reserved pasta water off heat.',
344:'Half-inch potato pieces microwave before acidic sauce. Thigh cubes cook separately from vegetables and return briefly after peppers and potatoes finish.',
345:'Quick couscous uses a package-checked broth ratio; half-inch chicken cutlets cook in a separate skillet. Seeded diced cucumber avoids flooding the yogurt, which stays uncooked.',
346:'Mushroom moisture evaporates before chicken reheats. Four large folded tortillas cook in two pairs; cabbage slaw is mixed during filling preparation.',
347:'One pound turkey, chopped spinach and reduced tomato sauce divide among four buns. Onion cooks with mince and the filling must mound rather than run.',
348:'Shelf-stable ready-cooked rice removes overnight chilling from the schedule. Chicken, egg and frozen vegetables cook in stages; final mixture reaches165°F.',
349:'Eight ounces thin rice noodles drain thoroughly before dressing. Three cups chilled cooked chicken and raw cucumber/carrot make a substantial cold meal without an uncounted cooking step.',
350:'Two cups cooked chicken, cannellini beans and28ounces tomatoes build a soup with3cups broth. Spinach enters only after chicken reheats; bread is included.',
351:'One pound half-inch sweet potato cubes soften for20–25minutes in tomato broth after turkey browns. Kidney beans support four hearty portions; yogurt is a cool finish.',
352:'Four8ounce potatoes cook in two microwave pairs,16–24minutes plus a short rest. Broccoli steams while potatoes cook; cornstarch-milk sauce reheats chicken before cheddar enters off heat.',
353:'Penne and asparagus/peas share boiling water. Chicken strips reach165°F before a short lemon-butter deglaze; Parmesan finishes off heat to retain a light sauce.',
354:'Fully cooked sausage browns before shelf-stable gnocchi simmer in marinara and measured water. Package texture and165°F sausage determine finish; spinach enters last.',
355:'Chicken is removed before cooking vegetables, with zucchini later than corn and pepper. Tortillas warm after the skillet is ready; lime and feta enter off heat.',
356:'Only10–12minute quick barley meets the schedule. Mushrooms brown first; carrot gets a head start and cooked chicken heats during the last five minutes.',
357:'Twelve ounces cooked turkey and mozzarella are spread thinly inside four pita. The hot center must reach165°F before service with raw tomato-cucumber salad.',
358:'Peppers soften for15minutes before filling and20–25minutes afterward. Couscous steeps while the oven runs;57minute total includes filling transfer and a165°F center.',
359:'One pound chicken and one pound small cauliflower pieces cook in broth under a lid. Cold cornstarch-milk slurry thickens before cheddar melts off heat; bread completes the plate.',
360:'Eight ounces ramen and cooked chicken share six cups broth/water. Chicken reheats before noodles enter; spinach, sesame oil and scallions finish late.',
361:'Four turkey patties use one egg and one-third cup crumbs as a binder. Three-quarter-inch patties brown then finish in gravy to165°F; potato and pea mash cooks concurrently.',
362:'Refrigerated squash ravioli cook separately and gently to avoid torn wrappers. Chicken reheats in broth while spinach wilts; sage butter coats rather than floods the pasta.',
363:'Spaghetti and broccoli cook together while chicken strips sear. Sesame-soy dressing is mixed first and loosened with only as much reserved water as needed.',
364:'Three-quarter cup raw rice cooks directly in5cups broth. Carrots soften before rice; cooked chicken and peas enter late, with lemon and dill off heat.',
365:'Eight ounces pasta absorb broth and tomato sauce under a lid. Cooked chicken and corn enter late to avoid stringy meat; cheddar and lime finish off heat.',
366:'Chicken/bean filling reaches165°F before layering over8ounces chips. Cheese melts7–10minutes, while fresh salsa and yogurt stay out of the oven.',
367:'Three-quarter cup rice cooks20–25minutes in tomato broth after cabbage wilts. Five-minute rest is included in53minute total, and rice texture overrides elapsed time.',
368:'Three cups chilled chicken plus toast make the strawberry salad dinner-sized. Half the dressing is reserved before tossing chicken; dry greens receive dressing at service.',
369:'Half-inch potatoes microwave6–8minutes before sealed foil packets bake20–25minutes. Thin cutlets and green beans cook above the potatoes; both tenderness and165°F are checked.',
370:'Medium shells boil two minutes shy of tender. Turkey reaches165°F before the sauce; ricotta dollops and mozzarella bake10–12minutes, then rest3minutes.',
371:'Chilled cooked chicken requires no cooking. Apples meet acidic dressing immediately; romaine stays separate until service and rolls complete the portions.',
372:'Half-inch sweet potato cubes microwave before pan browning, preventing hard centers. Chicken and drained beans reheat late; lime yogurt stays uncooked.',
373:'Filling is microwaved to165°F before layering. Covered15minute and uncovered5–8minute bake plus5minute rest are included within50minutes total.',
374:'One-inch turkey meatballs number roughly five per eater. Small pasta simmers with meatballs for12–15minutes; largest meatball must reach165°F without a violent boil.',
375:'A20ounce pack of chicken dumplings plus extra chicken fills four soup portions. Follow dumpling boiling instructions, not a floating-only test; verify165°F centers.',
376:'Four8ounce potatoes cook in pairs. Three cups chicken reheat with only2tablespoons mild buffalo sauce; a third of yogurt softens filling while the rest dresses celery slaw.',
377:'One pound turkey browns to165°F before mushrooms and5cups liquid. Four7ounce packages ready-cooked udon supply dinner starch; bok choy stems cook before leaves, and miso dissolves off heat.',
378:'Three cups chilled chicken and1cup hummus fill four pita. Raw vegetables are dressed then drained before stuffing; excess salad serves alongside.',
379:'Five-minute polenta cooks in package-checked broth volume while chicken reheats in marinara. Spinach enters the sauce late; butter and Parmesan finish polenta off heat.',
380:'Loose turkey browns before soup assembly. Carrots get a5minute head start before orzo and stem-free kale simmer10–12minutes; lemon enters off heat.'}

def rationale(line):
 l=line.lower()
 if 'water for boiling' in l:return line+' is cooking-vessel water; keep enough to submerge noodles rather than scaling linearly.'
 if 'water for rice' in l or 'water for sauce' in l:return line+' is assigned to its named purpose, preserving the rice hydration or sauce concentration when servings change.'
 roles=[('green beans','adds a fresh vegetable; trim ends and cook until tender'),('celery','adds vegetable crunch or aromatic flavor; slice to the stated size'),('avocado','adds cool creamy texture at serving; dice shortly before use'),('asparagus','adds a vegetable side within the pasta cooking time; trim woody ends and keep pieces uniform'),('greens','provides fresh salad volume; wash and dry thoroughly before dressing'),('miso','adds measured fermented soybean seasoning; dissolve off heat in hot broth'),('bok choy','adds greens; stems cook before delicate leaves'),('vinegar','provides measured acidity for dressing or pan sauce; it is not a grain'),('broth','is measured low-sodium cooking liquid, not the poultry protein'),('water','is hydration or steaming liquid allocated to the named purpose; extra loosening water is added only as needed'),('marsala','is fortified wine reduced for flavor; the dish is not alcohol-free'),('peas','adds a measured sweet green vegetable; cook near the end to retain texture'),('cornstarch','thickens the measured liquid after being dispersed cold; bring to a gentle simmer'),('flour','provides a measured coating or thickener; cook it before serving'),('cooked chicken','is a prepared protein; hot dishes reheat it to165°F and cold dishes keep it chilled'),('rotisserie','is purchased cooked poultry, so raw-chicken preparation is not hidden in timing'),('ground turkey','provides the main protein; break it up or shape as directed and verify165°F'),('chicken','supplies poultry protein; the specified cut and size determine the stated cooking range'),('turkey','provides poultry protein; use the explicitly cooked or raw form listed'),('dumplings','provides filled starch and protein; brand boiling directions and165°F filling determine doneness'),('rice','provides the starch; the named cooked or raw form and its liquid instructions are not interchangeable'),('couscous','is quick-steeping starch; pearl couscous would require a different method'),('polenta','is the explicitly quick-cooking starch; package hydration and texture determine finish'),('barley','is the explicitly quick-cooking grain, not ordinary pearl barley'),('pasta','provides dinner starch; check package timing and keep enough liquid'),('shells','provide dinner starch; stop at the stated package-relative doneness'),('linguine','provides dinner starch and starchy water for emulsifying sauce'),('spaghetti','provides dinner starch; reserve water only for texture adjustment'),('noodles','provides dinner starch; use the specified type and drain as directed'),('ravioli','is prepared filled pasta; gentle handling prevents tearing'),('gnocchi','is prepared starch; simmer to the package texture without overcooking'),('broth','supplies simmering liquid; low sodium leaves room for cheese or sauce seasoning'),('milk','supplies dairy sauce liquid; gentle heat protects texture'),('cream','adds dairy richness; avoid a hard boil after the dairy finish'),('yogurt','adds cool acidity or a low-heat finish, not prolonged boiling'),('cheddar','adds cheese body and seasoning; melt at the end'),('mozzarella','melts over the hot topping; spread evenly'),('monterey','melts over the filling; spread evenly'),('parmesan','adds salty savory depth; add gently rather than boiling'),('ricotta','provides creamy pockets without hand-stuffing shells'),('feta','adds tang and salt as a finishing ingredient'),('beans','adds ready-cooked substance; rinse and drain so can liquid does not dilute the dish'),('potato','supplies starch; the stated piece size and tenderness check matter more than the clock'),('spinach','adds greens; wilt late or keep raw as specified'),('kale','adds greens; remove thick stems so leaves soften within the stated time'),('mushroom','adds savory depth; evaporate released moisture before sauce or wrapping'),('cabbage','adds vegetable bulk; the shredded form shortens preparation'),('broccoli','adds the main vegetable; small florets cook in the stated short window'),('cauliflower','adds the main vegetable; use small florets for even covered cooking'),('tomato','adds acidity and vegetable body; use canned juices only where instructed'),('salsa','supplies prepared mild tomato seasoning and liquid'),('marinara','supplies prepared tomato sauce with measured moisture'),('lettuce','provides raw crunch; wash and dry before serving'),('romaine','provides raw crunch; dress shortly before serving'),('cucumber','provides raw freshness; dice or slice as listed and avoid excess watery seeds'),('carrot','provides sweet vegetable texture; the specified thin cut or grate keeps preparation/cooking short'),('zucchini','provides tender vegetable structure; avoid watery overcooking'),('corn','provides sweetness and vegetable bulk; frozen kernels require heating through'),('pepper','provides seasoning or vegetable structure in the stated form'),('onion','provides the aromatic base; soften or use raw as directed'),('garlic','provides aromatic seasoning; brief heat prevents scorching'),('ginger','provides aromatic warmth; grate finely for even distribution'),('lemon','provides finishing acidity; the measured juice/zest is distinct from whole fruit'),('lime','provides finishing acidity rather than an uncounted garnish'),('vinegar','provides measured acidity for dressing or pan sauce'),('soy','provides measured salt and umami; low sodium limits excessive salinity'),('honey','balances acidity with a small measured sweetness'),('sugar','balances acidity; dissolve fully in the sauce'),('mustard','adds tang and emulsifying character'),('butter','adds measured fat to the sauce or mash'),('oil','is measured cooking or dressing fat; allocate it as the steps describe'),('salt','is a restrained baseline seasoning across four portions'),('egg','sets or binds as the method specifies; do not leave it raw'),('bread','provides the included starch side or structure, with no hidden homemade preparation'),('rolls','provide the included starch side; purchased rolls require no dough preparation'),('bun','provides sandwich structure; the filling is reduced to avoid soaking'),('pita','provides a purchased pocket; warm briefly for flexibility'),('naan','provides a purchased flatbread base; thin toppings heat evenly'),('tortilla','provides the starch; soft tortillas and crisp chips are not interchangeable'),('hummus','provides a prepared chickpea-sesame spread, with no hidden blending step'),('pesto','provides prepared basil seasoning; check its nut/dairy label'),('apple','provides fruit crunch; dress soon after cutting'),('strawberr','provides juicy fruit; slice shortly before assembly'),('cranberr','provides a small dried-fruit accent rather than the main protein or starch'),('sesame seeds','provides a measured finishing crunch'),('sunflower','provides a measured finishing crunch'),('scallion','provides a fresh aromatic finish'),('cilantro','provides an explicit fresh-herb finish'),('dill','provides an explicit fresh-herb finish')]
 for token,role in roles:
  if token in l:return line+' across the original four servings '+role+'.'
 return line+' is measured seasoning for the original four servings; incorporate at the named step rather than adding an unlisted garnish.'
receipts={}
for r in recipes:
 n=int(r['rosterId'][2:]);equipment=[]
 phrases=['large microwave-safe bowl','microwave-safe plate','microwave-safe covered bowl','vented covered bowl','wide oven-safe skillet','deep lidded skillet','large soup pot','large saucepan','small saucepan','wide skillet','large skillet','large pot','baking sheet','baking sheets','baking dish','skillet','saucepan','pot','serving bowl','small bowl','large bowl','toaster']
 seen=set()
 for i,step in enumerate(r['instructions']):
  for p in phrases:
   if re.search(r'\b'+re.escape(p)+r'\b', step) and not any(re.search(r'\b'+re.escape(p)+r'\b', x) for x in seen):
    equipment.append(dict(phrase=p,instructionIndex=i,label=p.capitalize()));seen.add(p)
 receipts[r['rosterId']]=dict(cookingRationale=checks[n],ingredientRationales=[rationale(x) for x in r['ingredients']],scalingRationale='Scale edible ingredients with servings; retain specified piece thickness and one portion per eater. Cooking water for boiling, optional loosening water, temperatures and timings are vessel/doneness decisions. Use additional cookware or batches when surface area is insufficient; do not multiply cooking time. '+r['research']['repeatedFailureRisks'][0],equipment=equipment,historyParagraphs=[r['research']['adaptationDecision'],'Culinary comparison: '+'; '.join(s['publisher']+' — '+s['title']+': '+s['signal'] for s in r['research']['sources'])+' These references support component decisions, not a claim that this exact meal was tested or traditionally established.'],instructionAuditRationale=checks[n]+' Main risk reviewed: '+r['research']['repeatedFailureRisks'][0],reviewedAt='2026-10-16')
receipts['DI334']['scalingRules']={'12':{'kind':'fixed','reason':'vessel'}}
Path('scripts/recipe-enrichment/simple-dinners/poultry-reviews.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2)+'\n')
