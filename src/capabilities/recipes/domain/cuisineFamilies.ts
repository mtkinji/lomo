export type CuisineFamilyId =
  | "north-american"
  | "mexican"
  | "latin-american"
  | "caribbean"
  | "french"
  | "italian"
  | "british-irish"
  | "european"
  | "mediterranean"
  | "middle-eastern"
  | "african"
  | "indian-south-asian"
  | "chinese"
  | "taiwanese"
  | "japanese"
  | "korean"
  | "thai"
  | "vietnamese"
  | "southeast-asian"
  | "australian";

export type CuisineFamily = {
  id: CuisineFamilyId;
  label: string;
  shortLabel: string;
  featured: boolean;
  cuisines: readonly string[];
};

export const FEATURED_CUISINE_FAMILY_IDS: readonly CuisineFamilyId[] = [
  "north-american",
  "caribbean",
  "chinese",
  "french",
  "italian",
  "japanese",
  "korean",
  "latin-american",
  "mexican",
  "middle-eastern",
  "indian-south-asian",
  "thai",
  "vietnamese",
] as const;

const featured = new Set<CuisineFamilyId>(FEATURED_CUISINE_FAMILY_IDS);

function family(
  id: CuisineFamilyId,
  label: string,
  shortLabel: string,
  cuisines: readonly string[],
): CuisineFamily {
  return { id, label, shortLabel, featured: featured.has(id), cuisines };
}

export const CUISINE_FAMILIES: readonly CuisineFamily[] = [
  family("north-american", "North American", "American", [
    "Alaska US",
    "American",
    "Cajun",
    "Californian",
    "Canadian",
    "Carolinas US",
    "Hawaiian",
    "Jewish-American",
    "Louisiana Creole",
    "Louisiana-inspired",
    "Louisiana US",
    "Lowcountry US",
    "Maryland US",
    "Midwestern US",
    "Modern",
    "Modern American",
    "Modern North American",
    "Nashville US",
    "New England US",
    "New Orleans US",
    "New York US",
    "Pennsylvania Dutch",
    "Philadelphia US",
    "Québécois",
    "Southern US",
    "Southern US-inspired",
    "Southwestern US",
    "Southwestern US-inspired",
    "Texan",
    "Tijuana / North American",
  ]),
  family("mexican", "Mexican", "Mexican", [
    "Austin Tex-Mex",
    "Baja Mexican",
    "Central Mexican",
    "Jalisco Mexican",
    "Mexican",
    "Mexican-inspired",
    "Michoacán Mexican",
    "Oaxacan Mexican",
    "Puebla Mexican",
    "Tex-Mex",
    "Texas Mexican",
    "Veracruz Mexican",
    "Yucatecan Mexican",
  ]),
  family("latin-american", "Latin American", "Latin American", [
    "Argentine",
    "Argentine-inspired",
    "Brazilian",
    "Brazilian-inspired",
    "Chilean",
    "Colombian",
    "Costa Rican",
    "Honduran",
    "Peruvian",
    "Peruvian-inspired",
    "Latin American-inspired",
    "Salvadoran",
    "Venezuelan",
  ]),
  family("caribbean", "Caribbean", "Caribbean", [
    "Caribbean-inspired",
    "Cuban-inspired",
    "Cuban-American",
    "Dominican",
    "Haitian",
    "Jamaican",
    "Trinidadian",
  ]),
  family("french", "French", "French", [
    "Alsatian French",
    "Basque French",
    "Burgundian French",
    "French",
    "French-inspired",
    "French-American",
    "Provençal",
    "Provençal French",
    "Southwestern French",
  ]),
  family("italian", "Italian", "Italian", [
    "Italian",
    "Italian-inspired",
    "Italian-American",
    "Ligurian Italian",
    "Milanese Italian",
    "Neapolitan Italian",
    "Northern Italian",
    "Roman Italian",
    "Sicilian Italian",
    "Southern Italian",
  ]),
  family("british-irish", "British & Irish", "British & Irish", [
    "British",
    "British-inspired",
    "Cornish",
    "Irish",
    "Scottish",
    "Welsh",
  ]),
  family("european", "Continental European", "European", [
    "Austrian",
    "Balkan",
    "Belgian-American",
    "Catalan",
    "Central European-inspired",
    "Danish",
    "Dutch",
    "Eastern European-inspired",
    "Finnish",
    "Georgian",
    "German",
    "Nordic",
    "Nordic-inspired",
    "Northern European-inspired",
    "Polish",
    "Portuguese",
    "Russian",
    "Scandinavian",
    "Spanish",
    "Spanish-inspired",
    "Swedish",
    "Swiss",
    "Ukrainian",
  ]),
  family("mediterranean", "Mediterranean", "Mediterranean", [
    "Cypriot",
    "Greek",
    "Greek-inspired",
    "Mediterranean",
    "Modern Mediterranean",
    "Turkish",
    "Turkish-inspired",
  ]),
  family("middle-eastern", "Middle Eastern", "Middle Eastern", [
    "Iraqi",
    "Israeli",
    "Lebanese",
    "Levantine",
    "Levantine-inspired",
    "Omani",
    "Palestinian",
    "Persian",
    "Persian-inspired",
    "Saudi",
    "Syrian",
    "Yemeni",
  ]),
  family("african", "African", "African", [
    "Egyptian",
    "Egyptian-inspired",
    "Ethiopian",
    "Ethiopian-inspired",
    "Moroccan",
    "Moroccan-inspired",
    "Nigerian",
    "North African",
    "North African-inspired",
    "South African",
    "Southern African-inspired",
    "Tunisian",
    "West African-inspired",
  ]),
  family("indian-south-asian", "Indian & South Asian", "South Asian", [
    "Bangladeshi",
    "Bengali Indian",
    "Goan Indian",
    "Gujarati Indian",
    "Hyderabadi Indian",
    "Indian",
    "Indian-inspired",
    "Kerala Indian",
    "Lucknowi Indian",
    "North Indian",
    "Pakistani",
    "Punjabi Indian",
    "Rajasthani Indian",
    "South Indian",
    "Sri Lankan",
    "Tamil Indian",
  ]),
  family("chinese", "Chinese", "Chinese", [
    "Beijing Chinese",
    "Cantonese Chinese",
    "Chinese",
    "Chinese-inspired",
    "Chinese-American",
    "Dongbei Chinese",
    "Hunan Chinese",
    "Lanzhou Chinese",
    "Shanghai Chinese",
    "Sichuan Chinese",
    "Xi'an Chinese",
    "Yunnan Chinese",
  ]),
  family("taiwanese", "Taiwanese", "Taiwanese", ["Taiwanese"]),
  family("japanese", "Japanese", "Japanese", ["Japanese", "Japanese-inspired"]),
  family("korean", "Korean", "Korean", ["Korean", "Korean-inspired"]),
  family("thai", "Thai", "Thai", ["Northern Thai", "Thai", "Thai-inspired"]),
  family("vietnamese", "Vietnamese", "Vietnamese", ["Vietnamese", "Vietnamese-inspired"]),
  family("southeast-asian", "Southeast Asian", "Southeast Asian", [
    "Filipino",
    "Filipino-inspired",
    "Indonesian",
    "Indonesian-inspired",
    "Malaysian",
    "Southeast Asian-inspired",
    "Singaporean",
  ]),
  family("australian", "Australian", "Australian", ["Australian"]),
] as const;

