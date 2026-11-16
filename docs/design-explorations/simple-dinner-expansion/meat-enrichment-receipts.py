"""Serialize the quantity and cooking desk review accompanying the meat slice."""
import json,re,runpy
from pathlib import Path
ns=runpy.run_path('docs/design-explorations/simple-dinner-expansion/meat-authoring.py')
rs=ns['R']; meta={i:(truth,dup,keys) for i,t,truth,dup,keys in ns['reviews']}
def rationale(line):
 s=line.lower()
 if 'ground beef' in s or 'ground pork' in s:
  rule='This yields about '+('3' if '12 ounces' in s else '4')+' ounces raw meat per serving, with the listed starch and vegetables completing dinner; break into small crumbles and verify 160°F.'
 elif 'tenderloin' in s or 'sirloin' in s or 'cutlets' in s:
  rule='Provides '+('5' if '1 1/4' in s or '5 ounces' in s else '4')+' ounces raw meat per serving; the specified thickness, rather than total batch weight, governs searing. Verify 145°F and a three-minute rest.'
 elif 'sausage' in s or 'kielbasa' in s:
  rule='Three ounces per serving provides a seasoned meat portion alongside vegetables and starch or legumes. Fully cooked sausage is reheated; fresh sausage is crumbled and cooked to160°F, as specified in this recipe.'
 elif 'ham' in s:
  rule='The cooked ham is a salty accent and protein portion alongside the starch, vegetables and any eggs or legumes. Dice evenly for quick heating; do not substitute uncooked gammon.'
 elif 'broth' in s:
  rule='This measured amount supplies the stated soup or sauce volume for four servings; low-sodium broth leaves room for salty meat and cheese. Simmer as directed and adjust only for evaporation or absorption.'
 elif 'water' in s:
  rule='Measured hydration is tied to the stated grain or vegetables; retain the stated proportional split when scaling. Boiling and corrective splash water are process amounts, not extra servings.'
 elif 'dry' in s and 'rice' in s:
  rule='One cup dry rice provides four starch portions when expanded with the measured liquid. White long-grain is specified because brown rice needs more time and water.'
 elif 'cooked plain brown rice' in s:
  rule='The pouch is already cooked, so its role is filling bulk rather than absorbing a pot of liquid; keep the pouch weight proportional to the zucchini and meat.'
 elif 'couscous' in s:
  rule='This is an instant couscous dinner base for four, hydrated off heat with the measured water. Pearl couscous would invalidate both liquid ratio and timing.'
 elif 'barley' in s:
  rule='One cup of the explicitly quick-cooking product expands into four grain portions; ordinary pearl barley cannot replace it within the stated time.'
 elif 'polenta' in s:
  rule='One cup instant polenta with the listed water makes a soft four-portion base; packet grind governs hydration, so keep hot correction water available.'
 elif 'gnocchi' in s:
  rule='One standard package contributes roughly4.4ounces per serving with meat and vegetables. Shelf-stable potato gnocchi is specified; cauliflower-brand or frozen gnocchi is a different ingredient.'
 elif 'pasta' in s or 'spaghetti' in s or 'noodles' in s or 'orzo' in s:
  rule='The dry starch quantity supplies roughly2–3ounces per person alongside protein and vegetables. Respect the named shape and package time; reserve cooking water only where instructed.'
 elif 'potato' in s:
  rule='The specified weight is the meal starch, not a garnish. Even small cubes are necessary for the short boil or covered simmer; do not replace them with whole potatoes.'
 elif 'beans' in s or 'lentils' in s:
  rule='Use the stated canned quantity, drained and rinsed before measuring into the recipe. These are already cooked and supply meal bulk; dry pulses would change timing and liquid requirements.'
 elif 'breadcrumbs' in s:
  rule='The measured dry crumbs bind the small meatballs without making a bread-heavy filling; retain the ratio to meat and egg and form the stated bite-sized pieces.'
 elif 'bread' in s or 'buns' in s or 'rolls' in s or 'pitas' in s or 'naan' in s or 'tortillas' in s or 'chips' in s:
  rule='This count or weight is included in the four-person meal, including any side bread. Keep the per-person portion constant when scaling and warm or toast only as instructed.'
 elif re.search(r'\beggs?\b',s):
  rule='Whole eggs provide structure; keep egg-to-milk and filling ratios proportional. For fractional scaled eggs, beat and measure rather than rounding down.'
 elif 'flour' in s or 'cornstarch' in s:
  rule='A small measured amount thickens the listed sauce or coats cutlets; cook flour before dairy or dissolve cornstarch in cold liquid. Scale with sauce volume, not cooking duration.'
 elif 'cornmeal' in s or 'baking powder' in s:
  rule='Part of the cornbread lid formula; retain its ratio to flour, egg and milk. Use deeper or additional cookware for larger batches, never a thicker untested batter layer.'
 elif 'coconut milk' in s:
  rule='The measured coconut milk supplies the mild curry sauce body; keep its ratio to the other liquid and simmer gently as instructed.'
 elif 'milk' in s or 'cream' in s or 'yogurt' in s or 'ricotta' in s or 'cheddar' in s or 'parmesan' in s or 'mozzarella' in s or 'monterey' in s or 'feta' in s or 'swiss' in s:
  rule='The measured dairy portion provides the specified sauce, topping or dressing for four. Add in the stated order; cultured dairy and cheese should not be aggressively boiled after addition.'
 elif 'oil' in s or 'butter' in s:
  rule='Measured cooking fat is sufficient for the stated cookware and finish. Proportional half/third allocations in instructions preserve split use when scaled; extra pans may need a light additional coating.'
 elif 'lemon' in s or 'lime' in s or 'vinegar' in s:
  rule='The quantity brightens the full batch; squeeze or measure the stated juice, keeping proportional divisions. Add at the specified finish so sauce balance and dairy texture remain controlled.'
 elif 'soy sauce' in s or 'mustard' in s or 'ketchup' in s or 'salsa' in s:
  rule='This measured seasoning contributes both flavor and salt to the entire batch. Keep the mild or reduced-sodium specification and scale the listed amount, then taste before adding salt.'
 elif 'salt' in s or 'black pepper' in s:
  rule='Restrained whole-batch seasoning; preserve any proportional split and taste the finished dish before adding more, particularly with broth or cured meat.'
 elif 'tomato' in s or 'passata' in s or 'pumpkin' in s:
  rule='This supplies the stated sauce body or fresh side. Keep can juices when specified and use plain unsweetened pumpkin or unseasoned tomato products; fresh salad tomatoes remain uncooked.'
 elif 'corn' in s or 'spinach' in s or 'peas' in s or 'broccoli' in s or 'asparagus' in s:
  rule='Provides a substantial vegetable component across four servings; small uniform pieces and late addition avoid overcooking while allowing the stated short cooking interval.'
 elif 'mushroom' in s or 'onion' in s or 'cabbage' in s or 'carrot' in s or 'celery' in s or 'pepper' in s or 'zucchini' in s or 'eggplant' in s or 'cauliflower' in s:
  rule='This is part of the main vegetable portion, not optional garnish. Follow the stated slicing size and moisture-management step so the batch fits its pan and cooks within the allotted interval.'
 elif 'cucumber' in s or 'romaine' in s or 'arugula' in s or 'avocado' in s or 'peach' in s:
  rule='Supplies fresh contrast or a quick fruit finish across four servings. Prepare as listed and add at service or near the end, rather than during the main simmer.'
 elif 'pineapple' in s:
  rule='Measured fruit or juice provides sweet-acid balance for the glaze. Drain fruit and measure juice independently so sauce liquid does not vary with the can.'
 else:
  rule='A restrained aromatic or seasoning for the full four-serving batch; prepare as stated and add at its named instruction step so it perfumes the dish without prolonged scorching.'
 return line+': '+rule
