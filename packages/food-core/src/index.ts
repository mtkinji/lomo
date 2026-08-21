export type ParsedQuantity = {
  quantityMin: number | null;
  quantityMax: number | null;
  packageQuantity: number | null;
  packageUnit: string | null;
  consumedLength: number;
};

export type IdempotencyIdentity = {
  idempotencyKey: string;
  contentHash: string;
};

export class FoodCoreContractError extends Error {
  constructor(public readonly code: 'food.idempotency_conflict', message: string) {
    super(message);
    this.name = 'FoodCoreContractError';
  }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`;
}

/** A deterministic, non-secret content fingerprint for local replay detection. */
export function stableContentHash(value: unknown): string {
  const text = stableJson(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

export function verifyIdempotentReplay(
  existing: IdempotencyIdentity,
  requested: IdempotencyIdentity,
): 'replay' | 'new' {
  if (existing.idempotencyKey !== requested.idempotencyKey) return 'new';
  if (existing.contentHash !== requested.contentHash) {
    throw new FoodCoreContractError('food.idempotency_conflict', 'This operation key was already used for different content.');
  }
  return 'replay';
}

export type ParsedIngredient = ParsedQuantity & {
  unit: string | null;
  concept: string;
  preparation: string | null;
};

export type GroceryCompilerLine = {
  originalText: string;
  recipeVersionId: string;
  ingredientLineId: string;
  planEntryId: string;
  fromYield: number | null;
  toYield: number | null;
  optional: boolean;
};

export type CompiledGroceryItem = {
  id: string;
  concept: string;
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  packageQuantity: number | null;
  packageUnit: string | null;
  preparation: string | null;
  optional: boolean;
  aisle: Aisle;
  originalDisplayTexts: string[];
  sources: Array<{
    recipeVersionId: string;
    ingredientLineId: string;
    planEntryId: string;
    quantityMin: number | null;
    quantityMax: number | null;
    unit: string | null;
    optional: boolean;
  }>;
  reviewReason: string | null;
};

export type Aisle = 'produce'|'bakery'|'dairy_eggs'|'meat_seafood'|'pantry'|'frozen'|'beverages'|'household'|'other';

const vulgar: Record<string, string> = { '⅛':'1/8','¼':'1/4','⅓':'1/3','⅜':'3/8','½':'1/2','⅝':'5/8','⅔':'2/3','¾':'3/4','⅞':'7/8' };
const numberWords: Record<string, number> = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };

function number(value: string): number | null {
  if (numberWords[value.toLowerCase()] !== undefined) return numberWords[value.toLowerCase()];
  if (/^\d+\s+\d+\/\d+$/.test(value)) { const [whole,fraction]=value.split(/\s+/); const [a,b]=fraction.split('/').map(Number); return Number(whole)+a/b; }
  if (/^\d+\/\d+$/.test(value)) { const [a,b]=value.split('/').map(Number); return b ? a/b : null; }
  const parsed=Number(value); return Number.isFinite(parsed)?parsed:null;
}

function normalizeVulgar(text: string): string {
  return text.replace(/(\d)([⅛¼⅓⅜½⅝⅔¾⅞])/g, (_,whole,fraction)=>`${whole} ${vulgar[fraction]}`).replace(/[⅛¼⅓⅜½⅝⅔¾⅞]/g,(fraction)=>vulgar[fraction]);
}

const quantityToken = '(?:one|two|three|four|five|six|seven|eight|nine|ten|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)';

export function parseQuantity(original: string): ParsedQuantity {
  const text=normalizeVulgar(original.trim().toLowerCase());
  const parentheticalPackageMatch=new RegExp(`^(${quantityToken})\\s+(?:can|cans|package|packages|pkg|jar|jars|bottle|bottles)\\s+\\((\\d+(?:\\.\\d+)?)\\s*(ounce|ounces|oz|pound|pounds|lb|gram|grams|g|kilogram|kilograms|kg)\\)`).exec(text);
  if(parentheticalPackageMatch)return{quantityMin:number(parentheticalPackageMatch[1]),quantityMax:null,packageQuantity:Number(parentheticalPackageMatch[2]),packageUnit:normalizeUnit(parentheticalPackageMatch[3]),consumedLength:parentheticalPackageMatch[0].length};
  const packageMatch=new RegExp(`^(${quantityToken})\\s+(\\d+(?:\\.\\d+)?)\\s*[- ]?(ounce|ounces|oz|pound|pounds|lb|gram|grams|g|kilogram|kilograms|kg)\\s+(?:can|cans|package|packages|pkg|jar|jars|bottle|bottles)\\b`).exec(text);
  if(packageMatch)return{quantityMin:number(packageMatch[1]),quantityMax:null,packageQuantity:Number(packageMatch[2]),packageUnit:normalizeUnit(packageMatch[3]),consumedLength:packageMatch[0].length};
  const range=new RegExp(`^(${quantityToken})\\s*[-–]\\s*(${quantityToken})\\b`).exec(text);
  if(range)return{quantityMin:number(range[1]),quantityMax:number(range[2]),packageQuantity:null,packageUnit:null,consumedLength:range[0].length};
  const match=new RegExp(`^(${quantityToken})\\b`).exec(text);
  if(match)return{quantityMin:number(match[1]),quantityMax:null,packageQuantity:null,packageUnit:null,consumedLength:match[0].length};
  return{quantityMin:null,quantityMax:null,packageQuantity:null,packageUnit:null,consumedLength:0};
}

const units: Record<string,string>={cups:'cup',cup:'cup',tablespoons:'tablespoon',tablespoon:'tablespoon',tbsp:'tablespoon',teaspoons:'teaspoon',teaspoon:'teaspoon',tsp:'teaspoon',ounces:'ounce',ounce:'ounce',oz:'ounce',pounds:'pound',pound:'pound',lbs:'pound',lb:'pound',grams:'gram',gram:'gram',g:'gram',kilograms:'kilogram',kilogram:'kilogram',kg:'kilogram',bunches:'bunch',bunch:'bunch',cloves:'clove',clove:'clove',cans:'count',can:'count',packages:'count',package:'count',jars:'count',jar:'count',bottles:'count',bottle:'count'};
export function normalizeUnit(value:string):string{return units[value.toLowerCase()]??value.toLowerCase();}

export function parseIngredientLine(originalText:string):ParsedIngredient{
  const normalized=normalizeVulgar(originalText.trim().toLowerCase());
  const quantity=parseQuantity(originalText);
  let remainder=normalized.slice(quantity.consumedLength).trim().replace(/^of\s+/,'');
  let unit:string|null=null;
  if(quantity.packageQuantity!==null){ unit='count'; remainder=remainder.replace(/^(?:can|cans|package|packages|pkg|jar|jars|bottle|bottles)\s+/,''); }
  else { const unitMatch=/^([a-z]+)\b/.exec(remainder); if(unitMatch&&units[unitMatch[1]]){unit=normalizeUnit(unitMatch[1]);remainder=remainder.slice(unitMatch[0].length).trim();} else if(quantity.quantityMin!==null) unit='count'; }
  remainder=remainder.replace(/^\(\s*\d+(?:\.\d+)?\s*(?:ounce|ounces|oz|pound|pounds|lb|gram|grams|g|kilogram|kilograms|kg)\s*\)\s*/,'');
  const comma=remainder.indexOf(',');
  let concept=(comma>=0?remainder.slice(0,comma):remainder).trim();
  let preparation=comma>=0?remainder.slice(comma+1).trim()||null:null;
  const suffix=/\s+(to taste|for garnish|divided|chopped|crushed|whole|diced|sliced|minced)$/.exec(concept);
  if(suffix){preparation=preparation??suffix[1];concept=concept.slice(0,suffix.index).trim();}
  concept=concept.replace(/^(?:of\s+)/,'').replace(/\s+/g,' ');
  return{...quantity,unit,concept,preparation};
}

const conversion:Record<string,{dimension:'volume'|'mass';factor:number}>={teaspoon:{dimension:'volume',factor:1},tablespoon:{dimension:'volume',factor:3},cup:{dimension:'volume',factor:48},gram:{dimension:'mass',factor:1},kilogram:{dimension:'mass',factor:1000},ounce:{dimension:'mass',factor:28.349523125},pound:{dimension:'mass',factor:453.59237}};
function compatible(a:string|null,b:string|null):boolean{return a===b||Boolean(a&&b&&conversion[a]&&conversion[b]&&conversion[a].dimension===conversion[b].dimension);}
function convert(value:number|null,from:string|null,to:string|null):number|null{if(value===null||from===to)return value;if(!from||!to||!compatible(from,to))return null;return Math.round(value*(conversion[from].factor/conversion[to].factor)*1e9)/1e9;}

export function assignAisle(concept:string):Aisle{
  if(/onion|carrot|tomato|cilantro|lettuce|apple|banana|garlic|potato|pepper/.test(concept))return'produce';
  if(/bread|tortilla|bun/.test(concept))return'bakery';
  if(/milk|cheese|butter|yogurt|egg/.test(concept))return'dairy_eggs';
  if(/chicken|beef|pork|fish|shrimp/.test(concept))return'meat_seafood';
  if(/frozen|ice cream/.test(concept))return'frozen';
  if(/juice|soda|water|coffee|tea/.test(concept))return'beverages';
  if(/foil|soap|paper towel|trash bag/.test(concept))return'household';
  if(/flour|sugar|salt|oil|rice|pasta|bean|spice/.test(concept))return'pantry';
  return'other';
}

export function buildGroceryCompilation(lines:GroceryCompilerLine[]):{items:CompiledGroceryItem[]}{
  const items:CompiledGroceryItem[]=[];
  for(const line of lines){
    const parsed=parseIngredientLine(line.originalText); const factor=line.fromYield&&line.toYield?line.toYield/line.fromYield:1;
    const quantityMin=parsed.quantityMin===null?null:Math.round(parsed.quantityMin*factor*1e9)/1e9; const quantityMax=parsed.quantityMax===null?null:Math.round(parsed.quantityMax*factor*1e9)/1e9;
    const mergeable=quantityMin!==null&&parsed.unit!==null&&!['to taste','for garnish','divided'].includes(parsed.preparation??'');
    const existing=mergeable?items.find((item)=>item.concept===parsed.concept&&item.preparation===parsed.preparation&&item.optional===line.optional&&item.packageQuantity===parsed.packageQuantity&&item.packageUnit===parsed.packageUnit&&compatible(item.unit,parsed.unit)):undefined;
    const sourceForUnit=(unit:string|null)=>({recipeVersionId:line.recipeVersionId,ingredientLineId:line.ingredientLineId,planEntryId:line.planEntryId,quantityMin:convert(quantityMin,parsed.unit,unit),quantityMax:convert(quantityMax,parsed.unit,unit),unit,optional:line.optional});
    if(existing){existing.quantityMin=(existing.quantityMin??0)+(convert(quantityMin,parsed.unit,existing.unit)??0);existing.quantityMax=existing.quantityMax===null&&quantityMax===null?null:(existing.quantityMax??existing.quantityMin??0)+(convert(quantityMax,parsed.unit,existing.unit)??0);existing.originalDisplayTexts.push(line.originalText);existing.sources.push(sourceForUnit(existing.unit));continue;}
    const source=sourceForUnit(parsed.unit);
    items.push({id:`grocery-${items.length+1}`,concept:parsed.concept||line.originalText.toLowerCase(),quantityMin,quantityMax,unit:parsed.unit,packageQuantity:parsed.packageQuantity,packageUnit:parsed.packageUnit,preparation:parsed.preparation,optional:line.optional,aisle:assignAisle(parsed.concept),originalDisplayTexts:[line.originalText],sources:[source],reviewReason:quantityMin===null?'Quantity needs review':!parsed.concept?'Ingredient needs review':null});
  }
  return{items};
}