const familyById = new Map(CUISINE_FAMILIES.map((item) => [item.id, item]));
const familyByCuisine = new Map<string, CuisineFamily>();

for (const item of CUISINE_FAMILIES) {
  for (const cuisine of item.cuisines) {
    if (familyByCuisine.has(cuisine)) {
      throw new Error(`Cuisine ${cuisine} belongs to more than one family.`);
    }
    familyByCuisine.set(cuisine, item);
  }
}

export function getCuisineFamily(id: CuisineFamilyId): CuisineFamily | null {
  return familyById.get(id) ?? null;
}

export function getCuisineFamilyForCuisine(
  cuisine: string,
): CuisineFamily | null {
  return familyByCuisine.get(cuisine) ?? null;
}

export function getCuisineFamilyForFilterValue(
  value: string,
): CuisineFamily | null {
  return (
    CUISINE_FAMILIES.find(
      ({ label, shortLabel }) => label === value || shortLabel === value,
    ) ?? getCuisineFamilyForCuisine(value)
  );
}

export function getSubcuisinesForFamily(id: CuisineFamilyId): string[] {
  const item = getCuisineFamily(id);
  return item ? [...item.cuisines].sort((a, b) => a.localeCompare(b)) : [];
}

export function cuisineMatchesFamily(
  cuisine: string | null | undefined,
  id: CuisineFamilyId,
): boolean {
  return cuisine ? getCuisineFamilyForCuisine(cuisine)?.id === id : false;
}