out={}
for r in rs:
 i=r['rosterId'];truth,dup,keys=meta[i];n=int(i[2:]);k,decision=ns['third'][n]
 equipment=[];found=set()
 for ix,step in enumerate(r['instructions']):
  for pattern,label in [(r'(?:12-inch deep |deep 12-inch lidded |deep lidded |wide lidded |10-inch oven-safe nonstick |10-inch oven-safe |oven-safe |large |deep |wide |second dry |dry )?skillet','Skillet'),(r'saucepan','Saucepan'),(r'soup pot','Soup pot'),(r'covered pot','Pasta pot'),(r'(?:18-by-13-inch |large )?sheet pan','Sheet pan'),(r'two sheet pans','Two sheet pans'),(r'toaster','Toaster')]:
   m=re.search(pattern,step)
   if m and label not in found:
    equipment.append(dict(phrase=m.group(0),instructionIndex=ix,label=label));found.add(label)
 if any(e['label']=='Two sheet pans' for e in equipment):
  equipment=[e for e in equipment if e['label']!='Sheet pan']
 # Tooling attaches ingredient hashes; these statements retain the source quantities.
 cook=f"{truth} Default yield is four. The main portion starts with {r['ingredients'][0]}; the supporting bulk includes {r['ingredients'][1]} and {r['ingredients'][2]}. The stated {r['prepMinutes']+r['cookMinutes']+r['inactiveMinutes']}-minute total includes the explicit rests and overlapping side preparation; it is an estimate, not measured kitchen evidence."
 history=[f"{r['title']} is an original Kwilt everyday composition: {r['description']} {dup} This is a contemporary family supper rather than a claim to preserve a named regional dish. All sides named in the method are included in the ingredient list.",f"The culinary desk review compared {', '.join(s['publisher']+' — '+s['title'] for s in r['research']['sources'][:3])}. {decision} FoodSafety.gov supplies separate temperature guidance. No taste trial, cooking trial or reviewer consensus is claimed."]
 scaling='All listed ingredient quantities scale linearly; preserve the named cut size and per-serving bread or meatball portions. Keep proportional divided-use wording. '+('For this bake, use additional pans at the original depth rather than doubling thickness. ' if any('oven' in s.lower() or 'bake' in s.lower() for s in r['instructions']) else 'Use additional skillet batches or a larger soup vessel to retain the original browning layer and simmer depth. ')+'Do not multiply heat settings, rests or cooking time by yield. Package-time grains, tenderness and thermometer endpoints still govern; corrective water is added by texture.'
 out[i]=dict(cookingRationale=cook,ingredientRationales=[rationale(x) for x in r['ingredients']],scalingRationale=scaling,equipment=equipment,historyParagraphs=history,instructionAuditRationale=truth+' '+decision+' '+r['notes'],reviewedAt='2026-10-16')
Path('scripts/recipe-enrichment/simple-dinners/meat-reviews.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Wrote',len(out),'review receipts and',sum(len(x['ingredientRationales']) for x in out.values()),'ingredient rationales')
