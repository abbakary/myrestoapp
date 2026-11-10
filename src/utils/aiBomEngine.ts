import { Ingredient, Recipe, RecipeIngredient, AiParsedBOMResult, AiParsedLineItem, BomAuditLog } from '../types/restaurant';

// Tanzanian Local Synonym & Unit Dictionary for Restaurant ERP
export interface LocalIngredientMapping {
  canonicalName: string;
  category: 'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages';
  purchaseUnit: string;
  consumptionUnit: 'grams' | 'ml' | 'pcs' | 'bottle';
  conversionRatio: number;
  typicalYieldPercentage: number;
  typicalCostTzs: number;
  synonyms: string[];
}

export const TANZANIAN_SYNONYM_DICTIONARY: LocalIngredientMapping[] = [
  {
    canonicalName: 'Red Cooking Onions',
    category: 'Produce',
    purchaseUnit: '25kg Bag',
    consumptionUnit: 'grams',
    conversionRatio: 25000,
    typicalYieldPercentage: 90,
    typicalCostTzs: 45000,
    synonyms: ['onion', 'onions', 'vitunguu', 'kitunguu', 'kitunguu maji', 'red onion', 'red onions', 'vitunguu maji'],
  },
  {
    canonicalName: 'Irish Potatoes (Mbeya Highgrade)',
    category: 'Produce',
    purchaseUnit: '50kg Sack',
    consumptionUnit: 'grams',
    conversionRatio: 50000,
    typicalYieldPercentage: 85,
    typicalCostTzs: 90000,
    synonyms: ['potato', 'potatoes', 'viazi', 'kiazi', 'viazi mviringo', 'mbeya potatoes', 'viazi vya mbeya', 'chips', 'batata'],
  },
  {
    canonicalName: 'Farm Fresh Organic Eggs',
    category: 'Produce',
    purchaseUnit: 'Tray (30 pcs)',
    consumptionUnit: 'pcs',
    conversionRatio: 30,
    typicalYieldPercentage: 100,
    typicalCostTzs: 12000,
    synonyms: ['egg', 'eggs', 'mayai', 'yai', 'mayai ya kienyeji', 'mayai ya kisasa', 'fresh eggs', 'tray ya mayai'],
  },
  {
    canonicalName: 'Pure Sunflower Cooking Oil',
    category: 'Oils & Dairy',
    purchaseUnit: '20L Jerrycan',
    consumptionUnit: 'ml',
    conversionRatio: 20000,
    typicalYieldPercentage: 100,
    typicalCostTzs: 70000,
    synonyms: ['cooking oil', 'oil', 'sunflower oil', 'mafuta', 'mafuta ya kupikia', 'mafuta ya alizeti', 'kapa', 'jerrycan oil'],
  },
  {
    canonicalName: 'Atlantic Salmon Fillet Cut',
    category: 'Meat & Seafood',
    purchaseUnit: '10kg Box',
    consumptionUnit: 'grams',
    conversionRatio: 10000,
    typicalYieldPercentage: 95,
    typicalCostTzs: 380000,
    synonyms: ['salmon', 'salmon fillet', 'samaki salmon', 'salmon steak', 'fresh salmon'],
  },
  {
    canonicalName: 'Prime Beef Tenderloin',
    category: 'Meat & Seafood',
    purchaseUnit: '20kg Pack',
    consumptionUnit: 'grams',
    conversionRatio: 20000,
    typicalYieldPercentage: 85,
    typicalCostTzs: 240000,
    synonyms: ['beef', 'meat', 'nyama', 'nyama ya ng\'ombe', 'ng\'ombe', 'tenderloin', 'fillet ya nyama', 'steak', 'nyama ya mishikaki'],
  },
  {
    canonicalName: 'Kilwa Jumbo Tiger Prawns',
    category: 'Meat & Seafood',
    purchaseUnit: '5kg Pack',
    consumptionUnit: 'grams',
    conversionRatio: 5000,
    typicalYieldPercentage: 65,
    typicalCostTzs: 160000,
    synonyms: ['prawns', 'shrimp', 'kamba', 'kamba koche', 'tiger prawns', 'jumbo prawns', 'fresh shrimp'],
  },
  {
    canonicalName: 'Fresh Roma Tomatoes',
    category: 'Produce',
    purchaseUnit: '20kg Crate (Tenga)',
    consumptionUnit: 'grams',
    conversionRatio: 20000,
    typicalYieldPercentage: 92,
    typicalCostTzs: 35000,
    synonyms: ['tomato', 'tomatoes', 'nyanya', 'nyanya fresh', 'nyanya za kienyeji', 'fresh tomatoes', 'nyanya maji'],
  },
  {
    canonicalName: 'Kyela Pure Basmati Rice',
    category: 'Dry Goods',
    purchaseUnit: '25kg Bag',
    consumptionUnit: 'grams',
    conversionRatio: 25000,
    typicalYieldPercentage: 100,
    typicalCostTzs: 85000,
    synonyms: ['rice', 'basmati', 'mchele', 'mchele wa kyela', 'kyela rice', 'wali', 'biryani rice', 'pishi ya wali'],
  },
  {
    canonicalName: 'Farm Broiler Whole Chicken',
    category: 'Meat & Seafood',
    purchaseUnit: 'Pack of 10 Birds',
    consumptionUnit: 'grams',
    conversionRatio: 12000, // 10 birds ~ 12kg
    typicalYieldPercentage: 72,
    typicalCostTzs: 95000,
    synonyms: ['chicken', 'kuku', 'kuku wa kienyeji', 'kuku wa kizungu', 'broiler', 'kuku nusu', 'kuku mzima'],
  },
  {
    canonicalName: 'Fresh Garlic Bulbs',
    category: 'Produce',
    purchaseUnit: '5kg Net',
    consumptionUnit: 'grams',
    conversionRatio: 5000,
    typicalYieldPercentage: 88,
    typicalCostTzs: 35000,
    synonyms: ['garlic', 'thomu', 'saumu', 'kitunguu saumu', 'kitunguu thomu'],
  },
  {
    canonicalName: 'Fresh Ginger Root',
    category: 'Produce',
    purchaseUnit: '5kg Sack',
    consumptionUnit: 'grams',
    conversionRatio: 5000,
    typicalYieldPercentage: 85,
    typicalCostTzs: 25000,
    synonyms: ['ginger', 'tangawizi', 'tangawizi fresh'],
  },
  {
    canonicalName: 'Iodized Table Salt',
    category: 'Dry Goods',
    purchaseUnit: '10kg Bale',
    consumptionUnit: 'grams',
    conversionRatio: 10000,
    typicalYieldPercentage: 100,
    typicalCostTzs: 9000,
    synonyms: ['salt', 'chumvi', 'chumvi ya mawe', 'table salt'],
  },
  {
    canonicalName: 'Pilau / Biryani Mixed Spices',
    category: 'Dry Goods',
    purchaseUnit: '1kg Pack',
    consumptionUnit: 'grams',
    conversionRatio: 1000,
    typicalYieldPercentage: 100,
    typicalCostTzs: 18000,
    synonyms: ['spices', 'pilau masala', 'biryani masala', 'viungo', 'iliki', 'mdalasini', 'karafuu', 'masala'],
  },
];

