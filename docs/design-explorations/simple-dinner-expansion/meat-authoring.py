"""Original editorial records; run to serialize the reviewed meat slice only."""
import json
from pathlib import Path
S={}
def source(k,p,t,u,s): S[k]={'publisher':p,'title':t,'url':u,'rating':None,'ratingCount':None,'signal':s}
source('safe','FoodSafety.gov','Safe Minimum Internal Temperatures','https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures','Thermometer endpoints and rests govern doneness.')
source('stroganoff','Budget Bytes','Beef Stroganoff','https://www.budgetbytes.com/one-pot-beef-mushroom-stroganoff/','Tender noodles; dairy added after simmering.')
source('pork','Good Food','Pork medallions','https://www.bbcgoodfood.com/recipes/pork-medallions','Sear first; finish gently in sauce.')
source('cabbage','Budget Bytes','Beef and Cabbage Stir Fry','https://www.budgetbytes.com/beef-cabbage-stir-fry/','Thin vegetables cook after beef browns.')
source('tomato','Budget Bytes','Beef and Tomato Rice Bowl','https://www.budgetbytes.com/beef-and-tomato-rice-bowl/','Brown beef before introducing wet ingredients.')
source('taco','Budget Bytes','Taco Pasta','https://www.budgetbytes.com/beef-taco-pasta/','Short pasta needs covered simmering and stirring.')
source('tacoskillet','Budget Bytes','Beef Taco Skillet','https://www.budgetbytes.com/beef-taco-skillet/','Beans stretch browned beef; toppings finish separately.')
source('noodles','Budget Bytes','Garlic Noodles with Beef and Broccoli','https://www.budgetbytes.com/garlic-noodles-with-beef-and-broccoli/','Noodles integrate protein and vegetables; heat is optional.')
source('beans','Budget Bytes','White Beans with Tomato and Sausage','https://www.budgetbytes.com/white-beans-tomato-sausage/','Bean variety affects texture; broth controls thickness.')
source('sausage','Budget Bytes','Italian Sausage and White Bean Skillet','https://www.budgetbytes.com/italian-sausage-white-bean-skillet/','Brown sausage before folding in beans and spinach.')
source('kielbasa','Budget Bytes','Kielbasa and Cabbage Skillet','https://www.budgetbytes.com/kielbasa-cabbage-skillet/','Mustard and vinegar balance sausage and cabbage.')
source('ham','Good Food','Pasta with ham and minty pea pesto','https://www.bbcgoodfood.com/recipes/pasta-ham-minty-pea-pesto','Add peas late; reserve water to loosen sauce.')
source('lentil','Budget Bytes','Lentil and Sausage Stew','https://www.budgetbytes.com/lentil-sausage-stew/','Dry lentils need substantial simmering; greens go last.')
source('pumpkin','Budget Bytes','Pasta with Creamy Pumpkin Sauce','https://www.budgetbytes.com/pasta-creamy-pumpkin-sauce/','Pumpkin purée becomes sauce with broth and dairy.')
source('salad','Good Food','Chilli and lime steak salad','https://www.bbcgoodfood.com/recipes/oriental-steak-salad/','Rest steak before slicing onto dressed leaves.')
source('pineapple','Good Food','Pineapple fried rice','https://www.bbcgoodfood.com/recipes/pineapple-fried-rice','Separate cooked rice grains; fruit finishes the pan.')
source('quesadilla','Budget Bytes','Hearty Black Bean Quesadillas','https://www.budgetbytes.com/hearty-black-bean-quesadillas/','Moderate heat melts cheese as tortillas crisp.')
source('potato','Budget Bytes','Oven Roasted Potatoes','https://www.budgetbytes.com/oven-roasted-potatoes/','Parboiling and surface drying aid potato browning.')
source('sloppy','University of Kentucky Food as Health Alliance','Budget Friendly Sloppy Joes','https://foodashealthalliance.ca.uky.edu/sites/foodashealthalliance.ca.uky.edu/files/sloppy%20joes.pdf','Canned lentils offer a fast beef-filling extension.')
source('navy','Budget Bytes','Navy Bean Soup','https://www.budgetbytes.com/navy-bean-soup/','Ham seasons beans; mashed beans thicken broth.')
source('courgette','Good Food','Top 20 ways to use courgettes','https://www.bbcgoodfood.com/howto/guide/top-10-things-do-courgettes','Scooped courgettes hold savory baked fillings.')
R=[]; reviews=[]
def add(n,title,desc,prep,cook,ings,steps,keys,truth,duplicate,notes='',inactive=0):
 r=dict(rosterId=f'DI{n}',title=title,description=desc,category='Dinner',cuisine='Everyday home cooking',tier='household-anchor',yieldQuantity=4,yieldUnit='servings',prepMinutes=prep,cookMinutes=cook,inactiveMinutes=inactive,ingredients=ings.split('|'),instructions=steps,notes='Hands-on estimate: 20 minutes or less. '+notes+' Scale ingredients proportionally; for more than four servings use a second pan or cook in batches, allowing extra time. Keep food in a shallow layer for browning; do not double simmering time. Check tenderness and temperature, not the clock.',artworkIndex=(n-381)%24,kitchenTestState='desk-reviewed',kitchenTestNotes=['Original formulation reviewed on paper; not kitchen-tested. '+truth],research=dict(accessedAt='2026-10-16',sources=[S[k] for k in keys]+[S['safe']],nonNegotiableTechniques=[truth],repeatedSuccessSignals=['Editorial target, not reviewer consensus: '+desc],repeatedFailureRisks=['Desk-review risk: '+notes],adaptationDecision='Original everyday dinner using the cited technique comparisons. '+duplicate))
 R.append(r); reviews.append((r['rosterId'],title,truth,duplicate,keys))
