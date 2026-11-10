import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChefHat,
  Scale,
  ShieldCheck,
  TrendingUp,
  Percent,
  X,
  Plus,
  Trash2,
  ChevronRight,
  History,
  Info,
  Layers,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, RecipeIngredient, Recipe, AiParsedLineItem } from '../../types/restaurant';
import {
  parseRecipeWithAI,
  calculateBOMCostRollup,
  TANZANIAN_SYNONYM_DICTIONARY,
  UNIT_CONVERSIONS,
} from '../../utils/aiBomEngine';

interface AiBomBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMenuItemId?: string;
}

export const AiBomBuilderModal: React.FC<AiBomBuilderModalProps> = ({
  isOpen,
  onClose,
  initialMenuItemId,
}) => {
  const {
    menuItems,
    ingredients,
    recipes,
    saveRecipe,
    formatMoney,
    bomAuditLogs,
  } = useRestaurant();

  // Selected dish to link BOM to
  const [targetMenuItemId, setTargetMenuItemId] = useState<string>(
    initialMenuItemId || menuItems[0]?.id || ''
  );

  // Chef Input State
  const [inputText, setInputText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed BOM State for Human Review
  const [parsedRecipeName, setParsedRecipeName] = useState<string>('');
  const [batchPortions, setBatchPortions] = useState<number>(1);
  const [prepInstructions, setPrepInstructions] = useState<string>('');
  const [reviewLines, setReviewLines] = useState<AiParsedLineItem[]>([]);
  const [rawPromptUsed, setRawPromptUsed] = useState<string>('');
  const [hasParsed, setHasParsed] = useState<boolean>(false);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);
  const [approverName, setApproverName] = useState<string>('David Kasambala (Manager)');

  const targetDish = menuItems.find((m) => m.id === targetMenuItemId);
  const sellingPrice = targetDish?.price || 25000;

  // Preset prompt quick-fills
  const PRESET_RECIPES = [
    {
      label: '🇹🇿 Swahili: Chips Mayai (4 sahani)',
      text: 'chips mayai sahani 4: viazi kilo 1.2, mayai 8, mafuta 140ml, kitunguu 1 kikubwa (80g)',
    },
    {
      label: '🍗 Chicken Biryani (10 portions)',
      text: 'Chicken biryani, 10 portions: 2.5kg chicken, 1.5kg basmati rice, 4 onions, 200ml cooking oil, 40g spices masala, 15g salt',
    },
    {
      label: '🐟 Grilled Salmon Platter (2 portions)',
      text: 'Grilled salmon steak, 2 portions: 500g fresh salmon fillet, 40ml sunflower oil, 1 red onion (60g)',
    },
    {
      label: '🥩 Beef Tenderloin Stirfry (4 portions)',
      text: 'Beef stirfry, 4 portions: 800g prime beef, 3 onions, 60ml cooking oil, 20g spices',
    },
    {
      label: '⚠️ Anomaly Test: High Salt & Oil',
      text: 'Special chef curry, 5 portions: 1kg beef, 200g salt, 900ml cooking oil, 2 onions',
    },
  ];

  // Deterministic Cost Rollup calculated by CODE (NOT AI)
  const rollup = useMemo(() => {
    return calculateBOMCostRollup(reviewLines, batchPortions, sellingPrice, ingredients);
  }, [reviewLines, batchPortions, sellingPrice, ingredients]);

  if (!isOpen) return null;

  // Handle AI Parse trigger
  const handleParseRecipe = async () => {
    if (!inputText.trim()) {
      setParseError('Please enter recipe notes or select one of the chef templates below.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const result = await parseRecipeWithAI(inputText, ingredients);

      setParsedRecipeName(result.recipeName || targetDish?.name || 'Chef Custom Recipe');
      setBatchPortions(Math.max(1, result.batchPortions || 1));
      setPrepInstructions(result.prepInstructions || '');
      setReviewLines(result.lines || []);
      setRawPromptUsed(inputText);
      setHasParsed(true);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse recipe notes.');
    } finally {
      setIsParsing(false);
    }
  };

  // Human Review Table updates
  const handleUpdateMatchedIngredient = (index: number, newIngId: string) => {
    const ing = ingredients.find((i) => i.id === newIngId);
    if (!ing) return;

    setReviewLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        matchedIngredientId: ing.id,
        matchedIngredientName: ing.name,
        baseUnit: ing.consumptionUnit,
        confidence: 100, // Manually verified by human
        notes: `Manually mapped by chef to "${ing.name}"`,
      };
      return updated;
    });
  };

  const handleUpdateNormalizedQty = (index: number, newQty: number) => {
    setReviewLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        normalizedBaseQuantity: Math.max(0, newQty),
      };
      return updated;
    });
  };

  const handleUpdateYield = (index: number, newYield: number) => {
    setReviewLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        typicalYieldPercentage: Math.max(10, Math.min(100, newYield)),
      };
      return updated;
    });
  };

  const handleRemoveLine = (index: number) => {
    setReviewLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddBlankLine = () => {
    const firstIng = ingredients[0];
    const newLine: AiParsedLineItem = {
      rawText: 'Manual addition',
      rawIngredientName: firstIng?.name || 'New Raw Ingredient',
      matchedIngredientId: firstIng?.id || null,
      matchedIngredientName: firstIng?.name || 'Select Ingredient',
      confidence: 100,
      quantityPerBatch: 1,
      rawUnit: firstIng?.consumptionUnit || 'grams',
      normalizedBaseQuantity: 50,
      baseUnit: firstIng?.consumptionUnit || 'grams',
      typicalYieldPercentage: 100,
      notes: 'Manually added line',
      isAnomaly: false,
    };
    setReviewLines((prev) => [...prev, newLine]);
  };

  // Human Approval & Commit
  const handleApproveAndSaveBOM = () => {
    if (!targetMenuItemId) {
      alert('Please select a target menu item to attach this Bill of Materials to.');
      return;
    }

    if (reviewLines.length === 0) {
      alert('Recipe cannot be empty. Add or parse at least one ingredient.');
      return;
    }

    // Build standard RecipeIngredient array normalized for 1 plate
    const recipeIngredients: RecipeIngredient[] = rollup.linesWithCost.map((line) => ({
      ingredientId: line.matchedIngredientId || 'ing-potatoes',
      quantity: line.effectiveQtyPerPlate, // effective quantity accounting for yield
      yieldPercentage: line.typicalYieldPercentage,
      notes: line.notes || `${line.typicalYieldPercentage}% yield factor applied`,
    }));

    const existingRecipe = recipes.find((r) => r.menuItemId === targetMenuItemId);
    const recipeId = existingRecipe ? existingRecipe.id : `rec-${Date.now()}`;

    const newRecipe: Recipe = {
      id: recipeId,
      menuItemId: targetMenuItemId,
      name: parsedRecipeName || targetDish?.name,
      batchPortions,
      ingredients: recipeIngredients,
      preparationInstructions: prepInstructions || `Standard chef kitchen prep for ${targetDish?.name}`,
      isAiGenerated: true,
      aiConfidence: Math.round(
        reviewLines.reduce((sum, l) => sum + l.confidence, 0) / Math.max(1, reviewLines.length)
      ),
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
    };

    // Commit to Master Data with full audit log
    saveRecipe(newRecipe, {
      recipeId,
      dishName: targetDish?.name || parsedRecipeName,
      rawInputText: rawPromptUsed || inputText,
      suggestedIngredientsCount: reviewLines.length,
      approvedIngredientsCount: recipeIngredients.length,
      avgConfidence: newRecipe.aiConfidence || 95,
      anomaliesDetected: rollup.anomalies,
      approvedBy: approverName,
      totalCostPerPlate: rollup.totalPlateCost,
      foodCostPercentage: rollup.foodCostPercentage,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-amber-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-neutral-900">
                  AI Recipe-to-BOM Creator
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  AI Proposes · Rules Calculate · Humans Approve
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Transforms messy, multi-lingual chef notes into deterministic Odoo-style Bill of Materials & Food Costings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                showAuditLogs
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>BOM Audit Trail ({bomAuditLogs.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Audit Logs Drawer / Panel */}
          {showAuditLogs && (
            <div className="bg-neutral-50 rounded-2xl p-4.5 border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>BOM Approval & Revision Audit Ledger (AI Propose vs Human Approve)</span>
                </div>
                <button
                  onClick={() => setShowAuditLogs(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-900 underline"
                >
                  Close Log
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left bg-white rounded-xl border border-neutral-200">
                  <thead className="bg-neutral-100/70 text-neutral-600 font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Dish Name</th>
                      <th className="py-2.5 px-3">Raw Chef Prompt</th>
                      <th className="py-2.5 px-3">Lines</th>
                      <th className="py-2.5 px-3">Avg AI Match</th>
                      <th className="py-2.5 px-3">Plate COGS</th>
                      <th className="py-2.5 px-3">Food Cost %</th>
                      <th className="py-2.5 px-3 text-right">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono">
                    {bomAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/60">
                        <td className="py-2 px-3 text-neutral-500 text-[11px]">{log.timestamp}</td>
                        <td className="py-2 px-3 font-sans font-bold text-neutral-900">{log.dishName}</td>
                        <td className="py-2 px-3 font-sans text-neutral-600 text-[11px] max-w-xs truncate" title={log.rawInputText}>
                          {log.rawInputText}
                        </td>
                        <td className="py-2 px-3 text-neutral-800">{log.approvedIngredientsCount} ing</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {log.avgConfidence}%
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-neutral-900">{formatMoney(log.totalCostPerPlate)}</td>
                        <td className="py-2 px-3 font-bold text-blue-700">{log.foodCostPercentage.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right font-sans text-neutral-700 font-semibold">{log.approvedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 1: Chef Input Section */}
          <div className="bg-neutral-50/80 rounded-3xl p-5 border border-neutral-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                  <ChefHat className="w-3.5 h-3.5" />
                  Step 1: Chef Recipe Dictation / Unstructured Input
                </span>
                <h3 className="text-sm font-bold text-neutral-900">
                  Type or paste chef recipe notes in English or Swahili
                </h3>
              </div>

              {/* Target Dish Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-neutral-600">Attach to Dish:</label>
                <select
                  value={targetMenuItemId}
                  onChange={(e) => setTargetMenuItemId(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 shadow-xs focus:ring-2 focus:ring-orange-500"
                >
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({formatMoney(item.price)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Natural language textarea */}
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={3}
                placeholder="Example: Chicken biryani, 10 portions: 2.5kg chicken, 1.5kg basmati rice, 4 onions, 200ml oil, 15g salt, spices... or Swahili: chips mayai 4 sahani: viazi kilo 1.2, mayai 8, mafuta 150ml, kitunguu 1"
                className="w-full bg-white rounded-2xl border border-neutral-200 p-3.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono resize-y"
              />

              {isParsing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-orange-600">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span>AI parsing recipe & matching Tanzanian raw ingredient catalogue...</span>
                </div>
              )}
            </div>

            {parseError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Presets and Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-neutral-400">Quick Test Templates:</span>
                {PRESET_RECIPES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(preset.text)}
                    className="text-[11px] font-semibold px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleParseRecipe}
                disabled={isParsing || !inputText.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Parse & Propose BOM</span>
              </button>
            </div>
          </div>

          {/* STEP 2: HUMAN REVIEW SCREEN ("AI Proposes, Rules Calculate, Humans Approve") */}
          {hasParsed && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Architecture Rule Callout */}
              <div className="bg-blue-50/70 border border-blue-200/90 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>Deterministic Validation & Human Approval Active</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-mono">
                      Batch: {batchPortions} portions → Scaled to 1 Plate Portion
                    </span>
                  </div>
                  <p className="text-blue-700 leading-relaxed">
                    AI extracted the messy items and matched synonyms against your live stock catalogue. <strong>All arithmetic (unit cost, yield loss, and COGS margin) is deterministically calculated by code.</strong> Review the matches, override any ingredient or yield %, and approve to commit to your Master Menu.
                  </p>
                </div>
              </div>

              {/* Anomaly Warnings Banner (if any) */}
              {rollup.anomalies.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Quality & Cost Anomalies Flagged ({rollup.anomalies.length})</span>
                  </div>
                  <div className="space-y-1 pl-6 list-disc">
                    {rollup.anomalies.map((ano, idx) => (
                      <p key={idx} className="text-xs text-amber-800 font-medium">
                        • {ano}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive BOM Lines Review Table */}
              <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden space-y-0">
                <div className="p-4 bg-neutral-50/60 border-b border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-neutral-600" />
                    <span className="text-xs font-bold text-neutral-800">
                      Recipe Lines for: <strong className="text-orange-600">{parsedRecipeName}</strong>
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      ({reviewLines.length} ingredients detected)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-neutral-500">Batch Portions:</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={batchPortions}
                      onChange={(e) => setBatchPortions(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-center font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddBlankLine}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-100">
                      <tr>
                        <th className="py-3 px-3.5">Raw Chef Input</th>
                        <th className="py-3 px-3">Matched Catalogue Ingredient</th>
                        <th className="py-3 px-3">Confidence</th>
                        <th className="py-3 px-3">Net Qty / Plate</th>
                        <th className="py-3 px-3">Yield (%)</th>
                        <th className="py-3 px-3">Raw Stock Used</th>
                        <th className="py-3 px-3">Unit Cost (Master)</th>
                        <th className="py-3 px-3 text-right">Line Cost</th>
                        <th className="py-3 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {rollup.linesWithCost.map((line, idx) => {
                        const isHighConfidence = line.confidence >= 90;
                        const isMedConfidence = line.confidence >= 70 && line.confidence < 90;

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-neutral-50/70 transition-colors ${
                              line.isAnomaly ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            {/* Raw item text */}
                            <td className="py-3 px-3.5 font-mono text-neutral-700 font-medium">
                              <div>{line.rawText}</div>
                              <span className="text-[10px] text-neutral-400">
                                {line.quantityPerBatch} {line.rawUnit} in batch
                              </span>
                            </td>

                            {/* Catalogue match dropdown */}
                            <td className="py-3 px-3">
                              <select
                                value={line.matchedIngredientId || ''}
                                onChange={(e) => handleUpdateMatchedIngredient(idx, e.target.value)}
                                className={`w-48 text-xs font-bold rounded-lg border px-2 py-1.5 focus:ring-1 focus:ring-orange-500 ${
                                  line.matchedIngredientId
                                    ? 'border-neutral-200 bg-white text-neutral-900'
                                    : 'border-red-300 bg-red-50 text-red-900'
                                }`}
                              >
                                {line.matchedIngredientId === null && (
                                  <option value="">⚠️ {line.matchedIngredientName} (Select Item)</option>
                                )}
                                {ingredients.map((ing) => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.consumptionUnit})
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Match Confidence Score */}
                            <td className="py-3 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                  isHighConfidence
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isMedConfidence
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {line.confidence}%
                              </span>
                            </td>

                            {/* Net Plate Qty input */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  value={line.normalizedBaseQuantity}
                                  onChange={(e) =>
                                    handleUpdateNormalizedQty(idx, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-16 bg-neutral-50 border border-neutral-200 rounded px-1.5 py-1 text-xs font-mono font-bold text-center"
                                />
                                <span className="text-[11px] text-neutral-500 font-mono">
                                  {line.baseUnit}
                                </span>
                              </div>
                            </td>

                            {/* Yield % factor (e.g. whole fish 55%, onions 90%) */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={10}
                                  max={100}
                                  value={line.typicalYieldPercentage}
                                  onChange={(e) =>
                                    handleUpdateYield(idx, parseInt(e.target.value) || 100)
                                  }
                                  className="w-14 bg-neutral-50 border border-neutral-200 rounded px-1.5 py-1 text-xs font-mono font-bold text-center"
                                />
                                <span className="text-[11px] text-neutral-500">%</span>
                              </div>
                            </td>

                            {/* Effective Gross Stock required */}
                            <td className="py-3 px-3 font-mono text-neutral-800 font-semibold">
                              {line.effectiveQtyPerPlate} {line.baseUnit}
                              {line.typicalYieldPercentage < 100 && (
                                <div className="text-[10px] text-neutral-400">
                                  +{line.effectiveQtyPerPlate - line.normalizedBaseQuantity} prep trim loss
                                </div>
                              )}
                            </td>

                            {/* Unit Cost from Master Data */}
                            <td className="py-3 px-3 font-mono text-neutral-500">
                              {formatMoney(line.unitCost)} / {line.baseUnit}
                            </td>

                            {/* Line Cost (effective * unitCost) */}
                            <td className="py-3 px-3 font-mono font-bold text-right text-neutral-900">
                              {formatMoney(line.lineCost)}
                            </td>

                            {/* Remove */}
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="p-1 text-neutral-300 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mathematical Rollup Footer Card */}
                <div className="p-5 bg-neutral-50/70 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500">Dish Selling Price</span>
                    <div className="text-base font-extrabold font-mono text-neutral-900 mt-0.5">
                      {formatMoney(sellingPrice)}
                    </div>
                    <span className="text-[10px] text-neutral-400">Menu target price</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500">Total Plate COGS</span>
                    <div className="text-base font-extrabold font-mono text-neutral-900 mt-0.5">
                      {formatMoney(rollup.totalPlateCost)}
                    </div>
                    <span className="text-[10px] text-neutral-400">Deterministic code sum</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500">Gross Contribution</span>
                    <div className="text-base font-extrabold font-mono text-emerald-700 mt-0.5">
                      {formatMoney(rollup.grossContribution)}
                    </div>
                    <span className="text-[10px] text-neutral-400">Gross profit per plate</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500">Food Cost %</span>
                    <div
                      className={`text-base font-extrabold font-mono mt-0.5 ${
                        rollup.foodCostPercentage <= 35
                          ? 'text-emerald-700'
                          : rollup.foodCostPercentage <= 45
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {rollup.foodCostPercentage.toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-neutral-400">Target benchmark: 28% - 35%</span>
                  </div>
                </div>
              </div>

              {/* Approval Bar */}
              <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900">
                      Authorized Approval Sign-off:
                    </div>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="e.g. David Kasambala (Manager)"
                      className="text-xs text-neutral-600 border-b border-neutral-300 focus:border-neutral-900 focus:outline-none py-0.5 w-60"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
                  >
                    Discard Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveAndSaveBOM}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Save BOM to Master Menu</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
