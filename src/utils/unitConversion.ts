export type BaseConsumptionUnit = 'grams' | 'ml' | 'pcs' | 'bottle' | 'portions';

export function normalizeUnitName(unit: string): string {
  const u = (unit || '').trim().toLowerCase();
  if (['g', 'gram', 'grams', 'gramu'].includes(u)) return 'g';
  if (['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'].includes(u)) return 'kg';
  if (['ml', 'milliliter', 'milliliters', 'mililita'].includes(u)) return 'ml';
  if (['l', 'ltr', 'liter', 'liters', 'litre', 'litres', 'lita'].includes(u)) return 'L';
  if (['pc', 'pcs', 'piece', 'pieces', 'vipande'].includes(u)) return 'pcs';
  if (['bottle', 'bottles', 'chupa'].includes(u)) return 'bottle';
  if (['portion', 'portions', 'serving', 'servings', 'plate', 'plates'].includes(u)) return 'portions';
  return unit || 'pcs';
}

/**
 * Converts a quantity from one unit to a target base consumption unit.
 * Supports weight (kg <-> g), volume (L <-> ml), and discrete units (pcs, bottle, portions).
 */
export function convertQuantity(qty: number, fromUnit: string, toUnit: string): number {
  const from = normalizeUnitName(fromUnit);
  const to = normalizeUnitName(toUnit);
  if (from === to) return qty;

  // Weight conversions
  if (from === 'kg' && to === 'g') return qty * 1000;
  if (from === 'g' && to === 'kg') return qty / 1000;

  // Volume conversions
  if (from === 'L' && to === 'ml') return qty * 1000;
  if (from === 'ml' && to === 'L') return qty / 1000;

  return qty;
}

/**
 * Returns supported entry units for a given ingredient consumption unit.
 */
export function getCompatibleUnits(consumptionUnit: string): string[] {
  const norm = normalizeUnitName(consumptionUnit);
  if (norm === 'g') return ['g', 'kg'];
  if (norm === 'ml') return ['ml', 'L'];
  if (norm === 'bottle') return ['bottle', 'pcs'];
  if (norm === 'portions') return ['portions'];
  return [consumptionUnit || 'pcs'];
}

/**
 * Formats a base consumption quantity into a clean dual/readable string.
 * Example: 19200 grams -> "19,200 g (19.2 kg)"
 */
export function formatScaledQuantity(qtyInBase: number, baseUnit: string): {
  primary: string;
  secondary?: string;
} {
  const norm = normalizeUnitName(baseUnit);
  const rounded = Math.round(qtyInBase * 100) / 100;

  if (norm === 'g') {
    const primary = `${rounded.toLocaleString()} g`;
    const secondary = rounded >= 1000 ? `${(rounded / 1000).toFixed(2)} kg` : undefined;
    return { primary, secondary };
  }
  if (norm === 'ml') {
    const primary = `${rounded.toLocaleString()} ml`;
    const secondary = rounded >= 1000 ? `${(rounded / 1000).toFixed(2)} L` : undefined;
    return { primary, secondary };
  }
  return { primary: `${rounded.toLocaleString()} ${baseUnit}` };
}

/**
 * Parses a human-entered purchase packaging string (e.g. "25kg Bag", "400ml Tin", "12x400ml Case",
 * "20L Jerrycan", "Tray (30 pcs)", "Crate 24 Bottles") into base consumptionUnit and conversionRatio.
 */
