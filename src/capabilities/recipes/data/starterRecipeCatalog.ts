import type { RecipeProjection } from './recipeCache';

export type StarterRecipeMetadata = {
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Soup' | 'Vegetarian' | 'Dessert';
  cuisine: string;
  artworkIndex: number;
  featured?: boolean;
};

export type RecipeInventoryFilters = {
  source: 'all' | 'yours';
  maxMinutes: number | null;
  category: StarterRecipeMetadata['category'] | null;
  cuisine: string | null;
};

export type RecipeInventorySortMode = 'featured' | 'quickest' | 'title';

export const DEFAULT_RECIPE_INVENTORY_FILTERS: RecipeInventoryFilters = {
  source: 'all',
  maxMinutes: null,
  category: null,
  cuisine: null,
};

type RecipeVariant = { title: string; special: string; description: string };
type RecipeGroup = StarterRecipeMetadata & {
  prepMinutes: number;
  cookMinutes: number;
  ingredients: readonly string[];
  instructions: readonly string[];
  variants: readonly RecipeVariant[];
};

const GROUPS: readonly RecipeGroup[] = [
  {
    category: 'Breakfast', cuisine: 'American', artworkIndex: 0, featured: true, prepMinutes: 10, cookMinutes: 15,
    ingredients: ['2 cups all-purpose flour', '2 tablespoons sugar', '2 teaspoons baking powder', '2 eggs', '1 3/4 cups milk', '3 tablespoons melted butter'],
    instructions: ['Whisk the dry ingredients in a wide bowl.', 'Whisk eggs, milk, and butter separately, then fold into the flour just until combined.', 'Cook scoops on a lightly buttered skillet until bubbles form; flip and cook until golden.', 'Serve warm with the finishing ingredient and maple syrup.'],
    variants: [
      { title: 'Buttermilk Berry Pancakes', special: '1 cup mixed berries', description: 'Fluffy golden pancakes with bright berries and crisp buttery edges.' },
      { title: 'Banana Walnut Pancakes', special: '1 ripe banana and 1/2 cup toasted walnuts', description: 'Tender banana pancakes with a warm, nutty crunch.' },
      { title: 'Lemon Ricotta Pancakes', special: '3/4 cup ricotta and zest of 1 lemon', description: 'Cloud-soft pancakes with ricotta and a fresh lemon finish.' },
      { title: 'Apple Cinnamon Pancakes', special: '1 diced apple and 1 teaspoon cinnamon', description: 'Cozy skillet pancakes folded with sweet apple and cinnamon.' },
      { title: 'Chocolate Chip Sunday Pancakes', special: '3/4 cup semisweet chocolate chips', description: 'A celebratory stack with melted chocolate in every bite.' },
    ],
  },
  {
    category: 'Breakfast', cuisine: 'American', artworkIndex: 12, prepMinutes: 12, cookMinutes: 18,
    ingredients: ['8 large eggs', '1/3 cup whole milk', '1 tablespoon olive oil', '1 small onion, diced', '2 cups baby spinach', '1 cup shredded cheddar'],
    instructions: ['Heat the oven to 400°F and whisk eggs with milk, salt, and pepper.', 'Soften the onion in an oven-safe skillet, then wilt in the spinach.', 'Pour in the eggs, scatter over the finishing ingredient and cheese, and cook until the edges set.', 'Bake until just puffed in the center; rest five minutes before slicing.'],
    variants: [
      { title: 'Spinach Cheddar Breakfast Bake', special: '2 cups cubed sourdough', description: 'A golden, make-ahead egg bake with spinach, cheddar, and crisp sourdough.' },
      { title: 'Denver Skillet Frittata', special: '1 cup diced ham and bell pepper', description: 'A diner-inspired frittata loaded with ham, peppers, and melty cheese.' },
      { title: 'Roasted Tomato Goat Cheese Eggs', special: '1 cup roasted cherry tomatoes and 4 ounces goat cheese', description: 'Creamy baked eggs balanced by jammy tomatoes and tangy goat cheese.' },
      { title: 'Crispy Potato Egg Hash', special: '2 cups diced cooked potatoes', description: 'Crisp potatoes, soft eggs, and cheddar for a hearty one-pan breakfast.' },
      { title: 'Freezer-Friendly Breakfast Burritos', special: '8 flour tortillas and 1 cup black beans', description: 'Savory egg and bean burritos that reheat beautifully on busy mornings.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'American', artworkIndex: 1, featured: true, prepMinutes: 20, cookMinutes: 55,
    ingredients: ['1 whole chicken or 2 pounds bone-in chicken pieces', '1 1/2 pounds baby potatoes', '4 carrots, cut into chunks', '2 tablespoons olive oil', '4 garlic cloves, smashed', '1 teaspoon kosher salt'],
    instructions: ['Heat the oven to 425°F and pat the chicken dry.', 'Toss the vegetables with oil, garlic, salt, and the finishing ingredient in a roasting pan.', 'Nestle in the chicken and roast until deeply browned and cooked through.', 'Rest the chicken ten minutes, then spoon the pan juices over everything.'],
    variants: [
      { title: 'Sunday Herb Roast Chicken', special: 'rosemary, thyme, and 1 halved lemon', description: 'Bronzed roast chicken with lemony herbs, crisp potatoes, and sweet carrots.' },
      { title: 'Honey Mustard Sheet-Pan Chicken', special: '3 tablespoons Dijon mustard and 2 tablespoons honey', description: 'Tangy-sweet chicken and vegetables lacquered in honey mustard.' },
      { title: 'Garlic Parmesan Chicken & Potatoes', special: '1/2 cup grated Parmesan and chopped parsley', description: 'Crisp-edged chicken and potatoes showered with Parmesan and garlic.' },
      { title: 'Smoky BBQ Chicken Traybake', special: '1/2 cup smoky barbecue sauce and sliced red onion', description: 'Sticky barbecue chicken with caramelized vegetables in one easy pan.' },
      { title: 'Maple Sage Chicken Supper', special: '2 tablespoons maple syrup and fresh sage', description: 'A cozy roast with maple, sage, and deeply browned pan vegetables.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Mexican', artworkIndex: 2, featured: true, prepMinutes: 20, cookMinutes: 20,
    ingredients: ['1 1/2 pounds boneless chicken thighs', '12 small corn tortillas', '1 teaspoon ground cumin', '1 teaspoon smoked paprika', '2 limes', '1 cup shredded cabbage'],
    instructions: ['Season the chicken with cumin, paprika, salt, and half the lime juice.', 'Sear in a hot skillet until browned and cooked through, then rest and slice.', 'Warm the tortillas directly in the skillet until pliable and lightly charred.', 'Fill with chicken, cabbage, the finishing ingredient, and remaining lime.'],
    variants: [
      { title: 'Charred Lime Chicken Tacos', special: 'avocado, pico de gallo, and cilantro', description: 'Juicy skillet chicken tucked into warm tortillas with avocado and bright lime.' },
      { title: 'Pineapple Chipotle Chicken Tacos', special: '1 cup diced pineapple and 1 minced chipotle', description: 'Smoky, sweet tacos with caramelized pineapple and a gentle chile kick.' },
      { title: 'Creamy Poblano Chicken Tacos', special: '2 roasted poblanos and 1/2 cup crema', description: 'Roasted poblano strips and cool crema make these tacos rich but fresh.' },
      { title: 'Street Corn Chicken Tacos', special: '1 cup charred corn, cotija, and crema', description: 'All the tangy, creamy crunch of elote piled onto savory chicken tacos.' },
      { title: 'Salsa Verde Chicken Tacos', special: '1 cup salsa verde and sliced radishes', description: 'Zippy salsa verde chicken with crisp radish and plenty of cilantro.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Mexican', artworkIndex: 13, prepMinutes: 20, cookMinutes: 30,
    ingredients: ['2 cups cooked rice', '1 can black beans, rinsed', '1 cup corn', '1 teaspoon cumin', '1 cup red enchilada sauce', '1 1/2 cups shredded Monterey Jack'],
    instructions: ['Heat the oven to 400°F and season the beans, corn, and rice with cumin and salt.', 'Layer or roll the base with enchilada sauce and the finishing ingredient.', 'Top with cheese and bake until bubbling and browned at the edges.', 'Rest briefly, then finish with lime, cilantro, or avocado.'],
    variants: [
      { title: 'Weeknight Chicken Enchiladas', special: '2 cups shredded rotisserie chicken and 8 tortillas', description: 'Saucy, cheesy enchiladas built for an easy family weeknight.' },
      { title: 'Roasted Sweet Potato Burrito Bowls', special: '2 roasted sweet potatoes and avocado', description: 'Colorful bowls with smoky sweet potatoes, black beans, and creamy avocado.' },
      { title: 'Beef & Bean Taco Rice', special: '1 pound seasoned ground beef', description: 'A one-pan taco-night favorite with rice, beans, beef, and bubbling cheese.' },
      { title: 'Green Chile Chicken Casserole', special: '2 cups chicken and 1 can diced green chiles', description: 'A cozy layered casserole with green chile warmth and crisp cheesy edges.' },
      { title: 'Black Bean Chilaquiles', special: '8 cups sturdy tortilla chips and 4 fried eggs', description: 'Saucy-crisp tortilla chips, black beans, and eggs for breakfast or dinner.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'French', artworkIndex: 3, prepMinutes: 20, cookMinutes: 25,
    ingredients: ['4 salmon fillets or chicken cutlets', '1 pound green beans', '1 pound baby potatoes', '2 tablespoons Dijon mustard', '2 tablespoons butter', '1 lemon'],
    instructions: ['Boil the potatoes in salted water until tender and blanch the beans in the final minutes.', 'Season and sear the protein until golden and nearly cooked through.', 'Add butter, Dijon, lemon, and the finishing ingredient to make a glossy pan sauce.', 'Return everything to the pan and spoon over the sauce before serving.'],
    variants: [
      { title: 'Herb Butter Salmon Provençal', special: 'tomatoes, parsley, and herbes de Provence', description: 'Silky salmon with tomatoes, herbs, lemon, and buttery pan juices.' },
      { title: 'Creamy Dijon Chicken', special: '1/2 cup cream and fresh tarragon', description: 'Golden chicken in a velvety Dijon-tarragon sauce worthy of crusty bread.' },
      { title: 'Weeknight Chicken Ratatouille', special: 'zucchini, eggplant, and crushed tomatoes', description: 'Tender chicken nestled into a rustic summer vegetable stew.' },
      { title: 'Lemon Garlic Sole Meunière', special: '4 sole fillets and chopped parsley', description: 'Delicate fish with nutty browned butter, lemon, and parsley.' },
      { title: 'Rustic Sausage Cassoulet', special: '1 pound chicken sausage and 2 cans white beans', description: 'A streamlined, deeply savory white bean cassoulet for cool evenings.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Japanese', artworkIndex: 4, featured: true, prepMinutes: 15, cookMinutes: 20,
    ingredients: ['1 1/2 pounds salmon, chicken, or tofu', '3 cups cooked short-grain rice', '1/3 cup soy sauce', '2 tablespoons mirin', '1 tablespoon brown sugar', '1 teaspoon grated ginger'],
    instructions: ['Whisk soy, mirin, sugar, ginger, and the finishing ingredient.', 'Sear the protein until browned, then pour in the sauce and simmer until glossy.', 'Spoon rice into bowls and arrange the protein with crisp vegetables.', 'Drizzle with extra sauce and finish with sesame seeds or scallions.'],
    variants: [
      { title: 'Teriyaki Salmon Rice Bowls', special: 'cucumber, carrots, and sesame seeds', description: 'Glossy salmon over warm rice with cool, crunchy vegetables.' },
      { title: 'Chicken Katsu Curry Bowls', special: 'crispy chicken cutlets and Japanese curry sauce', description: 'Crisp chicken, mellow curry, and rice in a deeply comforting bowl.' },
      { title: 'Miso Ginger Tofu Bowls', special: '2 tablespoons white miso and roasted broccoli', description: 'Caramelized tofu with savory miso, ginger, and roasted broccoli.' },
      { title: 'Beef Sukiyaki-Style Rice Bowls', special: '1 pound thin-sliced beef, mushrooms, and onion', description: 'Tender beef and mushrooms simmered in a sweet-savory sauce.' },
      { title: 'Sesame Soba Noodle Bowls', special: '12 ounces soba, edamame, and sesame dressing', description: 'Nutty noodles with edamame and crunchy vegetables, good warm or chilled.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Italian', artworkIndex: 5, prepMinutes: 15, cookMinutes: 25,
    ingredients: ['12 ounces pasta', '2 tablespoons olive oil', '4 garlic cloves, sliced', '1 can crushed tomatoes', '1/2 cup grated Parmesan', '1 handful fresh basil'],
    instructions: ['Boil the pasta in well-salted water until just shy of al dente; reserve a cup of cooking water.', 'Sizzle garlic in olive oil, then add tomatoes and the finishing ingredient.', 'Toss in pasta with splashes of cooking water until the sauce clings.', 'Finish with Parmesan, basil, black pepper, and a little olive oil.'],
    variants: [
      { title: 'Tomato Basil Weeknight Pasta', special: '1 pint burst cherry tomatoes', description: 'Silky tomato pasta brightened with basil and a generous Parmesan finish.' },
      { title: 'Creamy Tuscan Chicken Pasta', special: '1 pound chicken, spinach, and 1/2 cup cream', description: 'Tender chicken and spinach folded through a creamy tomato sauce.' },
      { title: 'Sausage & Fennel Rigatoni', special: '1 pound Italian sausage and 1 sliced fennel bulb', description: 'Savory sausage and sweet fennel tucked into ridged rigatoni.' },
      { title: 'Lemony Pea Parmesan Pasta', special: '2 cups peas and zest of 1 lemon', description: 'Fresh, fast pasta with sweet peas, lemon, and lots of Parmesan.' },
      { title: 'Roasted Mushroom Garlic Pasta', special: '1 pound roasted mushrooms and thyme', description: 'Deeply browned mushrooms make this simple garlic pasta taste luxurious.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Italian', artworkIndex: 14, prepMinutes: 25, cookMinutes: 35,
    ingredients: ['1 pound pizza dough or 12 lasagna noodles', '2 cups marinara sauce', '2 cups mozzarella', '1/2 cup ricotta', '1/2 cup Parmesan', '2 tablespoons olive oil'],
    instructions: ['Heat the oven to 425°F and prepare the baking dish or stretch the dough.', 'Layer or top with marinara, cheeses, and the finishing ingredient.', 'Bake until the center bubbles and the edges are deeply golden.', 'Rest ten minutes, then finish with basil and slice.'],
    variants: [
      { title: 'Crispy Pepperoni Sheet-Pan Pizza', special: '5 ounces pepperoni and sliced peppers', description: 'Crackly-edged pan pizza with bubbling cheese and crisp pepperoni cups.' },
      { title: 'Spinach Ricotta Skillet Lasagna', special: '5 ounces spinach and broken lasagna noodles', description: 'All the comfort of lasagna with a fraction of the layering.' },
      { title: 'Meatball Parmesan Bake', special: '20 cooked meatballs and extra mozzarella', description: 'Saucy meatballs under a blistered blanket of mozzarella and Parmesan.' },
      { title: 'Roasted Vegetable Calzones', special: '2 cups roasted peppers, zucchini, and mushrooms', description: 'Golden pockets filled with vegetables, ricotta, and stretchy mozzarella.' },
      { title: 'Baked Pesto Chicken Gnocchi', special: '1 pound gnocchi, chicken, and 1/2 cup pesto', description: 'Pillowy gnocchi and chicken baked in pesto with bronzed cheese.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Indian', artworkIndex: 6, featured: true, prepMinutes: 20, cookMinutes: 30,
    ingredients: ['1 1/2 pounds chicken thighs, chickpeas, or paneer', '1 onion, finely diced', '3 garlic cloves, minced', '1 tablespoon grated ginger', '1 can crushed tomatoes', '1 cup coconut milk or cream'],
    instructions: ['Brown the main ingredient in a wide pot, then set aside.', 'Soften the onion; add garlic, ginger, and the finishing spices until fragrant.', 'Add tomatoes and coconut milk, then simmer until thick and glossy.', 'Return the main ingredient, cook through, and serve with rice and cilantro.'],
    variants: [
      { title: 'Creamy Butter Chicken', special: 'garam masala, cumin, and 2 tablespoons butter', description: 'Tender chicken in a velvety tomato sauce fragrant with warm spice.' },
      { title: 'Coconut Chickpea Curry', special: '2 cans chickpeas, spinach, and curry powder', description: 'A pantry-friendly coconut curry with chickpeas and tender greens.' },
      { title: 'Weeknight Chicken Tikka Masala', special: 'garam masala, paprika, and plain yogurt', description: 'A streamlined family favorite with a bright, creamy tomato sauce.' },
      { title: 'Saag Paneer-Inspired Skillet', special: '12 ounces paneer and 10 ounces spinach', description: 'Golden paneer folded into a silky, gently spiced spinach sauce.' },
      { title: 'Red Lentil Dal with Crispy Onions', special: '1 1/2 cups red lentils and crisp fried onions', description: 'Creamy red lentils with warming spice and a crunchy onion finish.' },
    ],
  },
  {
    category: 'Vegetarian', cuisine: 'Mediterranean', artworkIndex: 22, featured: true, prepMinutes: 20, cookMinutes: 20,
    ingredients: ['2 cups cooked farro, quinoa, or couscous', '1 can chickpeas, rinsed', '1 cucumber, chopped', '1 pint cherry tomatoes, halved', '1/2 red onion, thinly sliced', '1/2 cup crumbled feta'],
    instructions: ['Whisk lemon juice, olive oil, salt, pepper, and the finishing ingredient into a bright dressing.', 'Warm the grain and crisp the chickpeas in a skillet or oven.', 'Arrange grains, vegetables, chickpeas, and feta in generous bowls.', 'Spoon over dressing and finish with herbs just before serving.'],
    variants: [
      { title: 'Crispy Chickpea Mediterranean Bowls', special: 'hummus, olives, and lemon oregano dressing', description: 'Crunchy chickpeas, creamy hummus, vegetables, and salty feta in every bite.' },
      { title: 'Roasted Vegetable Farro Bowls', special: 'roasted zucchini, peppers, and basil pesto', description: 'Chewy farro and caramelized vegetables with a bright pesto spoonful.' },
      { title: 'Greek Lemon Quinoa Bowls', special: 'kalamata olives and lemon dill dressing', description: 'A fresh, protein-rich bowl with classic Greek flavors.' },
      { title: 'Falafel Salad with Tahini', special: '12 falafel and creamy tahini sauce', description: 'Herby falafel over a crisp chopped salad with lemony tahini.' },
      { title: 'Halloumi Couscous Bowls', special: '8 ounces seared halloumi and mint', description: 'Salty golden halloumi with fluffy couscous, vegetables, and mint.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Chinese', artworkIndex: 8, prepMinutes: 20, cookMinutes: 15,
    ingredients: ['1 1/2 pounds chicken, beef, shrimp, or tofu', '5 cups mixed vegetables', '3 tablespoons soy sauce', '1 tablespoon rice vinegar', '1 tablespoon brown sugar', '2 teaspoons cornstarch'],
    instructions: ['Whisk soy, vinegar, sugar, cornstarch, and the finishing ingredient with a splash of water.', 'Sear the main ingredient in a very hot skillet or wok, then transfer to a plate.', 'Stir-fry the vegetables until crisp-tender.', 'Return everything to the pan, add sauce, and toss until glossy; serve with rice.'],
    variants: [
      { title: 'Ginger Garlic Chicken Stir-Fry', special: 'fresh ginger, garlic, and scallions', description: 'A colorful, glossy stir-fry with crisp vegetables and juicy chicken.' },
      { title: 'Beef & Broccoli Takeout Night', special: '1 pound broccoli and sesame oil', description: 'Tender beef and bright broccoli in a savory sauce that loves rice.' },
      { title: 'Honey Sesame Tofu', special: '2 tablespoons honey and toasted sesame seeds', description: 'Crisp tofu in a sticky honey-sesame glaze with plenty of vegetables.' },
      { title: 'Cashew Chicken with Peppers', special: '3/4 cup roasted cashews and bell peppers', description: 'Savory chicken, sweet peppers, and buttery cashews in one fast skillet.' },
      { title: 'Garlic Shrimp Fried Rice', special: '1 pound shrimp, 4 cups cold rice, and 2 eggs', description: 'Garlicky fried rice with plump shrimp and crisp-edged grains.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Thai', artworkIndex: 9, prepMinutes: 20, cookMinutes: 25,
    ingredients: ['1 1/2 pounds chicken, shrimp, or tofu', '1 can coconut milk', '2 tablespoons curry paste', '1 tablespoon fish sauce or soy sauce', '1 tablespoon brown sugar', '2 cups mixed vegetables'],
    instructions: ['Scoop the thick coconut cream into a pot and fry with curry paste until fragrant.', 'Add the main ingredient and stir until coated.', 'Pour in remaining coconut milk with fish sauce, sugar, vegetables, and the finishing ingredient.', 'Simmer gently until cooked through; finish with lime and herbs over rice.'],
    variants: [
      { title: 'Thai Green Chicken Curry', special: 'green curry paste, basil, and lime', description: 'Fragrant green curry with tender chicken, vegetables, and fresh basil.' },
      { title: 'Peanut Coconut Noodles', special: '12 ounces noodles and 1/2 cup peanut butter', description: 'Slurpable noodles in a creamy, tangy peanut-coconut sauce.' },
      { title: 'Red Curry Shrimp', special: 'red curry paste, shrimp, and snap peas', description: 'A quick red curry with sweet shrimp and crisp snap peas.' },
      { title: 'Basil Tofu Rice Bowls', special: 'extra-firm tofu, Thai basil, and chiles', description: 'Crisp tofu with basil, chile, and a deeply savory pan sauce.' },
      { title: 'Lemongrass Chicken Lettuce Cups', special: 'minced lemongrass, lettuce cups, and herbs', description: 'Bright, savory chicken tucked into cool lettuce with crunchy herbs.' },
    ],
  },
  {
    category: 'Soup', cuisine: 'American', artworkIndex: 19, prepMinutes: 20, cookMinutes: 40,
    ingredients: ['1 onion, diced', '3 carrots, sliced', '3 celery stalks, sliced', '3 garlic cloves, minced', '6 cups chicken or vegetable broth', '2 tablespoons olive oil'],
    instructions: ['Soften onion, carrots, and celery in olive oil with a pinch of salt.', 'Add garlic and the finishing ingredient; cook until fragrant.', 'Pour in broth and simmer until the vegetables are tender and flavors meld.', 'Adjust seasoning and serve with herbs, cheese, or crusty bread.'],
    variants: [
      { title: 'Cozy Chicken Noodle Soup', special: '2 cups shredded chicken and 8 ounces egg noodles', description: 'A restorative pot of tender chicken, noodles, vegetables, and herbs.' },
      { title: 'Creamy Tomato Basil Soup', special: '2 cans tomatoes, basil, and 1/2 cup cream', description: 'Velvety tomato soup with basil, made for grilled cheese dipping.' },
      { title: 'Loaded Baked Potato Soup', special: '2 pounds potatoes, cheddar, and crisp bacon', description: 'A creamy potato soup with all the best baked-potato toppings.' },
      { title: 'Turkey Meatball Vegetable Soup', special: '20 turkey meatballs and chopped spinach', description: 'Tender meatballs and vegetables in a savory, weeknight-friendly broth.' },
      { title: 'Sweet Corn Chicken Chowder', special: '3 cups corn, chicken, and 1 cup milk', description: 'Sweet corn, tender chicken, and potatoes in a creamy but balanced chowder.' },
    ],
  },
  {
    category: 'Soup', cuisine: 'Global', artworkIndex: 20, prepMinutes: 20, cookMinutes: 35,
    ingredients: ['1 onion, diced', '3 garlic cloves, minced', '1 tablespoon olive oil', '6 cups broth', '1 can tomatoes', '2 cups leafy greens'],
    instructions: ['Cook the onion in olive oil until golden at the edges.', 'Stir in garlic, spices, and the finishing ingredient until aromatic.', 'Add broth and tomatoes; simmer until everything is tender.', 'Fold in greens, brighten with acid, and serve with the suggested garnish.'],
    variants: [
      { title: 'Tuscan White Bean Soup', special: '2 cans cannellini beans, rosemary, and Parmesan', description: 'Creamy white beans, greens, and rosemary in a rustic tomato broth.' },
      { title: 'Mexican Tortilla Soup', special: 'shredded chicken, black beans, lime, and tortilla strips', description: 'A smoky tomato-chile soup piled with crunchy, creamy toppings.' },
      { title: 'Greek Lemon Chicken Orzo Soup', special: 'chicken, orzo, eggs, and lemon', description: 'Silky lemon broth with tender chicken and orzo.' },
      { title: 'Japanese Miso Noodle Soup', special: 'white miso, mushrooms, tofu, and noodles', description: 'A gentle umami-rich soup with noodles, mushrooms, and tofu.' },
      { title: 'Moroccan Chickpea Stew', special: '2 cans chickpeas, cumin, cinnamon, and cilantro', description: 'A warming tomato stew with chickpeas, sweet spice, and fresh herbs.' },
    ],
  },
  {
    category: 'Dessert', cuisine: 'American', artworkIndex: 11, featured: true, prepMinutes: 20, cookMinutes: 35,
    ingredients: ['1 1/2 cups all-purpose flour', '1 cup sugar', '1/2 cup butter, softened', '2 large eggs', '1 teaspoon vanilla', '1/2 teaspoon kosher salt'],
    instructions: ['Heat the oven to 350°F and prepare the pan.', 'Cream butter and sugar, then beat in eggs and vanilla.', 'Fold in flour, salt, and the finishing ingredient just until combined.', 'Bake until the center is set but still tender; cool before slicing.'],
    variants: [
      { title: 'Fudgy Chocolate Celebration Cake', special: '3/4 cup cocoa, buttermilk, and chocolate frosting', description: 'Deep chocolate cake with a plush crumb and glossy frosting.' },
      { title: 'Brown Butter Chocolate Chip Bars', special: '1 cup chocolate chips and browned butter', description: 'Chewy cookie bars with nutty brown butter and pools of chocolate.' },
      { title: 'Classic Apple Crisp', special: '6 sliced apples, oats, and cinnamon', description: 'Jammy cinnamon apples under a crisp, buttery oat topping.' },
      { title: 'Lemon Blueberry Snack Cake', special: 'blueberries, lemon zest, and lemon glaze', description: 'A bright, tender cake packed with blueberries and fresh lemon.' },
      { title: 'Peanut Butter Swirl Brownies', special: 'cocoa and 3/4 cup creamy peanut butter', description: 'Dense chocolate brownies ribboned with salty peanut butter.' },
    ],
  },
  {
    category: 'Dessert', cuisine: 'French', artworkIndex: 16, prepMinutes: 25, cookMinutes: 35,
    ingredients: ['2 cups whole milk or cream', '4 large eggs', '1/2 cup sugar', '1 teaspoon vanilla', '1/4 teaspoon kosher salt', '2 tablespoons butter'],
    instructions: ['Heat the oven to 350°F and butter the baking dish or ramekins.', 'Whisk the custard ingredients until smooth.', 'Arrange the finishing ingredient in the dish and pour over the custard.', 'Bake gently until just set; cool slightly and finish as directed.'],
    variants: [
      { title: 'Berry Vanilla Clafoutis', special: '2 cups mixed berries and powdered sugar', description: 'Juicy berries baked into a tender, custardy French pancake.' },
      { title: 'Chocolate Pots de Crème', special: '6 ounces dark chocolate and whipped cream', description: 'Silky little chocolate custards with an elegant finish.' },
      { title: 'Caramelized Pear Tart', special: '4 ripe pears and puff pastry', description: 'Buttery pastry with caramelized pears and crisp golden edges.' },
      { title: 'Lemon Crème Brûlée', special: 'lemon zest and 1/3 cup sugar for brûléeing', description: 'Creamy lemon custard beneath a glassy caramel shell.' },
      { title: 'Almond Cherry Tea Cake', special: 'almond flour, cherries, and sliced almonds', description: 'A delicate almond cake with pockets of tart cherry.' },
    ],
  },
  {
    category: 'Dinner', cuisine: 'Mediterranean', artworkIndex: 17, prepMinutes: 20, cookMinutes: 30,
    ingredients: ['1 1/2 pounds chicken, fish, or meatballs', '2 tablespoons olive oil', '1 lemon', '3 garlic cloves, minced', '1 teaspoon dried oregano', '4 cups chopped vegetables'],
    instructions: ['Heat the oven to 425°F and season the protein with olive oil, lemon, garlic, oregano, and salt.', 'Arrange with vegetables and the finishing ingredient on a sheet pan or in a skillet.', 'Roast until browned and cooked through.', 'Finish with herbs and serve with pita, rice, or a crisp salad.'],
    variants: [
      { title: 'Greek Lemon Chicken & Potatoes', special: '1 1/2 pounds potatoes and fresh dill', description: 'Lemony roast chicken with crisp potatoes, oregano, and pan juices.' },
      { title: 'Baked Feta Tomato Fish', special: '4 white fish fillets, tomatoes, and feta', description: 'Flaky fish baked with burst tomatoes, salty feta, and herbs.' },
      { title: 'Turkey Kofta Pita Plates', special: 'turkey kofta, pita, cucumber, and yogurt sauce', description: 'Spiced turkey, cool yogurt, crisp vegetables, and warm pita.' },
      { title: 'One-Pan Lemon Orzo Chicken', special: '1 cup orzo, spinach, and feta', description: 'Golden chicken and creamy lemony orzo cooked in one pan.' },
      { title: 'Herby Lamb Meatballs with Couscous', special: 'lamb meatballs, couscous, mint, and yogurt', description: 'Juicy herbed meatballs with fluffy couscous and cool yogurt.' },
    ],
  },
  {
    category: 'Lunch', cuisine: 'American', artworkIndex: 15, prepMinutes: 15, cookMinutes: 12,
    ingredients: ['8 slices sturdy bread or 4 wraps', '4 cups crisp greens', '1 ripe avocado', '1 tomato, sliced', '1/2 red onion, thinly sliced', '1/3 cup favorite dressing or spread'],
    instructions: ['Prepare the finishing ingredient and season it well.', 'Toast bread or warm wraps until pliable.', 'Layer the spread, greens, vegetables, and main filling evenly.', 'Close, slice, and serve immediately with fruit or crunchy vegetables.'],
    variants: [
      { title: 'Crispy Chicken Avocado Wraps', special: '2 cups crispy chicken strips and ranch', description: 'Crunchy chicken, creamy avocado, and crisp vegetables in a fast wrap.' },
      { title: 'Turkey Pesto Melt', special: 'sliced turkey, provolone, and basil pesto', description: 'A golden skillet sandwich with turkey, pesto, and stretchy provolone.' },
      { title: 'BLT Chopped Salad', special: 'crisp bacon, croutons, and buttermilk dressing', description: 'The best parts of a BLT tossed into a crunchy, satisfying salad.' },
      { title: 'Buffalo Chicken Salad Pitas', special: 'shredded chicken, Buffalo sauce, and blue cheese', description: 'Spicy-creamy chicken salad tucked into soft pita with crisp celery.' },
      { title: 'Roasted Veggie Hummus Sandwiches', special: 'hummus and 2 cups roasted vegetables', description: 'A generous vegetarian sandwich with hummus and caramelized vegetables.' },
    ],
  },
  {
    category: 'Vegetarian', cuisine: 'Global', artworkIndex: 18, prepMinutes: 20, cookMinutes: 30,
    ingredients: ['2 cans beans or 14 ounces extra-firm tofu', '4 cups mixed vegetables', '2 tablespoons olive oil', '3 garlic cloves, minced', '1 cup cooked grains', '1 lemon or lime'],
    instructions: ['Pat the main ingredient dry and season generously.', 'Roast or sear until crisp at the edges.', 'Cook the vegetables with garlic and the finishing ingredient until tender.', 'Combine with grains, brighten with citrus, and add a creamy or crunchy topping.'],
    variants: [
      { title: 'Crispy Tofu Rainbow Stir-Fry', special: 'ginger-soy sauce and sesame seeds', description: 'Golden tofu and a rainbow of crisp vegetables in glossy ginger sauce.' },
      { title: 'Smoky Black Bean Stuffed Peppers', special: '4 bell peppers, black beans, corn, and cheddar', description: 'Colorful peppers packed with smoky beans, rice, corn, and cheese.' },
      { title: 'Creamy White Bean Tomato Skillet', special: 'white beans, cherry tomatoes, spinach, and cream', description: 'A cozy one-pan vegetarian supper made for torn bread.' },
      { title: 'Sweet Potato Peanut Bowls', special: 'roasted sweet potato, peanut sauce, and cabbage', description: 'Sweet, savory bowls with creamy peanut sauce and crunchy cabbage.' },
      { title: 'Crispy Cauliflower Shawarma Plates', special: 'shawarma-spiced cauliflower, tahini, and pita', description: 'Deeply browned spiced cauliflower with tahini, salad, and warm pita.' },
    ],
  },
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const metadataById = new Map<string, StarterRecipeMetadata>();

export const STARTER_RECIPE_PROJECTIONS: RecipeProjection[] = Array.from({ length: 5 }, (_, variantIndex) =>
  GROUPS.map((group): RecipeProjection => {
    const variant = group.variants[variantIndex];
    const key = slug(variant.title);
    const recipeId = `kwilt-recipe-${key}`;
    const versionId = `${recipeId}-v1`;
    metadataById.set(recipeId, {
      category: group.category,
      cuisine: group.cuisine,
      artworkIndex: group.artworkIndex,
      featured: group.featured === true && variantIndex === 0,
    });
    const createdAt = '2026-08-05T12:00:00.000Z';
    return {
      recipe: {
        id: recipeId,
        ownerPersonId: 'kwilt-catalog',
        currentVersionId: versionId,
        lifecycle: 'active',
        provenance: {
          id: `${recipeId}-provenance`,
          method: 'catalog',
          sourceUrl: null,
          sourceTitle: 'Kwilt Household Collection',
          sourceAuthor: 'Kwilt Kitchen',
          sourceContentHash: `kwilt:${key}:v1`,
          rightsBasis: 'kwilt_authored',
          importedAt: createdAt,
        },
        credits: [{
          id: `${recipeId}-credit`, role: 'author', personId: null, publicProfileId: null,
          displayLabel: 'Kwilt Kitchen', position: 0, publicVisible: true,
        }],
        lineage: [], accessGrants: [],
        mediaAssets: [{
          id: `${recipeId}-media`, ownerPersonId: 'kwilt-catalog',
          storageRef: `bundle://household-recipe-atlas/${group.artworkIndex}`,
          mediaType: 'image/png', rightsBasis: 'kwilt_authored', attribution: 'Created for Kwilt',
          altText: `${variant.title}, served and ready to eat`, publicAllowed: true, lifecycle: 'active',
        }],
        createdAt, updatedAt: createdAt,
      },
      currentVersion: {
        id: versionId,
        recipeId,
        version: 1,
        title: variant.title,
        description: variant.description,
        yieldQuantity: 4,
        yieldUnit: 'servings',
        prepMinutes: group.prepMinutes,
        cookMinutes: group.cookMinutes,
        notes: 'Taste as you go and adjust salt, heat, and acidity for your household.',
        ingredients: [...group.ingredients, variant.special].map((originalText, position) => ({
          id: `${versionId}-ingredient-${position + 1}`, recipeVersionId: versionId, position,
          groupLabel: null, originalText, quantityMin: null, quantityMax: null, unit: null,
          ingredientConcept: null, preparation: null, optional: false, parseConfidence: 1,
        })),
        instructions: group.instructions.map((text, position) => ({
          id: `${versionId}-step-${position + 1}`, recipeVersionId: versionId, position,
          sectionLabel: position === 0 ? 'Cook' : null, text,
        })),
        createdByPersonId: 'kwilt-catalog',
        createdAt,
        contentHash: `kwilt:${key}:v1`,
      },
    };
  }),
).flat();

export function getStarterRecipeMetadata(recipeId: string): StarterRecipeMetadata | null {
  return metadataById.get(recipeId) ?? null;
}

export function isStarterRecipe(recipeId: string): boolean {
  return metadataById.has(recipeId);
}

export function buildRecipeLibraryInventory(personalRecipes: readonly RecipeProjection[]): RecipeProjection[] {
  const personalIds = new Set(personalRecipes.map(({ recipe }) => recipe.id));
  return [
    ...personalRecipes,
    ...STARTER_RECIPE_PROJECTIONS.filter(({ recipe }) => !personalIds.has(recipe.id)),
  ];
}

export function getBundledRecipeArtworkIndex(storageRef: string | null | undefined): number | null {
  const match = /^bundle:\/\/household-recipe-atlas\/(\d+)$/.exec(storageRef ?? '');
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 && index < 24 ? index : null;
}

export function countActiveRecipeInventoryFilters(filters: RecipeInventoryFilters): number {
  return Number(filters.source !== 'all')
    + Number(filters.maxMinutes !== null)
    + Number(filters.category !== null)
    + Number(filters.cuisine !== null);
}

function recipeTotalMinutes(projection: RecipeProjection): number {
  return (projection.currentVersion.prepMinutes ?? 0) + (projection.currentVersion.cookMinutes ?? 0);
}

export function filterRecipeInventory(
  recipes: readonly RecipeProjection[],
  options: { query: string; filters: RecipeInventoryFilters; sort: RecipeInventorySortMode },
): RecipeProjection[] {
  const terms = options.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = recipes.filter((projection) => {
    const metadata = getStarterRecipeMetadata(projection.recipe.id);
    const totalMinutes = recipeTotalMinutes(projection);
    if (options.filters.source === 'yours' && metadata) return false;
    if (options.filters.maxMinutes !== null && (totalMinutes <= 0 || totalMinutes > options.filters.maxMinutes)) return false;
    if (options.filters.category !== null && metadata?.category !== options.filters.category) return false;
    if (options.filters.cuisine !== null && metadata?.cuisine !== options.filters.cuisine) return false;
    if (!terms.length) return true;
    const searchable = [
      projection.currentVersion.title,
      projection.currentVersion.description,
      metadata?.category,
      metadata?.cuisine,
      ...projection.currentVersion.ingredients.map(({ originalText }) => originalText),
    ].filter(Boolean).join(' ').toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });

  if (options.sort === 'featured') return filtered;
  return [...filtered].sort((left, right) => {
    if (options.sort === 'title') {
      return left.currentVersion.title.localeCompare(right.currentVersion.title);
    }
    const timeDifference = recipeTotalMinutes(left) - recipeTotalMinutes(right);
    return timeDifference || left.currentVersion.title.localeCompare(right.currentVersion.title);
  });
}