add(381,'Beef mushroom stroganoff with egg noodles','Golden mushrooms and tender beef in a tangy cream sauce, with peas tucked among the noodles.',10,25,
'1 pound lean ground beef|12 ounces sliced cremini mushrooms|10 ounces dried wide egg noodles|2 cups frozen peas|1 small onion, finely diced|2 cloves garlic, minced|1 cup low-sodium beef broth|3/4 cup sour cream|1 tablespoon Dijon mustard|1 tablespoon all-purpose flour|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Bring a covered pot of water to a boil. Cook the noodles according to the package, adding peas for the last 3 minutes. Reserve 1 cup cooking water and drain.',
'Meanwhile, heat oil in a 12-inch deep skillet. Cook beef and onion over medium-high heat for 6–8 minutes, breaking up the meat, until the beef reaches 160°F. Transfer to a plate.',
'Cook mushrooms in the same pan for 6 minutes until their liquid evaporates. Stir in garlic and flour for 1 minute, then gradually add broth. Return beef; simmer 3 minutes until lightly thickened.',
'Remove from heat. Stir in mustard, sour cream, salt and pepper, then noodles and peas. Loosen with reserved water a tablespoon at a time; serve immediately without boiling the sour cream.'
],['stroganoff','ham'],'Boil noodles separately to control texture; sour cream goes in off heat.','Distinct from existing mushroom stroganoff: beef gravy and peas, no dill or yogurt.','Use a pasta pot and a 12-inch skillet. Contains wheat, egg, milk and mustard.')
add(382,'Cheeseburger rice skillet with peas','A warm skillet of beef, fluffy rice and peas under melted cheddar, brightened with chopped pickles.',10,35,
'1 pound lean ground beef|1 cup dry long-grain white rice|2 cups frozen peas|1 small onion, diced|2 cups low-sodium beef broth|1 cup shredded cheddar|1/3 cup ketchup|1 tablespoon yellow mustard|1/3 cup chopped dill pickles|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Heat oil in a deep 12-inch lidded skillet. Brown beef and onion for 7 minutes, breaking up clumps, until beef reaches 160°F.',
'Stir in rice, broth, ketchup, mustard and pepper. Bring to a boil, cover and reduce to low. Simmer 17–20 minutes until rice is almost tender.',
'Scatter peas over the rice, cover and cook 4 minutes. If the rice is still firm and dry, add 1/4 cup water and continue covered until tender.',
'Turn off the heat, sprinkle with cheddar and cover for 3 minutes. Top with pickles and serve four generous scoops.'
],['tomato','tacoskillet'],'Covered rice absorption precedes peas and cheese.','Different format and cooking path from grilled cheeseburgers; complete one-pan rice meal.','Use one deep lidded skillet; long-grain white rice, not brown. Contains milk and mustard; check broth.')
add(383,'Beef cabbage tomato skillet with bulgur','Sweet cabbage and tomato mingle with beef and nutty bulgur in a soft, spoonable supper.',10,30,
'1 pound lean ground beef|1 cup medium bulgur|4 cups thinly sliced green cabbage|1 small onion, diced|1 can (14.5 ounces) diced tomatoes with juices|1 1/2 cups low-sodium beef broth|2 cloves garlic, minced|1 teaspoon sweet paprika|1 tablespoon cider vinegar|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oil in a deep lidded skillet. Cook beef and onion 7 minutes over medium-high heat, breaking up meat, until beef reaches 160°F.',
'Add garlic, paprika and cabbage. Stir for 3 minutes to begin wilting the cabbage.',
'Add bulgur, tomatoes, broth, salt and pepper. Bring to a simmer, cover and cook on low 12–15 minutes, stirring once, until the bulgur is tender.',
'Uncover and stir in vinegar. If liquid remains, simmer uncovered for 2 minutes; if grains need more cooking, add 1/4 cup water and cover again briefly. Divide among four plates.'
],['cabbage','tomato'],'Specify medium bulgur; fine or coarse grades change absorption and timing.','Unlike existing Turkish beef bulgur, cabbage and paprika dominate; no peppers, spinach or yogurt.','One deep skillet. Contains wheat.')
add(384,'Beef zucchini taco rice','Mild cumin beef, juicy zucchini and corn folded into tomato rice with a little melted cheese.',10,35,
'1 pound lean ground beef|1 cup dry long-grain white rice|2 medium zucchini, cut into 1/2-inch pieces|1 cup frozen corn|1 cup mild tomato salsa|1 3/4 cups low-sodium beef broth|1 teaspoon ground cumin|1 teaspoon sweet paprika|3/4 cup shredded Monterey Jack|1 lime, cut into wedges|1 tablespoon olive oil',[
'Heat oil in a deep lidded skillet; brown beef with cumin and paprika for 7 minutes, breaking it into small pieces, until it reaches 160°F.',
'Stir in rice, salsa and broth. Bring to a boil, cover and simmer on low for 15 minutes.',
'Add zucchini and corn, folding them gently into the rice. Cover and simmer 7–9 minutes until the rice and zucchini are tender; add a splash of water if dry.',
'Remove from heat, scatter cheese over the top and cover for 3 minutes. Serve with lime wedges.'
],['tacoskillet','tomato'],'Add zucchini late so it does not collapse during rice cooking.','Distinct from tortilla-layer beef taco casserole; this is an absorption-cooked rice dinner.','One deep skillet. Choose mild salsa; contains milk.')
add(385,'Steak mushroom pepper flatbreads','Crisp flatbreads carry sliced steak, browned mushrooms and sweet peppers beneath bubbling mozzarella.',12,30,
'1 pound sirloin steak, 3/4 inch thick|2 large naan flatbreads (about 6 ounces each)|8 ounces sliced mushrooms|2 bell peppers, thinly sliced|1 cup shredded mozzarella|1/3 cup plain Greek yogurt|1 tablespoon Dijon mustard|1 teaspoon dried oregano|2 tablespoons olive oil, divided|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat the oven to 425°F. Season steak with salt and pepper. Heat 1 tablespoon oil in a large skillet and sear steak 4–5 minutes per side, to 145°F; rest on a clean board at least 3 minutes.',
'Add remaining oil to the skillet. Cook mushrooms and peppers for 7–8 minutes until softened and any mushroom water has evaporated. Stir in oregano.',
'Mix yogurt and mustard. Put both naan on an 18-by-13-inch sheet pan, spread with the yogurt mixture, and divide vegetables and mozzarella over them. Bake 6–8 minutes until edges crisp and cheese melts.',
'Slice rested steak thinly across the grain. Lay over the hot flatbreads, cut each into two portions and serve.'
],['salad','quesadilla'],'Cook steak separately; add after baking to protect its texture.','Unlike cheesesteaks, these have a crisp open base, yogurt spread and mushrooms, with no sandwich roll.','Skillet plus large sheet pan. Contains wheat, milk and mustard. Do not crowd the naan.')
add(386,'Beef lentil sloppy Joes with carrot slaw','Saucy beef and lentils fill soft buns, with crunchy carrot-cabbage slaw alongside.',10,20,
'12 ounces lean ground beef|1 can (15 ounces) brown lentils, rinsed and drained|4 large whole-wheat burger buns|1 small onion, diced|3/4 cup tomato sauce|1/4 cup ketchup|1 tablespoon Dijon mustard|2 tablespoons cider vinegar, divided|2 cups bagged shredded cabbage|1 cup bagged shredded carrots|1/3 cup plain Greek yogurt|1 tablespoon olive oil|1/4 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oil in a skillet and cook beef with onion for 7 minutes, breaking it apart, until beef reaches 160°F.',
'Add lentils, tomato sauce, ketchup, mustard and 1 tablespoon vinegar. Simmer uncovered for 8–10 minutes until thick enough to mound on a spoon.',
'Meanwhile, toss cabbage and carrots with yogurt, remaining vinegar, salt and pepper.',
'Split the buns. Divide hot filling among the four bases, close the sandwiches and serve with slaw. Keep slaw separate until eating so the buns stay firm.'
],['sloppy','tomato'],'Use canned cooked lentils; simmer filling until it will stay on a bun.','Compared with LU013 Sloppy Joe: lentils replace part of beef and a complete fresh slaw is included.','One skillet; canned lentils are essential to timing. Contains wheat, milk and mustard.')
add(387,'Beef sweet potato taco skillet','Tender sweet potato cubes, mild spiced beef and black beans make a hearty lime-finished skillet.',12,30,
'12 ounces lean ground beef|1 pound sweet potatoes, peeled and cut into 1/2-inch cubes|1 can (15 ounces) black beans, rinsed and drained|1 red bell pepper, diced|1/2 cup mild tomato salsa|1 teaspoon ground cumin|1 teaspoon sweet paprika|1 avocado, diced|1 lime, juiced|1 tablespoon olive oil|3/4 cup water|1/2 teaspoon salt',[
'Heat oil in a deep lidded skillet. Brown beef for 6–7 minutes, breaking it apart, until it reaches 160°F. Stir in cumin, paprika and salt.',
'Add sweet potato, pepper and water. Cover and simmer over medium-low heat for 12–15 minutes, stirring twice, until a knife easily pierces the potato.',
'Stir in beans and salsa. Simmer uncovered for 4 minutes until hot and the sauce clings to the vegetables; add water a tablespoon at a time if needed.',
'Take off the heat and add lime juice. Divide among four plates and top with avocado just before serving.'
],['tacoskillet','cabbage'],'Half-inch sweet potato cubes steam before acidic salsa is added.','Distinct from BBQ cheddar sweet potatoes: diced skillet starch, black beans and lime; no barbecue sauce or cheese.','One deep skillet. Naturally no dairy; check salsa labels.')
add(388,'Beef spinach ricotta pasta shells','Small shells catch a quick beef-tomato sauce, with soft ricotta spooned over wilted spinach.',10,25,
'12 ounces lean ground beef|12 ounces dried medium pasta shells|5 ounces baby spinach|1 can (28 ounces) crushed tomatoes|3/4 cup ricotta|1/3 cup grated Parmesan|2 cloves garlic, minced|1 teaspoon dried basil|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Bring a covered pot of water to a boil. Cook shells until just tender according to the package; reserve 1 cup water and drain.',
'While the pasta cooks, heat oil in a deep skillet. Brown beef 7 minutes, breaking up lumps, until it reaches 160°F. Add garlic and basil for 30 seconds.',
'Add tomatoes, salt and pepper. Simmer uncovered 10 minutes, then fold in spinach for 2 minutes until wilted.',
'Toss drained shells into the sauce, adding reserved water if needed. Spoon ricotta over the top, sprinkle with Parmesan and cover off heat for 2 minutes to warm the cheese.'
],['taco','ham'],'Small unstuffed shells avoid the labor and bake time of stuffed pasta.','Different from manicotti and lasagna: stovetop loose shells, no layering or stuffing.','Pasta pot plus skillet. Contains wheat and milk; check pasta for egg.')
add(389,'Steak garlic broccoli noodles','Sliced steak, bright broccoli and slippery noodles in a mild garlic-sesame sauce.',10,25,
'1 pound sirloin steak, 3/4 inch thick|10 ounces dried spaghetti|12 ounces small broccoli florets|3 cloves garlic, minced|3 tablespoons reduced-sodium soy sauce|1 tablespoon honey|1 tablespoon rice vinegar|2 teaspoons toasted sesame oil|2 tablespoons neutral oil, divided|1/4 teaspoon black pepper',[
'Boil a covered pot of water. Cook spaghetti according to the package, adding broccoli during the last 3 minutes. Reserve 1 cup cooking water and drain.',
'While water heats, rub steak with pepper. Heat 1 tablespoon neutral oil in a large skillet; sear steak 4–5 minutes per side to 145°F. Rest on a clean board at least 3 minutes.',
'Lower skillet heat. Add remaining neutral oil and garlic for 30 seconds. Stir in soy sauce, honey, vinegar and 1/4 cup noodle water; simmer 1 minute.',
'Slice steak across the grain. Toss noodles and broccoli through sauce, then fold in steak, its juices and sesame oil. Loosen with more noodle water as needed and serve.'
],['noodles','salad'],'Rest whole steak before slicing; broccoli cooks in the pasta pot.','Compared with DI093 beef and broccoli: noodles replace rice and mild garlic dressing replaces the thick stir-fry sauce.','Pasta pot plus skillet. Contains wheat, soy and sesame.')
add(390,'Beef potato green bean skillet','Golden potato chunks, green beans and browned beef with a buttery mustard finish.',12,25,
'1 pound lean ground beef|1 1/2 pounds thin-skinned potatoes, cut into 1/2-inch cubes|12 ounces green beans, trimmed and cut in half|1 small onion, diced|2 tablespoons Dijon mustard|1 tablespoon butter|1 teaspoon dried thyme|1 tablespoon olive oil|1/2 cup water|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Put potatoes in a saucepan, cover with water and bring to a boil. Simmer 8–10 minutes until nearly tender, add green beans for the final 3 minutes, then drain well.',
'Meanwhile, heat oil in a wide skillet. Brown beef and onion 7–8 minutes, breaking the meat apart, until beef reaches 160°F. Transfer to a plate.',
'Put drained potatoes and beans in the skillet with butter. Cook over medium-high heat for 5 minutes, turning once to color the potato edges.',
'Return beef and add mustard, thyme, measured water, salt and pepper. Stir over medium heat for 2–3 minutes, until the potatoes are fully tender and the sauce lightly coats everything.'
],['potato','tomato'],'Parboil small potato cubes before skillet browning.','Distinct from beef stew and potato-topped pies: dry pan-fried cubes with mustard and green beans.','Saucepan plus skillet. Contains milk and mustard.')
add(391,'Beef mushroom onion melts with cucumber salad','Toasted rolls piled with beef, browned mushrooms and softened onions under Swiss cheese, with a cool cucumber side.',10,30,
'1 pound lean ground beef|8 ounces sliced mushrooms|2 medium onions, thinly sliced|4 whole-wheat sandwich rolls|4 slices Swiss cheese|1 English cucumber, thinly sliced|2 tablespoons cider vinegar|1/2 cup low-sodium beef broth|1 teaspoon dried thyme|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oil in a large skillet. Cook onions and mushrooms over medium heat for 12–15 minutes, stirring occasionally, until softened and golden; these are sautéed, not deeply caramelized onions.',
'Add beef, thyme, salt and pepper. Cook 7–8 minutes, breaking up beef, until it reaches 160°F. Add broth and simmer until only a little glossy liquid remains.',
'Heat the broiler. Split rolls onto a sheet pan; spoon filling onto their bases and top with Swiss. Broil 1–3 minutes until cheese bubbles, watching closely. Toast tops alongside.',
'Toss cucumber with vinegar. Close the warm sandwiches and serve with the cucumber salad.'
],['tomato','quesadilla'],'Allow real time for onion softening; reduce broth before filling rolls.','Avoids calling quick onions French onion soup; unlike cheesesteak this uses ground beef, mushrooms and Swiss.','Skillet plus sheet pan. Contains wheat and milk.')
add(392,'Beef taco soup with corn and beans','A light tomato broth full of beef, beans and corn, finished with lime and crisp tortilla chips.',10,25,
'12 ounces lean ground beef|1 can (15 ounces) black beans, rinsed and drained|1 1/2 cups frozen corn|1 can (14.5 ounces) diced tomatoes with juices|3 cups low-sodium beef broth|1 small onion, diced|2 teaspoons ground cumin|1 teaspoon sweet paprika|1 lime, juiced|4 ounces tortilla chips|1/2 cup plain Greek yogurt|1 tablespoon olive oil',[
'Warm oil in a soup pot. Cook beef and onion 7 minutes over medium-high heat, breaking up clumps, until beef reaches 160°F.',
'Stir in cumin and paprika for 30 seconds. Add tomatoes, broth, beans and corn, then bring to a boil.',
'Reduce heat and simmer uncovered 12 minutes, stirring occasionally, until the corn and beans are hot and the broth tastes rounded.',
'Stir in lime juice. Ladle into four bowls, add a spoonful of yogurt to each, and pass chips separately to keep them crisp.'
],['tacoskillet','beans'],'Broth remains soup-like; chips are added at the table.','Distinct from beef bean chili: short brothy simmer, corn and lime rather than thick long-cooked chili.','One soup pot. Contains milk; check chip and broth labels.')
add(393,'Beef cauliflower cheddar gratin','Roasted cauliflower and beef beneath a bubbling cheddar sauce, with bread for catching every last bit.',12,35,
'1 pound lean ground beef|1 pound small cauliflower florets|1 small onion, diced|1 cup milk|1 cup shredded cheddar|1 tablespoon all-purpose flour|1 teaspoon Dijon mustard|1/2 teaspoon dried thyme|4 thick slices whole-wheat bread|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oven to 425°F. Toss cauliflower with oil and half the salt on a sheet pan; roast 20–25 minutes, turning once, until tender and lightly browned.',
'Meanwhile, brown beef and onion in an oven-safe skillet over medium-high heat for 8 minutes until beef reaches 160°F. Stir in flour and thyme for 1 minute.',
'Lower heat and gradually stir in milk. Simmer 3 minutes until thickened, then stir in mustard, remaining salt, pepper and half the cheddar. Fold in roasted cauliflower.',
'Top with remaining cheddar and bake 6–8 minutes until bubbling and 165°F in the center. Warm bread on the now-empty sheet pan during the last 3 minutes; serve alongside.'
],['stroganoff','potato'],'Roast cauliflower before coating it; a flour-thickened sauce binds the gratin.','Replaces proposed cottage pie to avoid shepherd pie duplication; whole roasted florets, no mashed topping.','Sheet pan plus oven-safe skillet. Contains milk, wheat and mustard; oven preheating included in total.')
add(394,'Beef ginger carrot noodle soup','Fine beef crumbles and ribbons of carrot in ginger broth, with noodles and tender cabbage.',10,25,
'12 ounces lean ground beef|8 ounces dried thin rice noodles|2 cups bagged shredded carrots|3 cups shredded cabbage|1 tablespoon grated ginger|2 cloves garlic, minced|6 cups low-sodium beef broth|2 tablespoons reduced-sodium soy sauce|1 tablespoon rice vinegar|2 teaspoons toasted sesame oil|1 tablespoon neutral oil',[
'Heat neutral oil in a soup pot. Brown beef for 7 minutes, breaking it into small crumbles, until it reaches 160°F. Add garlic and ginger for 30 seconds.',
'Pour in broth and soy sauce, add carrots and cabbage, and bring to a boil. Simmer 7 minutes until the vegetables soften.',
'Add rice noodles and simmer for the package time, usually 3–5 minutes, separating them with tongs. Add water if they absorb too much broth.',
'Turn off heat and stir in vinegar and sesame oil. Divide noodles among four bowls and ladle beef, vegetables and broth over them; eat immediately.'
],['noodles','cabbage'],'Thin rice noodles cook in broth at the end, not throughout the vegetable simmer.','Different from existing pho-spiced steak bowls: ground beef, carrot-cabbage broth, no five-spice, fish sauce or herb mound.','One soup pot. Contains soy and sesame; standard soy sauce contains wheat.')
add(395,'Steak pepper corn quesadillas','Crisp folded tortillas with steak, sweet peppers, corn and melted Jack, served with tomato salsa.',10,45,
'1 pound sirloin steak, 3/4 inch thick|4 large (10-inch) flour tortillas|2 bell peppers, thinly sliced|1 cup frozen corn|1 cup shredded Monterey Jack|1 teaspoon ground cumin|1/2 cup mild tomato salsa|1 lime, cut into wedges|2 tablespoons neutral oil, divided|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oven to 425°F. Season steak with salt and pepper. Heat 1 tablespoon oil in a skillet and sear 4–5 minutes per side to 145°F; rest on a clean board at least 3 minutes.',
'Cook peppers in the same skillet for 5 minutes, then add corn and cumin for 3 minutes until hot. Slice steak thinly across the grain.',
'Brush a large sheet pan with remaining oil. Fill one half of each tortilla with cheese, vegetables and steak, fold shut, and bake two at a time without overlap. Bake each batch 6 minutes, flip carefully, then bake 4–5 minutes until crisp. Keep the first batch under a loose foil tent while the second bakes.',
'Let stand 1 minute before cutting. Serve each quesadilla with salsa and a lime wedge.'
],['quesadilla','salad'],'Rest cooked steak before slicing; thin filling allows cheese to melt before tortillas scorch.','Unlike existing bean quesadillas, this dinner is beef-led with corn and peppers; no duplicated sandwich format.','Skillet plus large sheet pan. Contains wheat and milk; do not overfill.')
add(396,'Beef bean cornbread skillet','A savory beef, bean and tomato filling beneath a tender cornmeal crust.',15,35,
'12 ounces lean ground beef|1 can (15 ounces) pinto beans, rinsed and drained|1 can (14.5 ounces) diced tomatoes with juices|1 bell pepper, diced|1 teaspoon ground cumin|3/4 cup fine cornmeal|1/2 cup all-purpose flour|1 teaspoon baking powder|1 large egg|3/4 cup milk|1/2 cup shredded cheddar|2 tablespoons neutral oil, divided|1/2 teaspoon salt',[
'Heat oven to 400°F. Heat 1 tablespoon oil in a deep 2.5-quart oven-safe skillet; cook beef and pepper 8 minutes until beef reaches 160°F. Add cumin, beans, tomatoes and half the salt; simmer 5 minutes.',
'While filling simmers, stir cornmeal, flour, baking powder and remaining salt in a bowl. Beat egg with milk and remaining oil, then mix into the dry ingredients just until combined; fold in cheddar.',
'Level the hot filling and spread batter gently over it. Bake 20–24 minutes until the crust is set, a tester in the bread comes out clean and the filling center reaches 165°F.',
'Rest 3 minutes before spooning into four portions. Include both the golden crust and the bean filling in each serving.'
],['tacoskillet','beans'],'Keep filling hot before adding batter; check bread and filling separately.','Cornmeal lid and bean filling distinguish this from taco casserole and potato hotdish.','One oven-safe skillet; mixing bowl is not a cooking vessel. Contains wheat, egg and milk.')
add(397,'Beef zucchini orzo with feta','Tender orzo with beef, small zucchini pieces and lemon, finished with salty crumbled feta.',10,25,
'1 pound lean ground beef|10 ounces dried orzo|2 medium zucchini, diced|1 small onion, diced|2 cloves garlic, minced|3 cups low-sodium beef broth|1 teaspoon dried oregano|1 lemon, zested and juiced|1/2 cup crumbled feta|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Heat oil in a deep skillet. Cook beef and onion 7 minutes over medium-high heat, breaking up clumps, until beef reaches 160°F.',
'Add zucchini, garlic and oregano; cook 3 minutes. Stir in orzo and broth, scraping the bottom clean.',
'Bring to a simmer and cook 10–12 minutes over medium-low heat, stirring every 2 minutes, until orzo is tender. Add a little water if it becomes dry before cooking through.',
'Take off heat. Stir in lemon zest, juice and pepper, then scatter feta over the top. Rest 2 minutes before serving.'
],['taco','tomato'],'Stir small pasta frequently so it does not settle and stick.','Unlike long-braised youvetsi: ground beef, no tomato braise, quick zucchini-lemon orzo.','One deep skillet. Contains wheat and milk.')
add(398,'Beef eggplant tomato couscous','Soft eggplant and browned beef in a cumin-tomato sauce over quick, fluffy couscous.',12,25,
'1 pound lean ground beef|1 medium eggplant (about 1 pound), cut into 1/2-inch cubes|1 1/2 cups dry instant couscous|1 can (14.5 ounces) diced tomatoes with juices|2 cloves garlic, minced|1 teaspoon ground cumin|1/2 teaspoon ground cinnamon|1 lemon, juiced|2 tablespoons olive oil, divided|2 cups water, divided|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat 1 tablespoon oil in a wide lidded skillet. Brown beef 7 minutes, breaking it apart, until it reaches 160°F. Transfer to a plate.',
'Add remaining oil and eggplant. Cook 4 minutes, turning, then stir in garlic, cumin and cinnamon for 30 seconds. Add tomatoes, 1/2 cup water, salt and pepper; cover and simmer 10–12 minutes until eggplant is fully soft.',
'Meanwhile, bring remaining 1 1/2 cups water to a boil in a saucepan. Stir in couscous, cover, remove from heat and stand 5 minutes; fluff with a fork.',
'Return beef to the eggplant sauce for 2 minutes to heat through. Stir in lemon juice and spoon over the couscous.'
],['tomato','beans'],'Small eggplant cubes need a covered moist finish after browning.','Distinct from moussaka and stuffed eggplant: unlayered tomato sauce over separate couscous, no béchamel.','Skillet plus saucepan. Contains wheat; instant couscous only, not pearl couscous.')
add(399,'Beef mushroom rice stuffed zucchini','Tender zucchini boats filled with beef, mushrooms and rice, capped with golden Parmesan.',15,35,
'4 large zucchini (about 12 ounces each)|12 ounces lean ground beef|8 ounces finely chopped mushrooms|1 pouch (8.8 ounces) cooked plain brown rice|1 cup tomato passata|1 teaspoon dried oregano|2 cloves garlic, minced|1/2 cup grated Parmesan|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oven to 425°F. Halve zucchini lengthwise and scoop out seedy centers, leaving 1/4-inch walls. Chop 1 cup of the scooped flesh. Set shells cut side up on a sheet pan, rub with half the oil and roast 12 minutes.',
'Meanwhile, heat remaining oil in a skillet. Cook beef, mushrooms and chopped zucchini flesh for 9 minutes until beef reaches 160°F and liquid has mostly evaporated. Add garlic and oregano for 30 seconds.',
'Fold in rice, passata, salt and pepper; simmer 3 minutes. Divide filling among the hot shells, mound it gently and sprinkle with Parmesan.',
'Bake 15–18 minutes until shells are easily pierced and filling reaches 165°F. Serve two halves per person.'
],['courgette','tomato'],'Pre-roast shells and evaporate mushroom water to avoid a watery filling.','Different from stuffed beef peppers: zucchini shells, mushroom rice and a thinner Parmesan finish.','Sheet pan plus skillet. Cooked rice pouch is essential to timing. Contains milk.')
add(400,'Steak peach arugula dinner salad','Warm sliced steak, juicy peach and white beans on peppery greens, with crusty bread.',10,20,
'1 pound sirloin steak, 3/4 inch thick|2 ripe but firm peaches, sliced|5 ounces arugula|1 can (15 ounces) cannellini beans, rinsed and drained|4 thick slices crusty bread|2 tablespoons balsamic vinegar|1 teaspoon Dijon mustard|1/4 cup crumbled feta|3 tablespoons olive oil, divided|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Pat steak dry and season with salt and pepper. Heat 1 tablespoon oil in a skillet over medium-high heat; sear steak 4–5 minutes per side to 145°F, then rest on a clean board at least 3 minutes.',
'Whisk vinegar, mustard and remaining oil in a serving bowl. Reserve half the dressing in a small bowl, then toss beans in the dressing left in the serving bowl.',
'Add arugula, peaches and the reserved dressing just before serving and toss gently. Slice steak thinly across the grain.',
'Divide salad among four plates, add steak and feta, and serve with bread. Keep warm meat on top so the leaves do not wilt in the bowl.'
],['salad','sausage'],'Dress beans first; add leaves only at service and rest steak before slicing.','Distinct from steak frites and steak bowls: fresh fruit-green salad, white beans and bread.','One skillet. Contains wheat, milk and mustard; use firm peaches.')
def emit():
 Path('src/capabilities/recipes/data/simpleDinnerMeat.ts').write_text("import type { EditorialRecipe } from './editorialRecipeCatalog';\n\n// Original formulations; source evidence and desk-review notes accompany every recipe.\nexport const SIMPLE_DINNER_MEAT: readonly EditorialRecipe[] = "+json.dumps(R,ensure_ascii=False,indent=2)+';\n')
 Path('docs/design-explorations/simple-dinner-expansion/meat-review.md').write_text('# Beef and pork dinner desk review\n\nAccessed 2026-10-16. No kitchen tests. Source signals describe consulted methods, not ratings or reviewer consensus. Sources were inspected through web search/full-page retrieval. FoodSafety.gov is the independent doneness reference, not a recipe taste endorsement. Sources are compared for mechanics; formulas and prose are original. Existing full editorial batches and meal-kit expansion were checked for overlap.\n\n'+ '\n\n'.join(f'## {i} — {t}\n\nCooking review: {truth}\n\nDuplication review: {dup}\n\nCompared source methods: {", ".join(keys)}; safe minimum temperatures.' for i,t,truth,dup,keys in reviews)+'\n')