export function parsePackagingSpec(packagingText: string): {
  consumptionUnit: 'grams' | 'ml' | 'pcs' | 'bottle';
  conversionRatio: number;
  detected: boolean;
} | null {
  const text = (packagingText || '').trim().toLowerCase();
  if (!text) return null;

  // Case/Multipack format e.g. "12x400ml", "6 x 1L", "24x500g"
  const multiMatch = text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|g|gram|grams|ml|l|ltr|liter|liters|litre|litres|pcs|pc|pieces|bottle|bottles)\b/);
  if (multiMatch) {
    const packCount = parseFloat(multiMatch[1]);
    const unitQty = parseFloat(multiMatch[2]);
    const rawUnit = multiMatch[3];
    if (['kg', 'kilo', 'kilos'].includes(rawUnit)) {
      return { consumptionUnit: 'grams', conversionRatio: Math.round(packCount * unitQty * 1000), detected: true };
    }
    if (['g', 'gram', 'grams'].includes(rawUnit)) {
      return { consumptionUnit: 'grams', conversionRatio: Math.round(packCount * unitQty), detected: true };
    }
    if (['l', 'ltr', 'liter', 'liters', 'litre', 'litres'].includes(rawUnit)) {
      return { consumptionUnit: 'ml', conversionRatio: Math.round(packCount * unitQty * 1000), detected: true };
    }
    if (rawUnit === 'ml') {
      return { consumptionUnit: 'ml', conversionRatio: Math.round(packCount * unitQty), detected: true };
    }
    if (['bottle', 'bottles'].includes(rawUnit)) {
      return { consumptionUnit: 'bottle', conversionRatio: Math.round(packCount * unitQty), detected: true };
    }
    return { consumptionUnit: 'pcs', conversionRatio: Math.round(packCount * unitQty), detected: true };
  }

  // Single weight/volume/count e.g. "25kg Bag", "400ml Tin", "1.5L Bottle", "Tray (30 pcs)"
  const weightKg = text.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|kilogram|kilograms)\b/);
  if (weightKg) {
    return { consumptionUnit: 'grams', conversionRatio: Math.round(parseFloat(weightKg[1]) * 1000), detected: true };
  }
  const weightG = text.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams)\b/);
  if (weightG) {
    return { consumptionUnit: 'grams', conversionRatio: Math.round(parseFloat(weightG[1])), detected: true };
  }
  const volL = text.match(/(\d+(?:\.\d+)?)\s*(l|ltr|liter|liters|litre|litres)\b/);
  if (volL) {
    return { consumptionUnit: 'ml', conversionRatio: Math.round(parseFloat(volL[1]) * 1000), detected: true };
  }
  const volMl = text.match(/(\d+(?:\.\d+)?)\s*(ml|milliliter|milliliters)\b/);
  if (volMl) {
    return { consumptionUnit: 'ml', conversionRatio: Math.round(parseFloat(volMl[1])), detected: true };
  }
  const bottleCount = text.match(/(\d+)\s*(bottle|bottles|chupa)\b/);
  if (bottleCount) {
    return { consumptionUnit: 'bottle', conversionRatio: Math.max(1, parseInt(bottleCount[1], 10)), detected: true };
  }
  const pcsCount = text.match(/(\d+)\s*(pc|pcs|piece|pieces|eggs|tray)\b/);
  if (pcsCount) {
    return { consumptionUnit: 'pcs', conversionRatio: Math.max(1, parseInt(pcsCount[1], 10)), detected: true };
  }

  return null;
}

export interface CatalogueSuggestion {
  category: 'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages';
  purchaseUnit: string;
  consumptionUnit: 'grams' | 'ml' | 'pcs' | 'bottle';
  conversionRatio: number;
  typicalCost: number;
  supplier: string;
  matchedLabel: string;
  isExactPreset: boolean;
  defaultOpeningPacks: number;
  defaultPerPlateQty: number;
}

/**
 * Deterministic Packaging & Unit Preset Helper for new raw ingredients.
 * Recognizes packaging specs embedded in the name (e.g. "Coconut Milk 1L") as well as ingredient categories.
 */