// Local unit conversion rules to base units (g, ml, pcs)
export const UNIT_CONVERSIONS: Record<string, { multiplier: number; baseUnit: 'grams' | 'ml' | 'pcs' }> = {
  // Weight
  kg: { multiplier: 1000, baseUnit: 'grams' },
  kilo: { multiplier: 1000, baseUnit: 'grams' },
  kilos: { multiplier: 1000, baseUnit: 'grams' },
  g: { multiplier: 1, baseUnit: 'grams' },
  gram: { multiplier: 1, baseUnit: 'grams' },
  grams: { multiplier: 1, baseUnit: 'grams' },
  gramu: { multiplier: 1, baseUnit: 'grams' },
  'nusu kilo': { multiplier: 500, baseUnit: 'grams' },
  'robo kilo': { multiplier: 250, baseUnit: 'grams' },
  debe: { multiplier: 16000, baseUnit: 'grams' }, // 1 debe of grain/flour ~ 16kg
  gunia: { multiplier: 50000, baseUnit: 'grams' },
  sack: { multiplier: 50000, baseUnit: 'grams' },
  fungu: { multiplier: 250, baseUnit: 'grams' }, // market bunch ~ 250g
  bunch: { multiplier: 250, baseUnit: 'grams' },
  kifungu: { multiplier: 250, baseUnit: 'grams' },

  // Volume
  l: { multiplier: 1000, baseUnit: 'ml' },
  liter: { multiplier: 1000, baseUnit: 'ml' },
  liters: { multiplier: 1000, baseUnit: 'ml' },
  lita: { multiplier: 1000, baseUnit: 'ml' },
  ml: { multiplier: 1, baseUnit: 'ml' },
  mililita: { multiplier: 1, baseUnit: 'ml' },
  cup: { multiplier: 250, baseUnit: 'ml' },
  kikombe: { multiplier: 250, baseUnit: 'ml' },
  tbsp: { multiplier: 15, baseUnit: 'ml' },
  spoon: { multiplier: 15, baseUnit: 'ml' },
  kijiko: { multiplier: 15, baseUnit: 'ml' },
  tsp: { multiplier: 5, baseUnit: 'ml' },
  'kijiko kidogo': { multiplier: 5, baseUnit: 'ml' },

  // Count / Discrete
  pc: { multiplier: 1, baseUnit: 'pcs' },
  pcs: { multiplier: 1, baseUnit: 'pcs' },
  piece: { multiplier: 1, baseUnit: 'pcs' },
  pieces: { multiplier: 1, baseUnit: 'pcs' },
  tray: { multiplier: 30, baseUnit: 'pcs' },
  vipande: { multiplier: 1, baseUnit: 'pcs' },
  namba: { multiplier: 1, baseUnit: 'pcs' },
  chupa: { multiplier: 1, baseUnit: 'pcs' },
  bottle: { multiplier: 1, baseUnit: 'pcs' },
};