emit()
add(401,'Beef creamy tomato gnocchi with spinach','Pillowy potato gnocchi in a quick beef-tomato sauce with spinach and a swirl of cream.',8,25,
'1 pound lean ground beef|1 package (17.6 ounces) shelf-stable potato gnocchi|1 can (14.5 ounces) crushed tomatoes|5 ounces baby spinach|1 small onion, finely diced|2 cloves garlic, minced|1/3 cup heavy cream|1/4 cup grated Parmesan|1 teaspoon dried basil|1 tablespoon olive oil|1 cup water|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oil in a deep lidded skillet. Brown beef and onion 7–8 minutes, breaking up the meat, until beef reaches 160°F. Stir in garlic and basil for 30 seconds.',
'Add tomatoes, measured water, salt and pepper. Bring to a simmer and cook uncovered for 5 minutes.',
'Stir in gnocchi, cover and simmer 4–6 minutes, stirring once, until tender through the center. Add spinach and cook uncovered 2 minutes until wilted.',
'Lower heat and stir in cream and Parmesan. Warm gently for 1 minute; if too thick, stir in a splash of water before serving.'
],['taco','stroganoff'],'Use shelf-stable potato gnocchi with a short package cooking time.','Unlike creamy tomato tortellini, this has beef as main protein and potato dumplings, without mushrooms or bread.','One deep skillet. Contains wheat and milk; check gnocchi for egg.')
add(402,'Beef cucumber dill pita pockets','Warm lemon-seasoned beef tucked into pitas with crisp cucumber and a cool dill yogurt sauce.',12,15,
'1 pound lean ground beef|4 large whole-wheat pitas|1 English cucumber, diced|2 tomatoes, diced|3 cups shredded romaine|3/4 cup plain Greek yogurt|2 tablespoons chopped fresh dill|1 lemon, juiced|2 cloves garlic, minced|1 teaspoon ground cumin|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oil in a skillet. Cook beef with cumin, garlic, salt and pepper for 7–8 minutes, breaking it into small clumps, until beef reaches 160°F. Stir in half the lemon juice and take off heat.',
'Mix yogurt, dill and remaining lemon juice in a bowl. Keep cucumber, tomatoes and romaine ready separately so the bread is filled just before eating.',
'Warm pitas in a toaster or dry skillet for 30 seconds per side, just until flexible. Cut a wide opening in each.',
'Spread yogurt sauce inside, then distribute beef and vegetables between pitas. Serve immediately, with any vegetables that do not fit alongside.'
],['salad','tomato'],'Cook loose beef rather than stuffing raw meat inside bread; fill only at service.','Replaces sesame beef rice to avoid existing green bean stir-fry; unlike arayes, bread is not stuffed and grilled with raw meat.','One skillet; pita can warm in the same pan after beef is removed. Contains wheat and milk.')
add(403,'Beef spinach potato curry skillet','Mildly spiced beef with soft potatoes and spinach in a creamy tomato sauce.',12,28,
'1 pound lean ground beef|1 1/2 pounds potatoes, cut into 1/2-inch cubes|5 ounces baby spinach|1 small onion, diced|1 can (14.5 ounces) diced tomatoes with juices|1 cup light coconut milk|2 teaspoons mild curry powder|1 tablespoon grated ginger|1 tablespoon olive oil|1/2 cup water|1/2 teaspoon salt',[
'Heat oil in a deep lidded skillet. Cook beef and onion for 7 minutes, breaking up the meat, until beef reaches 160°F.',
'Add curry powder and ginger; stir for 30 seconds. Add potatoes, measured water and salt. Cover and cook over medium-low heat for 10 minutes, stirring twice.',
'Add tomatoes and coconut milk; simmer covered 10–12 minutes until the potatoes are easily pierced, adding a little water if needed.',
'Fold spinach into the bubbling sauce for 2 minutes until wilted. Divide between four plates, including plenty of potato as the starch.'
],['tomato','potato'],'Steam small potato cubes before adding acidic tomatoes.','Everyday mild curry, not a claim to regional keema or massaman; unlike turkey keema, potatoes replace rice and no yogurt.','One deep skillet. Use mild curry powder; verify blend allergens. Coconut is not dairy.')
add(404,'Beef mushroom barley skillet','Beef and browned mushrooms with chewy quick-cooking barley, sweet carrots and a little Parmesan.',10,30,
'1 pound lean ground beef|1 cup quick-cooking barley (10–12 minute type)|8 ounces sliced mushrooms|1 cup bagged shredded carrots|1 small onion, diced|2 1/2 cups low-sodium beef broth|1 teaspoon dried thyme|1 tablespoon tomato paste|1/3 cup grated Parmesan|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oil in a deep skillet. Brown beef and onion over medium-high heat for 7 minutes until beef reaches 160°F; transfer to a plate.',
'Cook mushrooms in the same pan for 6 minutes until their water evaporates. Add carrots, thyme and tomato paste; stir 1 minute.',
'Return beef and add barley, broth, salt and pepper. Bring to a simmer, cover and cook 10–12 minutes or the package time, stirring once. Barley should be tender with a slight chew.',
'Uncover and simmer briefly if liquid pools. Stir in Parmesan off heat, rest 2 minutes and serve.'
],['stroganoff','tomato'],'Only quick-cooking barley meets this time; ordinary pearl barley is not an equivalent swap.','Distinct from beef stew: ground meat, mushroom-led grain skillet and no broth bowl or long braise.','One deep skillet with lid. Contains barley gluten and milk.')
add(405,'Beef roasted pepper butter bean skillet with toast','Creamy butter beans and sweet roasted peppers in a savory beef pan sauce, spooned onto thick toast.',10,20,
'1 pound lean ground beef|2 cans (15 ounces each) butter beans, rinsed and drained|1 cup jarred roasted red peppers, drained and sliced|5 ounces baby spinach|4 thick slices whole-grain bread|2 cloves garlic, minced|1 teaspoon smoked paprika|1/2 cup low-sodium beef broth|1 tablespoon red wine vinegar|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Heat oil in a wide skillet. Brown beef 7–8 minutes, breaking it apart, until it reaches 160°F. Add garlic and paprika for 30 seconds.',
'Fold in beans, peppers, broth and black pepper. Simmer gently for 6 minutes, stirring carefully so the beans keep their shape.',
'Add spinach in handfuls and stir 2 minutes until wilted; finish with vinegar. Mash a few beans against the pan if the sauce is thin.',
'Toast the bread in a toaster while the spinach wilts. Spoon the beef and beans over the toast and serve immediately.'
],['beans','sausage'],'Fold large butter beans gently; mashed beans provide body without cream.','Replaces beef broccoli potatoes due to existing BBQ potato dinner overlap; pepper-bean toast is a different meal form.','One skillet and toaster. Contains wheat; check broth.')
add(406,'Pork sausage cabbage potato skillet','Smoky sausage, tender cabbage and golden potatoes with a tangy mustard finish.',12,25,
'12 ounces fully cooked pork kielbasa, sliced|1 1/2 pounds thin-skinned potatoes, cut into 1/2-inch cubes|4 cups shredded green cabbage|1 small onion, thinly sliced|1 tablespoon Dijon mustard|1 tablespoon cider vinegar|1 teaspoon dried thyme|1 tablespoon olive oil|1/4 cup water|1/4 teaspoon black pepper',[
'Put potatoes in a saucepan, cover with water and bring to a boil; simmer 10 minutes until just tender and drain thoroughly.',
'Meanwhile heat oil in a deep skillet. Brown sausage 4 minutes, then add onion and cabbage. Pour in measured water, cover and cook 7 minutes until cabbage softens.',
'Uncover, fold in drained potatoes and thyme, and cook 5–6 minutes, turning gently, until some potato edges color and sausage is steaming hot, 165°F.',
'Stir mustard and vinegar together, fold through the skillet, season with pepper and divide among four plates.'
],['kielbasa','potato'],'Fully cooked sausage and parboiled small potatoes keep the skillet quick.','Different from kalua pork cabbage and choucroute: quick kielbasa skillet with potatoes, not slow-roasted meat or sauerkraut.','Saucepan plus deep skillet. Check sausage for allergens; mustard present.')
add(407,'Pork medallions with peas and mustard mash','Juicy pork medallions over creamy mustard potatoes, with peas in a light pan gravy.',12,25,
'1 1/4 pounds pork tenderloin, trimmed and cut into 1-inch medallions|1 1/2 pounds potatoes, peeled and cut into 3/4-inch cubes|2 cups frozen peas|1/2 cup milk|1 tablespoon butter|2 tablespoons Dijon mustard, divided|3/4 cup low-sodium chicken broth|1 teaspoon cornstarch|1 tablespoon olive oil|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Cover potatoes with water in a saucepan. Bring to a boil and simmer 12–15 minutes until soft; drain, then mash with milk, butter, half the mustard and half the salt. Cover to keep warm.',
'Meanwhile season pork with remaining salt and pepper. Heat oil in a skillet; cook medallions over medium-high heat 3 minutes per side, then lower heat until their centers reach 145°F. Rest on a clean plate at least 3 minutes.',
'Mix cornstarch with cold broth, pour into the skillet and scrape up the browned bits. Add peas and simmer 4 minutes until peas are hot and sauce lightly thickened.',
'Stir remaining mustard into the sauce. Divide mash among plates, add rested pork and spoon peas and gravy around it.'
],['pork','potato'],'Mash potatoes while pork rests; thermometer is essential for medallion thickness variation.','No apple-cider glaze or cabbage from existing Dijon pork; mustard mash and pea gravy form this complete plate.','Saucepan plus skillet. Contains milk and mustard; check broth.')
add(408,'Ham broccoli cheddar pasta','Broccoli and tender pasta in a smooth cheddar sauce, dotted with savory ham.',10,25,
'10 ounces fully cooked ham, diced|12 ounces dried short pasta|12 ounces small broccoli florets|1 1/2 cups milk|1 1/2 cups shredded cheddar|1 tablespoon butter|1 tablespoon all-purpose flour|1 teaspoon Dijon mustard|1/4 teaspoon garlic powder|1/4 teaspoon black pepper',[
'Bring a covered pot of water to a boil. Cook pasta according to the package, adding broccoli for the final 3 minutes. Reserve 1 cup cooking water and drain.',
'Melt butter in a deep skillet over medium heat. Stir in flour and garlic powder for 1 minute; gradually whisk in milk. Simmer gently 3 minutes until it coats a spoon.',
'Add ham and cook 3–4 minutes until heated to 165°F, stirring. Remove from heat and fold in cheddar, mustard and pepper until smooth.',
'Toss pasta and broccoli into the sauce, loosening with reserved water a splash at a time. Serve immediately; do not boil once the cheese is added.'
],['ham','stroganoff'],'Milk-flour sauce is cooked before cheddar goes in off heat.','Distinct from plain baked macaroni: stovetop ham and broccoli meal with no oven crust.','Pasta pot plus skillet. Contains wheat, milk and mustard.')
add(409,'Pork pineapple pepper rice skillet','Tender pork and sweet pineapple with bright peppers over a bed of fluffy ginger rice.',10,28,
'1 1/4 pounds pork tenderloin, trimmed and cut into 3/4-inch pieces|1 cup dry long-grain white rice|2 bell peppers, cut into 3/4-inch pieces|1 can (20 ounces) pineapple chunks in juice, drained with 1/2 cup juice reserved|2 tablespoons reduced-sodium soy sauce|1 tablespoon rice vinegar|1 tablespoon grated ginger|1 teaspoon cornstarch|1 tablespoon neutral oil|1 3/4 cups water',[
'Bring rice and measured water to a boil in a saucepan. Cover and simmer on low 17–20 minutes, then rest off heat 5 minutes.',
'Meanwhile heat oil in a wide skillet. Sear pork in one layer for 5–6 minutes, turning, until the thickest pieces reach 145°F. Transfer to a clean plate and rest at least 3 minutes.',
'Cook peppers in the skillet for 5 minutes. Add pineapple and ginger for 2 minutes. Mix reserved juice, soy sauce, vinegar and cornstarch; pour in and simmer 2 minutes until glossy.',
'Fold rested pork into the sauce for 1 minute. Fluff rice, divide among four plates and spoon pork, peppers and pineapple over it.'
],['pork','pineapple'],'Thicken pineapple juice separately; do not simmer pork through the whole rice cooking period.','Not fried rice or honey-garlic cabbage pork: fresh-cooked rice with chunky sweet-sour fruit sauce.','Saucepan plus skillet. Contains soy; standard soy sauce contains wheat.')
add(410,'Pork mushroom noodles with sour cream','Tender pork strips and browned mushrooms over egg noodles in a paprika-sour cream sauce.',10,25,
'1 1/4 pounds pork tenderloin, trimmed and cut into 1/2-inch strips|10 ounces dried egg noodles|12 ounces sliced mushrooms|2 cups frozen peas|1 cup low-sodium chicken broth|1/2 cup sour cream|1 teaspoon sweet paprika|1 teaspoon Dijon mustard|1 tablespoon all-purpose flour|2 tablespoons olive oil, divided|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Bring a covered pot of water to a boil. Cook noodles to package directions, adding peas for the last 3 minutes; reserve 1 cup water and drain.',
'Heat 1 tablespoon oil in a skillet. Season pork with salt and pepper, sear 4–6 minutes until pieces reach 145°F, and rest on a clean plate at least 3 minutes.',
'Add remaining oil and mushrooms to the skillet. Cook 6 minutes until golden. Stir in paprika and flour for 1 minute, then broth. Simmer 3 minutes to thicken.',
'Remove from heat and stir in sour cream and mustard. Fold in pork, noodles and peas, loosening with noodle water as needed. Warm only gently if required; do not boil.'
],['pork','stroganoff'],'Short searing and off-heat dairy protect both pork and sauce.','Pork strips and paprika gravy are distinct from the ground beef stroganoff entry; mild familiar flavor remains intentional.','Pasta pot plus skillet. Contains wheat, egg, milk and mustard.')
emit()
add(411,'Pork cutlets with lemon peas and couscous','Thin golden pork cutlets with buttery lemon peas and fluffy couscous.',10,25,
'4 boneless pork loin cutlets (5 ounces each), pounded to 1/4 inch|1 1/2 cups dry instant couscous|2 cups frozen peas|1 lemon, zested and juiced|2 tablespoons all-purpose flour|1 tablespoon butter|1/2 cup low-sodium chicken broth|1 teaspoon dried oregano|2 tablespoons olive oil|1 1/2 cups water|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Bring measured water to a boil in a saucepan. Stir in couscous and half the salt, cover and remove from heat for 5 minutes. Fluff and keep covered.',
'Season pork with remaining salt, pepper and oregano; dust lightly with flour. Heat oil in a large skillet and cook cutlets in two batches, about 2 minutes per side, until 145°F. Rest cooked pieces on a clean plate at least 3 minutes.',
'Add broth and peas to the skillet, scraping up the browned bits. Simmer 4 minutes until peas are hot, then stir in butter and lemon zest and juice.',
'Divide couscous among plates, lay a rested cutlet alongside and spoon lemon peas and sauce over both.'
],['pork','ham'],'Quarter-inch cutlets cook fast; include batch searing and a three-minute rest.','Unlike breaded tonkatsu or apple pork, light flour dusting and lemon pea sauce define the plate.','Saucepan plus large skillet. Contains wheat and milk; instant couscous required.')
add(412,'Sausage butter bean tomato stew','Creamy butter beans and sweet pork sausage in a chunky tomato broth, with bread for dipping.',10,25,
'12 ounces mild Italian pork sausage, casings removed|2 cans (15 ounces each) butter beans, rinsed and drained|1 can (28 ounces) diced tomatoes with juices|5 ounces baby spinach|1 small onion, diced|2 cloves garlic, minced|1 teaspoon dried oregano|1 cup low-sodium chicken broth|4 thick slices whole-grain bread|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Heat oil in a soup pot. Cook sausage and onion 8 minutes, breaking sausage into small pieces, until it reaches 160°F.',
'Add garlic and oregano for 30 seconds. Stir in tomatoes and broth; bring to a simmer and cook uncovered 8 minutes.',
'Add drained butter beans, fold gently and simmer 5 minutes until hot. Stir spinach in for 2 minutes until wilted, then season with pepper.',
'Serve in four shallow bowls with bread. Keep the beans mostly whole; mash a spoonful into the broth only if a thicker stew is wanted.'
],['beans','sausage'],'Cook sausage before wet ingredients; large beans need gentle handling.','Distinct from long-baked cassoulet: quick tomato-spinach stew without poultry, confit or breadcrumb lid.','One soup pot. Contains wheat; check sausage allergens.')
add(413,'Ham potato spinach frittata supper','A tender skillet frittata packed with potatoes, ham and spinach, with a quick tomato salad.',12,25,
'8 large eggs|8 ounces fully cooked ham, diced|1 pound thin-skinned potatoes, cut into 1/2-inch cubes|5 ounces baby spinach|1/3 cup milk|1/2 cup shredded cheddar|1 pint cherry tomatoes, halved|1 tablespoon cider vinegar|2 tablespoons olive oil, divided|1/4 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oven to 400°F. Put potatoes in a saucepan, cover with water, bring to a boil and simmer 8–10 minutes until tender. Drain well.',
'Heat 1 tablespoon oil in a 10-inch oven-safe nonstick skillet. Add potatoes and ham; cook 3 minutes, then fold in spinach until wilted, about 2 minutes.',
'Beat eggs with milk, cheddar, salt and pepper. Pour evenly into the skillet and cook on medium-low for 2 minutes. Bake 10–12 minutes until the center is just firm and reaches 165°F.',
'Toss tomatoes with vinegar and remaining oil while the frittata bakes. Rest frittata 3 minutes, cut into four wedges and serve with tomato salad.'
],['ham','potato'],'Small precooked potatoes allow eggs to set evenly without a long bake.','Unlike breakfast spinach ricotta frittata, potatoes and ham provide a complete supper with tomato salad.','Saucepan plus oven-safe skillet. Contains egg and milk. Potatoes simmer while oven heats.')
add(414,'Pork snap pea ginger noodles','Ginger-scented pork crumbles and crisp snap peas tangled through glossy sesame noodles.',10,20,
'1 pound ground pork|10 ounces dried spaghetti|12 ounces sugar snap peas, strings removed|1 cup bagged shredded carrots|1 tablespoon grated ginger|2 cloves garlic, minced|3 tablespoons reduced-sodium soy sauce|1 tablespoon rice vinegar|2 teaspoons honey|2 teaspoons toasted sesame oil|1 tablespoon neutral oil',[
'Bring a covered pot of water to a boil. Cook spaghetti according to the package, adding snap peas for the last 2 minutes. Reserve 1 cup cooking water and drain.',
'Meanwhile, heat neutral oil in a large skillet. Brown pork for 7–8 minutes, breaking it into small clumps, until it reaches 160°F.',
'Add carrots, garlic and ginger; cook 2 minutes. Stir in soy sauce, vinegar, honey and 1/4 cup noodle water; simmer 1 minute.',
'Fold noodles and snap peas through the pork. Turn off heat, add sesame oil and toss, loosening with more cooking water if necessary. Serve immediately.'
],['noodles','cabbage'],'Snap peas cook briefly at the end; ground pork must reach 160°F.','Distinct from yakisoba and honey-garlic pork cabbage: spaghetti, ground pork and snap peas with a light ginger sauce.','Pasta pot plus skillet. Contains wheat, soy and sesame.')
add(415,'Sausage pumpkin spinach pasta','Silky pumpkin sauce coats pasta, sweet sausage and spinach for a cozy orange-and-green supper.',8,25,
'12 ounces mild Italian pork sausage, casings removed|12 ounces dried short pasta|1 can (15 ounces) plain pumpkin purée|5 ounces baby spinach|1 cup low-sodium chicken broth|1/3 cup heavy cream|2 cloves garlic, minced|1/2 teaspoon dried sage|1/4 cup grated Parmesan|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Bring a covered pot of water to a boil. Cook pasta to package directions; reserve 1 cup cooking water and drain.',
'Heat oil in a deep skillet. Brown sausage 8 minutes, breaking it apart, until it reaches 160°F. Stir in garlic and sage for 30 seconds.',
'Add pumpkin, broth and pepper; stir until smooth. Simmer gently 5 minutes, then add spinach and cream for 2 minutes until the leaves wilt.',
'Toss in pasta and Parmesan. Add reserved water a little at a time until the sauce coats the pasta without clumping; serve hot.'
],['pumpkin','sausage'],'Use unsweetened pumpkin purée, not pie filling; thin the sauce before adding pasta.','Different from tomato sausage pasta and squash gnocchi: smooth pumpkin sauce and short pasta with pork sausage.','Pasta pot plus skillet. Contains wheat and milk.')
add(416,'Pork black bean taco skillet','Mild smoky pork and black beans tucked into warm tortillas with crisp lettuce and tomatoes.',10,20,
'1 pound ground pork|1 can (15 ounces) black beans, rinsed and drained|8 small corn tortillas|1 red bell pepper, diced|1/2 cup mild tomato salsa|1 teaspoon ground cumin|1 teaspoon smoked paprika|2 cups shredded romaine|2 tomatoes, diced|1 lime, cut into wedges|1 tablespoon neutral oil|1/4 cup water',[
'Heat oil in a large skillet. Brown pork with diced pepper for 8 minutes, breaking up the meat, until pork reaches 160°F.',
'Stir in cumin and paprika, then beans, salsa and measured water. Simmer uncovered 5–6 minutes until the mixture is thick but moist.',
'Warm tortillas in a second dry skillet for about 20 seconds per side; stack in a clean towel to keep flexible.',
'Divide pork filling, lettuce and tomatoes among the tortillas, two per person. Serve lime wedges alongside for squeezing.'
],['tacoskillet','quesadilla'],'Reduce filling before serving; warm corn tortillas to prevent splitting.','Unlike carnitas, al pastor and salsa verde pork bowls: ground pork, black beans and mild red salsa in quick tacos.','Two skillets; check corn tortillas and salsa for allergens.')
add(417,'Ham white bean vegetable soup','A gently smoky soup with soft beans, diced ham, carrots and spinach, finished with lemon.',10,25,
'12 ounces fully cooked ham, diced|2 cans (15 ounces each) cannellini beans, rinsed and drained|2 carrots, thinly sliced|2 celery stalks, thinly sliced|1 small onion, diced|5 ounces baby spinach|4 cups low-sodium chicken broth|1 teaspoon dried thyme|1 lemon, juiced|4 slices whole-grain bread|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Heat oil in a soup pot. Cook onion, carrots and celery over medium heat for 6 minutes, stirring occasionally.',
'Add ham, broth, beans, thyme and pepper. Bring to a boil, then simmer 12–15 minutes until carrots are tender and ham is heated through to 165°F.',
'Mash a few beans against the pot to give the broth body. Fold in spinach and simmer 2 minutes until wilted.',
'Finish with lemon juice and serve with bread. Taste before adding salt because ham and broth already season the soup.'
],['navy','beans'],'Canned beans replace the long dried-bean soak; finely sliced carrots set cooking time.','Distinct from minestrone and navy-bean long simmer: quick ham-led lemon soup with no pasta or tomato.','One soup pot. Contains wheat; check ham and broth labels.')
add(418,'Pork zucchini tomato skillet with polenta','Golden pork and tender zucchini in tomato sauce over soft Parmesan polenta.',10,25,
'1 1/4 pounds pork tenderloin, trimmed and cut into 3/4-inch medallions|1 cup instant polenta (5-minute type)|2 medium zucchini, cut into half-moons|1 can (14.5 ounces) diced tomatoes with juices|2 cloves garlic, minced|1 teaspoon dried oregano|1/3 cup grated Parmesan|1 tablespoon butter|2 tablespoons olive oil, divided|4 cups water|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Season pork with half the salt and pepper. Heat 1 tablespoon oil in a skillet; sear medallions 3–4 minutes per side to 145°F. Rest on a clean plate at least 3 minutes.',
'Add remaining oil and zucchini to the skillet. Cook 4 minutes, add garlic and oregano for 30 seconds, then tomatoes. Simmer 7 minutes until zucchini is tender.',
'Meanwhile bring measured water and remaining salt to a boil in a saucepan. Whisk in instant polenta and cook 5 minutes or its package time, stirring. Remove from heat and fold in butter and Parmesan.',
'Gently return pork and its juices to the tomato sauce for 1 minute. Divide polenta among four plates and top with pork and zucchini.'
],['pork','tomato'],'Use instant polenta; sear and rest pork separately from the tomato simmer.','Different from beef ragù polenta: tenderloin medallions, quick zucchini sauce and no braised meat.','Skillet plus saucepan. Contains milk. Follow packet liquid ratio if different; loosen with hot water.')
add(419,'Sausage cauliflower gnocchi traybake','Crisp-edged potato gnocchi, roasted cauliflower and pork sausage with burst tomatoes and Parmesan.',10,30,
'12 ounces fully cooked mild pork sausage, sliced|1 package (17.6 ounces) shelf-stable potato gnocchi|1 pound small cauliflower florets|1 pint cherry tomatoes|2 cloves garlic, finely grated|1 teaspoon dried oregano|1/3 cup grated Parmesan|1 tablespoon lemon juice|3 tablespoons olive oil|1/4 teaspoon salt|1/4 teaspoon black pepper',[
'Heat oven to 425°F. Toss cauliflower with 1 tablespoon oil and salt on one of two sheet pans. Roast 10 minutes while arranging the remaining ingredients.',
'Toss unboiled gnocchi, sausage and tomatoes with remaining oil, garlic, oregano and pepper on the second sheet pan, spreading into one layer.',
'Put the second pan in the oven and roast both for 18–22 minutes, switching rack positions and turning ingredients halfway, until cauliflower is tender, gnocchi edges crisp and sausage reaches 165°F.',
'Combine the roasted mixtures on a serving platter. Scatter Parmesan over them and finish with lemon juice; serve immediately.'
],['sausage','potato'],'Two pans prevent steaming; cauliflower starts ten minutes before gnocchi.','Cauliflower refers to the vegetable, not specialty cauliflower gnocchi; distinct from boiled sage gnocchi and sausage peppers.','Two sheet pans only. Contains wheat and milk; check sausage and gnocchi for egg.')
add(420,'Pork peach green bean couscous','Pork medallions with warm peach wedges, green beans and a light balsamic sauce over couscous.',10,25,
'1 1/4 pounds pork tenderloin, trimmed and cut into 3/4-inch medallions|1 1/2 cups dry instant couscous|12 ounces green beans, trimmed|2 firm peaches, sliced|1 tablespoon balsamic vinegar|1 teaspoon Dijon mustard|1/2 cup low-sodium chicken broth|2 tablespoons olive oil, divided|1 1/2 cups water|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Bring measured water and half the salt to a boil in a saucepan. Stir in couscous, cover, remove from heat and stand 5 minutes; fluff and keep covered.',
'Season pork with remaining salt and pepper. Heat 1 tablespoon oil in a deep skillet; cook medallions 3–4 minutes per side to 145°F. Rest on a clean plate at least 3 minutes.',
'Add remaining oil and green beans to the skillet, then broth. Cover and simmer 6 minutes. Add peaches and simmer uncovered 2 minutes until beans are tender and peaches just warm.',
'Stir in balsamic vinegar and mustard. Return pork briefly to coat in sauce, then serve with the couscous.'
],['pork','salad'],'Use firm peaches and add them late; green beans steam before the fruit.','Different from apple-cider pork and steak peach salad: warm bean-peach pan sauce, pork and couscous.','Saucepan plus deep skillet. Contains wheat and mustard.')
emit()
add(421,'Ham corn potato skillet','Golden potato cubes, sweet corn and ham with a soft cheddar finish and sliced scallions.',12,25,
'12 ounces fully cooked ham, diced|1 1/2 pounds thin-skinned potatoes, cut into 1/2-inch cubes|2 cups frozen corn|1 red bell pepper, diced|3 scallions, thinly sliced|3/4 cup shredded cheddar|1 teaspoon smoked paprika|1 tablespoon olive oil|1/4 cup water|1/4 teaspoon black pepper',[
'Put potatoes in a saucepan, cover with water and bring to a boil. Simmer 8–10 minutes until nearly tender, then drain thoroughly.',
'Heat oil in a wide skillet. Add drained potatoes and pepper and cook 6 minutes, turning occasionally, until the potato edges color.',
'Fold in ham, corn, paprika, measured water and black pepper. Cover and cook 5–6 minutes until potatoes are fully tender and ham reaches 165°F.',
'Take off heat, scatter cheddar and scallions over the top and cover 2 minutes until the cheese melts. Serve four equal portions.'
],['kielbasa','potato'],'Parboiled potatoes brown before wet corn and ham are added.','Different from corned beef hash and loaded potato soup: ham-corn-cheddar skillet without egg or broth.','Saucepan plus skillet. Contains milk; check ham.')
add(422,'Pork meatball cabbage noodle soup','Small tender pork meatballs and soft cabbage in ginger broth with fine rice noodles.',15,25,
'1 pound ground pork|8 ounces dried thin rice noodles|4 cups shredded green cabbage|1 cup bagged shredded carrots|1 tablespoon grated ginger, divided|2 cloves garlic, minced|2 tablespoons reduced-sodium soy sauce, divided|1/4 cup plain breadcrumbs|6 cups low-sodium chicken broth|1 tablespoon rice vinegar|2 teaspoons toasted sesame oil',[
'Mix pork gently with breadcrumbs, garlic, half the ginger and 1 tablespoon soy sauce. With damp hands, form 20 small meatballs, about 1 inch across.',
'Bring broth and remaining ginger and soy sauce to a simmer in a soup pot. Lower meatballs in one at a time; simmer gently for 8 minutes without vigorous stirring.',
'Add cabbage and carrots and simmer 5 minutes. Add rice noodles and cook for their package time, usually 3–5 minutes, until tender. Check several meatballs reach 160°F in the center.',
'Turn off heat and add vinegar and sesame oil. Divide noodles, vegetables and broth among serving bowls, adding five meatballs per serving.'
],['cabbage','noodles'],'Small uniform meatballs poach gently; confirm center temperatures before serving.','Not lion-head meatballs or Italian wedding soup: small pork meatballs, ginger cabbage and rice noodles.','One soup pot plus mixing bowl. Contains wheat, soy and sesame; check breadcrumbs for milk or egg.')
add(423,'Sausage lentil carrot soup','A thick, comforting soup of pork sausage, lentils and tender carrot, with spinach and lemon.',10,25,
'12 ounces mild Italian pork sausage, casings removed|2 cans (15 ounces each) brown lentils, rinsed and drained|3 carrots, thinly sliced|1 small onion, diced|5 ounces baby spinach|4 cups low-sodium chicken broth|1 teaspoon dried thyme|1 tablespoon tomato paste|1 lemon, juiced|4 slices whole-grain bread|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Heat oil in a soup pot. Cook sausage and onion 8 minutes, breaking up sausage, until it reaches 160°F.',
'Add carrots, thyme and tomato paste; stir 1 minute. Pour in broth, bring to a simmer and cook 10–12 minutes until the carrot slices are tender.',
'Fold in drained lentils and spinach. Simmer 3 minutes until the lentils are hot and the spinach has wilted.',
'Stir in lemon juice and pepper. Ladle into four bowls and serve with bread; add a splash of water if the lentils thicken the soup too much.'
],['lentil','beans'],'Canned lentils remove the long dry-lentil simmer; carrots still need full tenderness.','Distinct from ham bean soup: lentils, fresh sausage, tomato paste and thyme create a different body and base.','One soup pot. Contains wheat; check sausage ingredients. Canned lentils required for timing.')
add(424,'Pork lemon broccoli rice skillet','Tender pork and broccoli over lemony rice, finished with a little Parmesan.',10,30,
'1 1/4 pounds pork tenderloin, trimmed and cut into 3/4-inch medallions|1 cup dry long-grain white rice|12 ounces small broccoli florets|2 cloves garlic, minced|2 cups low-sodium chicken broth|1 lemon, zested and juiced|1/3 cup grated Parmesan|1 teaspoon dried thyme|2 tablespoons olive oil, divided|1/2 teaspoon salt|1/4 teaspoon black pepper',[
'Heat 1 tablespoon oil in a saucepan. Stir in garlic and rice for 30 seconds, then add broth and thyme. Bring to a boil, cover and simmer on low for 17 minutes.',
'Meanwhile season pork with salt and pepper. Heat remaining oil in a skillet and cook medallions 3–4 minutes per side to 145°F. Rest on a clean plate at least 3 minutes.',
'Scatter broccoli over the rice, cover and cook 5–6 minutes until rice and broccoli are tender. Add a splash of water if the pan becomes dry before the rice is done.',
'Fold lemon zest, juice and Parmesan into the rice. Divide among four plates, add the rested pork and spoon any pork juices over the top.'
],['pork','noodles'],'Rice cooks separately so pork cannot dry out during absorption; broccoli steams above rice.','Distinct from honey-garlic pork rice and creamy pork noodles: lemon-thyme, broccoli and a dry rice base.','Saucepan plus skillet. Contains milk; use white rice.')
add(425,'Ham asparagus pea risotto-style orzo','Tender orzo with ham, peas and asparagus in a creamy Parmesan finish.',10,25,
'10 ounces fully cooked ham, diced|12 ounces dried orzo|1 pound asparagus, woody ends removed and cut into 1-inch pieces|1 cup frozen peas|1 small onion, finely diced|3 1/2 cups low-sodium chicken broth|1/2 cup grated Parmesan|1 lemon, zested and juiced|1 tablespoon butter|1 tablespoon olive oil|1/4 teaspoon black pepper',[
'Warm oil and butter in a deep skillet. Cook onion 4 minutes over medium heat until softened; add orzo and stir 1 minute.',
'Add broth, bring to a simmer and cook 6 minutes over medium-low heat, stirring every minute so the orzo does not stick.',
'Fold in ham, asparagus and peas. Simmer 6–8 minutes, stirring often, until orzo and asparagus are tender and ham reaches 165°F. Add hot water a little at a time if the pan becomes dry.',
'Remove from heat. Stir in Parmesan, lemon zest and juice, and pepper. Rest 2 minutes, then serve while the sauce is still loose and creamy.'
],['ham','taco'],'Add asparagus halfway through orzo cooking; stir frequently and finish cheese off heat.','Risotto-style names the stirred texture; uses pasta, not the rice of existing mushroom risotto, with ham and spring vegetables.','One deep skillet. Contains wheat and milk; asparagus pieces should be evenly sized.')
# Timing corrections from independent desk review. These are estimates, not cooking trials.
for r in R:
 if r['rosterId']=='DI419': r['cookMinutes']=35
 if r['rosterId']=='DI413': r['cookMinutes']=40
 if r['rosterId'] in ('DI412','DI423'): r['cookMinutes']=30