export function suggestCatalogueItemDetails(name: string): CatalogueSuggestion {
  const clean = name.toLowerCase().trim();
  const inlineSpec = parsePackagingSpec(clean);

  // Coconut milk / tui / cream
  if (clean.includes('coconut') || clean.includes('tui')) {
    const ratio = inlineSpec?.consumptionUnit === 'ml' ? inlineSpec.conversionRatio : 400;
    const packName = inlineSpec ? `${ratio >= 1000 ? `${ratio / 1000}L Carton` : `${ratio}ml Can`}` : '400ml Can';
    const cost = ratio >= 1000 ? Math.round((ratio / 1000) * 6500) : 3500;
    return {
      category: 'Oils & Dairy',
      purchaseUnit: packName,
      consumptionUnit: 'ml',
      conversionRatio: ratio,
      typicalCost: cost,
      supplier: 'Pwani Coconut & Spice Co.',
      matchedLabel: 'Coconut Milk / Cream Preset',
      isExactPreset: true,
      defaultOpeningPacks: 10,
      defaultPerPlateQty: 50,
    };
  }

  // Milk, cream, yoghurt, ghee, butter, oil
  if (
    clean.includes('oil') ||
    clean.includes('mafuta') ||
    clean.includes('ghee') ||
    clean.includes('butter') ||
    clean.includes('yoghurt') ||
    clean.includes('milk') ||
    clean.includes('cream')
  ) {
    const isBulkOil = clean.includes('oil') || clean.includes('mafuta');
    const ratio = inlineSpec?.consumptionUnit === 'ml' ? inlineSpec.conversionRatio : isBulkOil ? 20000 : 1000;
    const packName = isBulkOil ? `${ratio / 1000}L Jerrycan` : `${ratio >= 1000 ? `${ratio / 1000}L Carton` : `${ratio}ml Pack`}`;
    const cost = isBulkOil ? Math.round((ratio / 1000) * 3500) : Math.round((ratio / 1000) * 4200);
    return {
      category: 'Oils & Dairy',
      purchaseUnit: packName,
      consumptionUnit: 'ml',
      conversionRatio: ratio,
      typicalCost: cost,
      supplier: isBulkOil ? 'Kapa Oil Refineries Ltd' : 'Tanga Fresh Dairy',
      matchedLabel: isBulkOil ? 'Cooking Oil Bulk Preset' : 'Dairy & Liquid Preset',
      isExactPreset: true,
      defaultOpeningPacks: isBulkOil ? 1 : 6,
      defaultPerPlateQty: isBulkOil ? 20 : 40,
    };
  }

  // Meat & Seafood
  if (
    clean.includes('beef') ||
    clean.includes('nyama') ||
    clean.includes('goat') ||
    clean.includes('mbuzi') ||
    clean.includes('lamb') ||
    clean.includes('fish') ||
    clean.includes('samaki') ||
    clean.includes('salmon') ||
    clean.includes('tuna') ||
    clean.includes('chicken') ||
    clean.includes('kuku') ||
    clean.includes('prawn') ||
    clean.includes('shrimp') ||
    clean.includes('calamari')
  ) {
    const ratio = inlineSpec?.consumptionUnit === 'grams' ? inlineSpec.conversionRatio : 10000;
    return {
      category: 'Meat & Seafood',
      purchaseUnit: `${ratio >= 1000 ? `${ratio / 1000}kg Box` : `${ratio}g Pack`}`,
      consumptionUnit: 'grams',
      conversionRatio: ratio,
      typicalCost: Math.round((ratio / 1000) * 11500),
      supplier: 'Kongwa Butchery & Coldstore',
      matchedLabel: 'Protein / Coldstore Preset',
      isExactPreset: true,
      defaultOpeningPacks: 2,
      defaultPerPlateQty: 150,
    };
  }

  // Spices, herbs, salt, masala
  if (
    clean.includes('spice') ||
    clean.includes('masala') ||
    clean.includes('curry') ||
    clean.includes('cinnamon') ||
    clean.includes('cardamom') ||
    clean.includes('cumin') ||
    clean.includes('turmeric') ||
    clean.includes('paprika') ||
    clean.includes('pepper') ||
    clean.includes('pilipili') ||
    clean.includes('salt') ||
    clean.includes('chumvi') ||
    clean.includes('clove') ||
    clean.includes('coriander')
  ) {
    const ratio = inlineSpec?.consumptionUnit === 'grams' ? inlineSpec.conversionRatio : 1000;
    const isSalt = clean.includes('salt') || clean.includes('chumvi');
    return {
      category: 'Dry Goods',
      purchaseUnit: `${ratio >= 1000 ? `${ratio / 1000}kg Pack` : `${ratio}g Jar`}`,
      consumptionUnit: 'grams',
      conversionRatio: ratio,
      typicalCost: isSalt ? 1500 : Math.round((ratio / 1000) * 18000),
      supplier: 'Zanzibar Spice Traders',
      matchedLabel: isSalt ? 'Salt Seasoning Preset' : 'Spices & Masala Preset',
      isExactPreset: true,
      defaultOpeningPacks: 3,
      defaultPerPlateQty: 5,
    };
  }

  // Fresh Produce
  if (
    clean.includes('tomato') ||
    clean.includes('nyanya') ||
    clean.includes('onion') ||
    clean.includes('kitunguu') ||
    clean.includes('vitunguu') ||
    clean.includes('potato') ||
    clean.includes('viazi') ||
    clean.includes('garlic') ||
    clean.includes('ginger') ||
    clean.includes('tangawizi') ||
    clean.includes('carrot') ||
    clean.includes('cabbage') ||
    clean.includes('spinach') ||
    clean.includes('lemon') ||
    clean.includes('lime') ||
    clean.includes('ndimu') ||
    clean.includes('avocado') ||
    clean.includes('banana') ||
    clean.includes('ndizi')
  ) {
    const ratio = inlineSpec?.consumptionUnit === 'grams' ? inlineSpec.conversionRatio : 10000;
    return {
      category: 'Produce',
      purchaseUnit: `${ratio >= 1000 ? `${ratio / 1000}kg Crate` : `${ratio}g Pack`}`,
      consumptionUnit: 'grams',
      conversionRatio: ratio,
      typicalCost: Math.round((ratio / 1000) * 2000),
      supplier: 'Kariakoo Wholesale Produce',
      matchedLabel: 'Fresh Produce Preset',
      isExactPreset: true,
      defaultOpeningPacks: 2,
      defaultPerPlateQty: 40,
    };
  }

  // Eggs
  if (clean.includes('egg') || clean.includes('mayai') || clean.includes('yai')) {
    const ratio = inlineSpec?.consumptionUnit === 'pcs' ? inlineSpec.conversionRatio : 30;
    return {
      category: 'Produce',
      purchaseUnit: `Tray (${ratio} pcs)`,
      consumptionUnit: 'pcs',
      conversionRatio: ratio,
      typicalCost: Math.round(ratio * 400),
      supplier: 'Kibaha Fresh Poultry',
      matchedLabel: 'Poultry / Egg Tray Preset',
      isExactPreset: true,
      defaultOpeningPacks: 5,
      defaultPerPlateQty: 2,
    };
  }

  // Beverages
  if (
    clean.includes('soda') ||
    clean.includes('juice') ||
    clean.includes('water') ||
    clean.includes('maji') ||
    clean.includes('beer') ||
    clean.includes('drink') ||
    clean.includes('tea') ||
    clean.includes('coffee')
  ) {
    const isBottle = !inlineSpec || inlineSpec.consumptionUnit === 'bottle';
    const ratio = inlineSpec ? inlineSpec.conversionRatio : 24;
    return {
      category: 'Beverages',
      purchaseUnit: isBottle ? `Crate (${ratio} Bottles)` : `${ratio >= 1000 ? `${ratio / 1000}L Pack` : `${ratio}ml Pack`}`,
      consumptionUnit: isBottle ? 'bottle' : 'ml',
      conversionRatio: ratio,
      typicalCost: isBottle ? Math.round(ratio * 920) : 12000,
      supplier: 'Dar Bottlers Co.',
      matchedLabel: 'Beverages & Bar Preset',
      isExactPreset: true,
      defaultOpeningPacks: 4,
      defaultPerPlateQty: isBottle ? 1 : 250,
    };
  }

  // Fallback with inline pack parsing if user typed e.g. "Cassava Flour 10kg"
  if (inlineSpec) {
    const unitLabel =
      inlineSpec.consumptionUnit === 'grams'
        ? inlineSpec.conversionRatio >= 1000
          ? `${inlineSpec.conversionRatio / 1000}kg Pack`
          : `${inlineSpec.conversionRatio}g Pack`
        : inlineSpec.consumptionUnit === 'ml'
        ? inlineSpec.conversionRatio >= 1000
          ? `${inlineSpec.conversionRatio / 1000}L Pack`
          : `${inlineSpec.conversionRatio}ml Pack`
        : `Pack (${inlineSpec.conversionRatio} ${inlineSpec.consumptionUnit})`;
    return {
      category: inlineSpec.consumptionUnit === 'ml' ? 'Oils & Dairy' : 'Dry Goods',
      purchaseUnit: unitLabel,
      consumptionUnit: inlineSpec.consumptionUnit,
      conversionRatio: inlineSpec.conversionRatio,
      typicalCost:
        inlineSpec.consumptionUnit === 'ml'
          ? Math.max(2000, Math.round((inlineSpec.conversionRatio / 1000) * 4500))
          : inlineSpec.consumptionUnit === 'grams'
          ? Math.max(2000, Math.round((inlineSpec.conversionRatio / 1000) * 3000))
          : Math.max(1000, inlineSpec.conversionRatio * 500),
      supplier: 'Kariakoo Wholesale Supplies',
      matchedLabel: `Parsed from "${name.trim()}"`,
      isExactPreset: true,
      defaultOpeningPacks: 2,
      defaultPerPlateQty: inlineSpec.consumptionUnit === 'grams' ? 50 : inlineSpec.consumptionUnit === 'ml' ? 30 : 1,
    };
  }

  return {
    category: 'Dry Goods',
    purchaseUnit: '5kg Pack',
    consumptionUnit: 'grams',
    conversionRatio: 5000,
    typicalCost: 15000,
    supplier: 'Kariakoo Grain & Spice Wholesalers',
    matchedLabel: 'Standard Kitchen Pack Preset (editable)',
    isExactPreset: false,
    defaultOpeningPacks: 2,
    defaultPerPlateQty: 50,
  };
}