/**
 * Deterministic Ingredient Catalog Matcher
 * Compares raw extracted ingredient name against live catalogue & local synonym dictionary
 */
export function matchIngredient(
  rawName: string,
  catalogue: Ingredient[]
): {
  matchedId: string | null;
  matchedName: string;
  confidence: number;
  typicalYield: number;
  consumptionUnit: string;
} {
  const clean = rawName.toLowerCase().trim();

  // 1. Direct exact match in current live inventory catalogue
  const exact = catalogue.find((ing) => ing.name.toLowerCase() === clean);
  if (exact) {
    const localRule = TANZANIAN_SYNONYM_DICTIONARY.find((item) =>
      item.synonyms.some((s) => clean.includes(s))
    );
    return {
      matchedId: exact.id,
      matchedName: exact.name,
      confidence: 99,
      typicalYield: localRule?.typicalYieldPercentage ?? 100,
      consumptionUnit: exact.consumptionUnit,
    };
  }

  // 2. Substring / fuzzy match in live inventory catalogue
  for (const ing of catalogue) {
    const ingNameLower = ing.name.toLowerCase();
    if (ingNameLower.includes(clean) || clean.includes(ingNameLower)) {
      const localRule = TANZANIAN_SYNONYM_DICTIONARY.find((item) =>
        item.synonyms.some((s) => clean.includes(s) || ingNameLower.includes(s))
      );
      return {
        matchedId: ing.id,
        matchedName: ing.name,
        confidence: 94,
        typicalYield: localRule?.typicalYieldPercentage ?? 100,
        consumptionUnit: ing.consumptionUnit,
      };
    }
  }

  // 3. Synonym dictionary matching (Swahili / English local dialect)
  for (const dictItem of TANZANIAN_SYNONYM_DICTIONARY) {
    const matchedSynonym = dictItem.synonyms.find((syn) => {
      // Word boundary match or partial match
      const regex = new RegExp(`\\b${syn}\\b`, 'i');
      return regex.test(clean) || clean.includes(syn);
    });

    if (matchedSynonym) {
      // Find if this canonical item exists in the user's catalogue
      const catalogMatch = catalogue.find((ing) => {
        const catNameLower = ing.name.toLowerCase();
        return (
          catNameLower.includes(dictItem.canonicalName.toLowerCase()) ||
          dictItem.synonyms.some((s) => catNameLower.includes(s))
        );
      });

      if (catalogMatch) {
        return {
          matchedId: catalogMatch.id,
          matchedName: catalogMatch.name,
          confidence: 92,
          typicalYield: dictItem.typicalYieldPercentage,
          consumptionUnit: catalogMatch.consumptionUnit,
        };
      } else {
        // Known ingredient in dictionary, but not yet created in catalogue
        return {
          matchedId: null,
          matchedName: `${dictItem.canonicalName} (New suggested)`,
          confidence: 88,
          typicalYield: dictItem.typicalYieldPercentage,
          consumptionUnit: dictItem.consumptionUnit,
        };
      }
    }
  }

  // 4. Fallback: No confident match
  return {
    matchedId: null,
    matchedName: rawName,
    confidence: 45,
    typicalYield: 100,
    consumptionUnit: 'grams',
  };
}