emit()
# Final proportional wording keeps instruction amounts consistent when yield is scaled.
source('sloppy','Associated Press / Robin Arzon','Lentil Sloppy Joes','https://apnews.com/article/84e25bf6f3c71a02622818e547ad70e3','Cooked lentils take a short tomato-sauce simmer.')
for r in R:
 n=int(r['rosterId'][2:])
 if n==386:r['research']['sources'][0]=S['sloppy']
 if n==396:r['cookMinutes']=40
 if n==398:r['prepMinutes']=10;r['cookMinutes']=30
 if n==403:r['prepMinutes']=10;r['cookMinutes']=35
 if n==421:r['prepMinutes']=10;r['cookMinutes']=30
 if n==399:
  r['instructions'][0]=r['instructions'][0].replace('Chop 1 cup of the scooped flesh.','Chop roughly one quarter of the scooped flesh; save the rest for another meal.')
 if n==409:
  r['ingredients'][3]='1 can (20 ounces) pineapple chunks in juice, drained'
  r['ingredients'].insert(4,'1/2 cup unsweetened pineapple juice (use drained can juice)')
  r['instructions'][2]=r['instructions'][2].replace('reserved juice','measured pineapple juice')
 if n in (385,389,395,396,398,410,413,418,420,424):
  r['instructions']=[s.replace('1 tablespoon neutral oil','half the neutral oil').replace('1 tablespoon oil','half the oil') for s in r['instructions']]
 if n in (400,419):r['instructions']=[s.replace('1 tablespoon oil','one third of the oil') for s in r['instructions']]
 if n==386:r['instructions']=[s.replace('1 tablespoon vinegar','half the vinegar') for s in r['instructions']]
 if n==398:
  r['instructions']=[s.replace('1/2 cup water','one quarter of the measured water').replace('remaining 1 1/2 cups water','remaining measured water') for s in r['instructions']]
 if n==422:
  r['instructions']=[s.replace('1 tablespoon soy sauce','half the soy sauce').replace('form 20 small meatballs','form small meatballs (five per serving)') for s in r['instructions']]
 if n in (389,414):r['instructions']=[s.replace('1/4 cup noodle water','a splash of noodle water') for s in r['instructions']]