/**
 * Deterministic Unit Normalizer
 * Converts user's raw unit (e.g., "2kg", "150ml", "3 onions", "1 debe") into base consumption unit
 */
export function normalizeQuantityAndUnit(
  rawQty: number,
  rawUnit: string,
  targetBaseUnit: string = 'grams'
): { baseQty: number; normalizedUnit: string } {
  const unitClean = rawUnit.toLowerCase().trim();

  // If unit directly equals targetBaseUnit
  if (unitClean === targetBaseUnit.toLowerCase()) {
    return { baseQty: rawQty, normalizedUnit: targetBaseUnit };
  }

  // Look up conversion table
  if (UNIT_CONVERSIONS[unitClean]) {
    const conv = UNIT_CONVERSIONS[unitClean];
    return {
      baseQty: rawQty * conv.multiplier,
      normalizedUnit: conv.baseUnit,
    };
  }

  // Piece or count without unit (e.g. "3 onions", "2 eggs")
  if (!unitClean || unitClean === 'pcs' || unitClean === 'piece' || unitClean === 'pieces' || unitClean === 'vipande') {
    return { baseQty: rawQty, normalizedUnit: 'pcs' };
  }

  return { baseQty: rawQty, normalizedUnit: targetBaseUnit };
}

/**
 * Extract portions count from messy chef text (e.g. "10 portions", "sahani 4", "batch for 8")
 */
export function extractPortions(text: string): number {
  const portionsMatch = text.match(/(?:for\s+|makes\s+|serving\s+|batch\s+of\s+|sahani\s+|portions?\s*:?\s*)(\d+)/i) ||
    text.match(/(\d+)\s*(?:portions?|servings?|plates?|sahani)/i);

  if (portionsMatch && portionsMatch[1]) {
    const parsed = parseInt(portionsMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1; // Default to single plate
}

/**
 * Deterministic Anomaly Checker
 * Flags anomalies before human review:
 * - Suspicious unit conversions
 * - Extreme salt/spice quantities
 * - Missing ingredients
 * - High food cost %
 */
export function detectAnomalies(
  line: {
    rawName: string;
    matchedName: string;
    qtyPerPlate: number;
    baseUnit: string;
    confidence: number;
  }
): { isAnomaly: boolean; reason?: string } {
  const lowerName = (line.matchedName || line.rawName).toLowerCase();

  // Salt anomaly
  if (lowerName.includes('salt') || lowerName.includes('chumvi')) {
    if (line.baseUnit === 'grams' && line.qtyPerPlate > 15) {
      return {
        isAnomaly: true,
        reason: `Anomaly: Salt quantity (${line.qtyPerPlate}g) per plate is dangerously high. Normal is 2-4g.`,
      };
    }
  }

  // Cooking oil anomaly
  if (lowerName.includes('oil') || lowerName.includes('mafuta')) {
    if (line.baseUnit === 'ml' && line.qtyPerPlate > 150) {
      return {
        isAnomaly: true,
        reason: `Anomaly: Oil quantity (${line.qtyPerPlate}ml) per plate exceeds standard kitchen threshold (max 80-100ml).`,
      };
    }
  }

  // Spices anomaly
  if (lowerName.includes('spice') || lowerName.includes('masala') || lowerName.includes('pilau')) {
    if (line.baseUnit === 'grams' && line.qtyPerPlate > 35) {
      return {
        isAnomaly: true,
        reason: `Anomaly: Spices quantity (${line.qtyPerPlate}g) per portion is unusually heavy.`,
      };
    }
  }

  // Low confidence match
  if (line.confidence < 70) {
    return {
      isAnomaly: true,
      reason: `Low match confidence (${line.confidence}%). Please verify or map to catalogue manually.`,
    };
  }

  return { isAnomaly: false };
}

/**
 * DETERMINISTIC CALCULATION ENGINE (THE SOURCE OF TRUTH)
 * Code calculates, NOT AI.
 * Computes:
 * - Portion scaling to 1 plate
 * - Effective gross quantity considering kitchen yield % (e.g. whole fish 55%, peeled onions 90%)
 * - Exact ingredient line cost using Master Data unit cost
 * - Total plate COGS, Gross Margin, and Food Cost %
 */
export function calculateBOMCostRollup(
  lines: AiParsedLineItem[],
  portions: number,
  sellingPrice: number,
  catalogue: Ingredient[]
): {
  linesWithCost: (AiParsedLineItem & {
    unitCost: number;
    qtyPerPlate: number;
    effectiveQtyPerPlate: number;
    lineCost: number;
  })[];
  totalPlateCost: number;
  grossContribution: number;
  foodCostPercentage: number;
  anomalies: string[];
} {
  const normalizedPortions = Math.max(1, portions);
  const anomalies: string[] = [];

  const linesWithCost = lines.map((line) => {
    // 1. Portion scaling to 1 plate
    const qtyPerPlate = line.normalizedBaseQuantity; // already normalized to 1 plate, or scale:
    const yieldFactor = Math.max(0.1, (line.typicalYieldPercentage || 100) / 100);
    // Effective gross quantity required from raw stock to deliver net plate quantity:
    // e.g. 200g net fish / 0.55 yield = 363.6g gross whole fish raw material consumed
    const effectiveQtyPerPlate = Math.round(qtyPerPlate / yieldFactor);

    // 2. Deterministic unit cost lookup from Master Data
    let unitCost = 0;
    if (line.matchedIngredientId) {
      const ing = catalogue.find((i) => i.id === line.matchedIngredientId);
      if (ing && ing.conversionRatio > 0) {
        unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
      }
    } else {
      // Check dictionary typical cost
      const dictMatch = TANZANIAN_SYNONYM_DICTIONARY.find(
        (d) => d.canonicalName.toLowerCase() === line.matchedIngredientName.toLowerCase()
      );
      if (dictMatch && dictMatch.conversionRatio > 0) {
        unitCost = dictMatch.typicalCostTzs / dictMatch.conversionRatio;
      }
    }

    // 3. Exact deterministic math: effectiveQty * unitCost
    const lineCost = Math.round(effectiveQtyPerPlate * unitCost);

    // 4. Anomaly check
    const anomalyCheck = detectAnomalies({
      rawName: line.rawIngredientName,
      matchedName: line.matchedIngredientName,
      qtyPerPlate: effectiveQtyPerPlate,
      baseUnit: line.baseUnit,
      confidence: line.confidence,
    });

    if (anomalyCheck.isAnomaly && anomalyCheck.reason) {
      anomalies.push(anomalyCheck.reason);
    }

    return {
      ...line,
      isAnomaly: anomalyCheck.isAnomaly || line.isAnomaly,
      anomalyReason: anomalyCheck.reason || line.anomalyReason,
      unitCost,
      qtyPerPlate,
      effectiveQtyPerPlate,
      lineCost,
    };
  });

  const totalPlateCost = linesWithCost.reduce((sum, item) => sum + item.lineCost, 0);
  const grossContribution = Math.max(0, sellingPrice - totalPlateCost);
  const foodCostPercentage = sellingPrice > 0 ? (totalPlateCost / sellingPrice) * 100 : 0;

  if (sellingPrice > 0 && foodCostPercentage > 45) {
    anomalies.push(
      `High Food Cost % (${foodCostPercentage.toFixed(1)}%): Exceeds target 35% threshold. Consider revising portion sizes or increasing selling price.`
    );
  }

  return {
    linesWithCost,
    totalPlateCost,
    grossContribution,
    foodCostPercentage,
    anomalies,
  };
}

/**
 * Fast Client-Side Deterministic Parser & Tanzanian NLP Tokenizer
 * Parses messy raw text instantly even without server API or offline.
 */
export function parseRecipeTextLocally(
  text: string,
  catalogue: Ingredient[]
): AiParsedBOMResult {
  const rawClean = text.trim();
  const portions = extractPortions(rawClean);

  // Extract Recipe Name
  let recipeName = 'Custom Recipe';
  const nameMatch = rawClean.match(/^([^,:\n]+)/);
  if (nameMatch && nameMatch[1]) {
    recipeName = nameMatch[1].replace(/(?:recipe|bom|ingredients|portions?|\d+)/gi, '').trim();
    if (!recipeName) recipeName = 'Custom Chef Recipe';
  }

  // Split into lines or comma segments
  // e.g. "Chicken biryani, 10 portions: 2kg chicken, 1kg rice, 3 onions, 200ml oil, spices"
  const bodyText = rawClean.includes(':') ? rawClean.split(':')[1] : rawClean;
  const segments = bodyText
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !s.match(/^portions?/i));

  const parsedLines: AiParsedLineItem[] = [];

  for (const seg of segments) {
    // Regex to capture quantity, unit, and item name
    // e.g. "2kg chicken", "150ml oil", "3 onions", "nusu kilo nyama", "viazi kilo 1"
    let qty = 1;
    let unit = 'pcs';
    let itemName = seg;

    // Pattern 1: Swahili reverse order: "viazi kilo 1", "nyama kilo 2", "mafuta lita 1"
    const swahiliReverse = seg.match(/^([a-zA-Z\s']+)\s+(kilo|lita|debe|gunia|tray|fungu)\s+(\d+(?:\.\d+)?)/i);
    if (swahiliReverse) {
      itemName = swahiliReverse[1].trim();
      unit = swahiliReverse[2].trim();
      qty = parseFloat(swahiliReverse[3]);
    } else {
      // Pattern 2: Standard "2.5 kg chicken" or "200ml cooking oil"
      const stdMatch = seg.match(/^(\d+(?:\.\d+)?|\d+\/\d+)?\s*([a-zA-Z]+)?\s+(.+)$/i);
      if (stdMatch) {
        if (stdMatch[1]) {
          qty = parseFloat(stdMatch[1]);
        }
        if (stdMatch[2] && UNIT_CONVERSIONS[stdMatch[2].toLowerCase()]) {
          unit = stdMatch[2];
          itemName = stdMatch[3].trim();
        } else if (stdMatch[2]) {
          // might be part of name or unit
          if (['nusu', 'robo'].includes(stdMatch[2].toLowerCase())) {
            unit = `${stdMatch[2]} kilo`;
            itemName = stdMatch[3].trim();
          } else {
            itemName = `${stdMatch[2]} ${stdMatch[3]}`.trim();
          }
        } else {
          itemName = stdMatch[3]?.trim() || seg;
        }
      }
    }

    // Match against catalogue & dictionary
    const match = matchIngredient(itemName, catalogue);

    // Normalize quantity to base unit (grams/ml/pcs)
    const normalized = normalizeQuantityAndUnit(qty, unit, match.consumptionUnit);
    // Scale batch quantity to single plate portion
    const normalizedPerPlate = Math.round((normalized.baseQty / portions) * 10) / 10;

    const lineAnomaly = detectAnomalies({
      rawName: itemName,
      matchedName: match.matchedName,
      qtyPerPlate: normalizedPerPlate,
      baseUnit: normalized.normalizedUnit,
      confidence: match.confidence,
    });

    parsedLines.push({
      rawText: seg,
      rawIngredientName: itemName,
      matchedIngredientId: match.matchedId,
      matchedIngredientName: match.matchedName,
      confidence: match.confidence,
      quantityPerBatch: qty,
      rawUnit: unit,
      normalizedBaseQuantity: normalizedPerPlate,
      baseUnit: normalized.normalizedUnit,
      typicalYieldPercentage: match.typicalYield,
      notes: match.matchedId ? `Matched to catalog item "${match.matchedName}"` : `New suggested item "${itemName}"`,
      isAnomaly: lineAnomaly.isAnomaly,
      anomalyReason: lineAnomaly.reason,
    });
  }

  return {
    recipeName,
    batchPortions: portions,
    lines: parsedLines,
    anomalies: parsedLines.filter((l) => l.isAnomaly).map((l) => l.anomalyReason || 'Anomaly detected'),
  };
}

/**
 * Call Server-Side AI endpoint or fallback to deterministic parser
 */
export async function parseRecipeWithAI(
  inputText: string,
  catalogue: Ingredient[]
): Promise<AiParsedBOMResult> {
  try {
    const response = await fetch('/api/ai/parse-recipe-bom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: inputText,
        catalogue: catalogue.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          consumptionUnit: c.consumptionUnit,
          purchaseUnit: c.purchaseUnit,
          conversionRatio: c.conversionRatio,
          costPerPurchaseUnit: c.costPerPurchaseUnit,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.lines && data.lines.length > 0) {
        return data as AiParsedBOMResult;
      }
    }
  } catch (err) {
    console.warn('Backend AI endpoint unreachable, using robust local NLP BOM engine:', err);
  }

  // Graceful fallback to deterministic local engine
  return parseRecipeTextLocally(inputText, catalogue);
}

/**
 * Auto-fill Catalogue Form Helper
 * Suggests category, purchase packaging, consumption unit, conversion ratio, and cost
 */
export function suggestCatalogueItemDetails(name: string): {
  category: 'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages';
  purchaseUnit: string;
  consumptionUnit: string;
  conversionRatio: number;
  typicalCost: number;
  supplier: string;
} {
  const clean = name.toLowerCase().trim();

  // Check synonym dictionary first
  for (const item of TANZANIAN_SYNONYM_DICTIONARY) {
    if (
      item.canonicalName.toLowerCase().includes(clean) ||
      clean.includes(item.canonicalName.toLowerCase()) ||
      item.synonyms.some((s) => clean.includes(s))
    ) {
      return {
        category: item.category,
        purchaseUnit: item.purchaseUnit,
        consumptionUnit: item.consumptionUnit,
        conversionRatio: item.conversionRatio,
        typicalCost: item.typicalCostTzs,
        supplier:
          item.category === 'Produce'
            ? 'Kariakoo Wholesale Market'
            : item.category === 'Meat & Seafood'
            ? 'Kongwa Butchery / Ocean Coldstore'
            : item.category === 'Oils & Dairy'
            ? 'Kapa Oil Refineries'
            : 'Dar Distribution Ltd',
      };
    }
  }

  // Generic heuristics for local items
  if (clean.includes('oil') || clean.includes('mafuta') || clean.includes('ghee') || clean.includes('butter')) {
    return {
      category: 'Oils & Dairy',
      purchaseUnit: '20L Jerrycan',
      consumptionUnit: 'ml',
      conversionRatio: 20000,
      typicalCost: 75000,
      supplier: 'Kapa Oil Refineries Ltd',
    };
  }

  if (clean.includes('meat') || clean.includes('nyama') || clean.includes('fish') || clean.includes('samaki') || clean.includes('chicken') || clean.includes('kuku')) {
    return {
      category: 'Meat & Seafood',
      purchaseUnit: '10kg Box',
      consumptionUnit: 'grams',
      conversionRatio: 10000,
      typicalCost: 110000,
      supplier: 'Kibaha Prime Meats Ltd',
    };
  }

  if (clean.includes('soda') || clean.includes('juice') || clean.includes('water') || clean.includes('maji') || clean.includes('beer')) {
    return {
      category: 'Beverages',
      purchaseUnit: 'Crate (24 Bottles)',
      consumptionUnit: 'bottle',
      conversionRatio: 24,
      typicalCost: 22000,
      supplier: 'Dar Bottlers Co.',
    };
  }

  // Default Dry Goods
  return {
    category: 'Dry Goods',
    purchaseUnit: '25kg Bag',
    consumptionUnit: 'grams',
    conversionRatio: 25000,
    typicalCost: 65000,
    supplier: 'Kariakoo Grain & Spice Wholesalers',
  };
}