emit()
# Three culinary comparisons per recipe, with safety retained as a fourth reference.
source('rtestrog','RecipeTin Eats','Beef Stroganoff','https://www.recipetineats.com/beef-stroganoff/','Quick searing differs from a long braise; mustard balances sour cream gravy.')
source('rterice','RecipeTin Eats','Beef and Rice with Veggies','https://www.recipetineats.com/ground-beef-and-rice-recipe/','Rice grade and covered absorption matter; brown rice is not a quick swap.')
source('rtepasta','RecipeTin Eats','One pot creamy tomato beef pasta','https://www.recipetineats.com/one-pot-creamy-tomato-beef-pasta/','One-pot pasta needs ample liquid and becomes thicker after leaving heat.')
source('rtecauli','RecipeTin Eats','Cauliflower Cheese','https://www.recipetineats.com/cauliflower-cheese/','Roasting cauliflower limits water leaking into a cheese sauce.')
source('rtefrittata','RecipeTin Eats','Frittata','https://www.recipetineats.com/frittata-recipe/','Set edges on the stove before finishing eggs in the oven.')
source('rteorzo','RecipeTin Eats','Quick Chicken and Vegetable Risoni','https://www.recipetineats.com/one-pot-chicken-vegetable-parmesan-orzo-risoni/','Small pasta needs frequent stirring and a loose finish before serving.')
source('curry','RecipeTin Eats','Qeema - Easy Indian Curried Beef Mince','https://www.recipetineats.com/qeema-indian-curried-beef/','Aromatics and briefly toasted spices season fast-cooking ground beef.')
source('cornbread','Budget Bytes','Chili Cornbread Skillet','https://www.budgetbytes.com/chili-cornbread-skillet/','Hot filling supports a cornmeal batter lid in a deep oven-safe pan.')
source('butterbeans','Good Food','Sausage and butter bean casserole','https://www.bbcgoodfood.com/recipes/sausage-butter-bean-casserole','Brown sausage first; an oven breadcrumb finish adds time.')
source('couscous','Good Food','Roast pork with couscous and ginger yogurt','https://www.bbcgoodfood.com/recipes/roast-pork-couscous-ginger-yogurt','Couscous hydrates off heat while meat cooks separately.')
source('porknoodle','Good Food','Pork noodle stir-fry','https://www.bbcgoodfood.com/recipes/pork-noodle-stir-fry','Brown pork mince before briefly cooking vegetables and coating noodles.')
source('traygnocchi','Good Food','Chorizo and purple sprouting broccoli gnocchi traybake','https://www.bbcgoodfood.com/premium/chorizo-purple-sprouting-broccoli-gnocchi-traybake','Vegetables roast before gnocchi; the source finishes moist and creamy.')
source('pumpkin2','Good Food','Creamy pumpkin pasta','https://www.bbcgoodfood.com/recipes/creamy-pumpkin-pasta','Fresh pumpkin is boiled and blended; canned purée removes those tasks.')
source('barley','Good Food','Smoked haddock, leek and barley risotto','https://www.bbcgoodfood.com/recipes/smoked-haddock-leek-barley-risotto','Barley simmers in stock with periodic stirring; grain type determines time.')
source('mash','RecipeTin Eats','Creamy Buttery Mashed Potato','https://www.recipetineats.com/mashed-potato/','Drain cooked potatoes well and mash gently with milk and butter.')
source('meatballsoup','Good Food','Spring meatball soup','https://www.bbcgoodfood.com/recipes/spring-meatball-soup','Add quick pasta and delicate greens near the end of a meatball soup.')
source('naan','Budget Bytes','Easy Caprese Pizza','https://www.budgetbytes.com/easy-caprese-pizza/','Cooked naan makes a quick baked base; cheese needs only a short bake.')
source('melt','Budget Bytes','Vegetarian French Dip Sandwiches','https://www.budgetbytes.com/vegetarian-french-dip-sandwiches/','Evaporate mushroom moisture before broth; broil cheese on bread separately.')
source('polenta','Budget Bytes','Creamy Polenta','https://www.budgetbytes.com/creamy-polenta/','Whisk cornmeal into boiling liquid; add butter and cheese after cooking.')
source('tacosoup','Budget Bytes','Easy Taco Soup','https://www.budgetbytes.com/taco-soup/','Drain canned beans and brown meat before a short broth simmer.')
source('steaksalad','Associated Press / Milk Street','Straccetti di Manzo','https://apnews.com/article/22b48d1e59de01f2d549cf0a622fe409','Balsamic acidity balances warm steak served over arugula.')
third={381:('rtestrog','Ground beef is economical; separately boiled noodles give more control than the one-pot reference, and sour cream is added off heat.'),382:('rterice','Keep the absorption method, use white rice, and finish with peas, cheddar and pickles rather than a burger bun.'),383:('rterice','Use medium bulgur rather than rice; cabbage and paprika supply the vegetable and seasoning base.'),384:('rterice','Delay zucchini until rice is partly cooked so vegetables do not become watery.'),385:('naan','Pre-cooked naan removes dough work; steak is placed on after the cheese bake to protect its doneness.'),386:('cabbage','Use canned lentils to extend beef, and keep raw slaw separate rather than cooking cabbage into the filling.'),387:('potato','Small sweet-potato cubes steam directly in the skillet; no oven-roasted halves or cheese lid.'),388:('rtepasta','Boil shells separately and dollop ricotta rather than simmering all ingredients in one pot.'),389:('porknoodle','Use whole seared steak sliced after resting, spaghetti and briefly boiled broccoli; no sweet-chili sauce.'),390:('kielbasa','Adapt the potato-cabbage skillet mechanics to ground beef and green beans, with mustard rather than smoky sausage.'),391:('melt','Use softened onions rather than falsely claiming quick caramelization; reduce broth so sandwich bread stays intact.'),392:('tacosoup','Keep a looser broth and mild separate spices, finishing with lime and yogurt instead of seasoning packets.'),393:('rtecauli','Add browned beef to a smaller roast-first cauliflower gratin and include bread; no potato mash topping.'),394:('porknoodle','Turn mince-and-noodle mechanics into a ginger broth; no frying of softened noodles or thick glaze.'),395:('tacoskillet','Use separately cooked steak and bake folded tortillas together; corn and pepper filling replaces beans.'),396:('cornbread','Use a modest fresh batter over a beef-pinto filling, with cheddar inside the batter and no spicy chili blend.'),397:('rteorzo','Use ground beef, zucchini, lemon and feta; maintain a loose stirred orzo finish without a milk sauce.'),398:('couscous','Serve a moist eggplant-beef sauce over independently hydrated couscous; no roast or ginger yogurt.'),399:('rterice','Use ready-cooked rice in a hot beef-mushroom filling and pre-roast shells, avoiding raw-grain cooking inside zucchini.'),400:('steaksalad','Rest a whole steak before slicing; peaches and beans replace tomatoes and the dressing stays un-reduced.'),401:('rtepasta','Use quick shelf-stable potato gnocchi, requiring much less liquid than dry pasta, and add spinach late.'),402:('couscous','Combine cooked loose beef, raw crunch and dill yogurt in warmed pita, without stuffing raw meat into bread.'),403:('curry','Use a deliberately mild supermarket curry blend with potatoes, tomato and coconut; do not label this as regional qeema.'),404:('barley','Specify quick-cooking barley so a grain skillet works within forty minutes; do not silently substitute ordinary pearl barley.'),405:('tomato','Use roasted peppers and butter beans in a ground-beef pan sauce, with toast replacing rice.'),406:('butterbeans','Use fully cooked kielbasa and parboiled potatoes, omitting the bean casserole oven finish.'),407:('mash','Make mustard mash concurrently with seared medallions, then use pea pan gravy instead of cream-mushroom sauce.'),408:('rtecauli','Apply a milk-flour cheese sauce to ham and broccoli pasta; take off heat before adding cheddar.'),409:('porknoodle','Use tenderloin chunks, separate fresh rice and pineapple-juice glaze rather than mince and noodles.'),410:('rtestrog','Use tenderloin strips with paprika and separately boiled noodles; finish sour cream off heat to avoid splitting.'),411:('couscous','Use thin flour-dusted cutlets, lemon peas and instant couscous instead of a whole roast and sweetened couscous.'),412:('butterbeans','Remove the oven and crumb topping; mild crumbled sausage, canned beans and spinach form a short stovetop stew.'),413:('rtefrittata','Parboiled potatoes and ham make the egg dish dinner-sized; tomato salad supplies freshness.'),414:('porknoodle','Use snap peas and spaghetti, omitting chili sauce and thickener for a lighter ginger dressing.'),415:('pumpkin2','Canned unsweetened pumpkin removes peeling, boiling and blending; browned pork sausage and spinach complete dinner.'),416:('taco','Keep mild beans and pork in a reduced filling and serve in separately warmed corn tortillas, not pasta.'),417:('butterbeans','Canned beans and diced cooked ham replace dried beans and a long ham-hock simmer; lemon and spinach finish the soup.'),418:('polenta','Use explicitly instant polenta and finish butter and Parmesan off heat while pork rests.'),419:('traygnocchi','Use two pans and a dry roast for crisp gnocchi; start cauliflower early, omitting the creamy source sauce.'),420:('couscous','Use seared medallions and warm firm peaches with steamed beans rather than whole roast and dried fruit.'),421:('ham','Fully cooked diced ham is warmed late, after potatoes brown; corn and cheddar bind a dry skillet dinner.'),422:('meatballsoup','Use fresh small pork meatballs with sufficient poaching before adding quick rice noodles; no leftover meatball assumption.'),423:('butterbeans','Use canned brown lentils and thin carrots for a short simmer, omitting an oven finish or dry-lentil cooking.'),424:('rterice','Cook white rice separately from pork so the meat can rest; steam broccoli above rice at the end.'),425:('rteorzo','Stir orzo in stock, adding asparagus and ham partway through; Parmesan finishes the sauce without cream.')}
for r in R:
 key,decision=third[int(r['rosterId'][2:])]
 r['research']['sources'].insert(2,S[key])
 r['research']['adaptationDecision']+=' Comparison decision: '+decision
 r['instructions']=[s.replace('four plates','individual plates').replace('four bowls','individual bowls').replace('four portions','portions').replace('four equal portions','equal portions').replace('four generous scoops','generous scoops').replace('four bases','bun bases') for s in r['instructions']]
emit()
with Path('docs/design-explorations/simple-dinner-expansion/meat-review.md').open('a') as f:
 f.write('\n## Third culinary comparison decisions\n\n')
 for r in R:
  k,d=third[int(r['rosterId'][2:])];f.write(f'- {r["rosterId"]}: [{S[k]["title"]}]({S[k]["url"]}). {d}\n')
 f.write('\n## Consulted source index\n\n')
 for k,s in S.items():f.write(f'- `{k}`: [{s["publisher"]}: {s["title"]}]({s["url"]}) — {s["signal"]}\n')
 f.write('\nAccess limitations: an initial University of Kentucky sloppy-Joe PDF could not be opened beyond its search excerpt, so it was replaced with the actually retrieved AP cookbook excerpt. A Good Food herby-stroganoff URL failed; RecipeTin Eats stroganoff was retrieved instead. No inaccessible source was used to claim a tested result. Every recipe now compares three culinary references plus the independent temperature chart.\n')
