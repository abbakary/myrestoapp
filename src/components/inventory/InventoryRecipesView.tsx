import React, { useState, useMemo } from 'react';
import {
  Boxes,
  ChefHat,
  AlertTriangle,
  TrendingDown,
  Plus,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  Trash2,
  FileText,
  CheckCircle2,
  DollarSign,
  PackagePlus,
  AlertOctagon,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  Warehouse,
  Store,
  Clock,
  Flame,
  Check,
  CheckCheck,
  Layers,
  Sparkles,
  History,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Ingredient, Recipe, StockMovement, MovementType } from '../../types/restaurant';
import { AiBomBuilderModal } from './AiBomBuilderModal';
import { BatchCookingModal } from './BatchCookingModal';
import { RecipeCardModal } from './RecipeCardModal';
import { suggestCatalogueItemDetails } from '../../utils/aiBomEngine';

import { MenuManagementView } from '../menu/MenuManagementView';
import { TableManagementView } from '../tables/TableManagementView';

export const InventoryRecipesView: React.FC = () => {
  const {
    ingredients,
    recipes,
    menuItems,
    formatMoney,
    updateStock,
    recordStockIntake,
    recordWastage,
    addNewIngredient,
    transferStock,
    returnAllKitchenStockToStore,
    stockMovements,
    currentTenant,
    bomAuditLogs,
    productionLogs,
    preparedDishStocks,
    validateBatchKitchenStock,
    createRequisitionForMissing,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<
    'kpis_and_stock' | 'transfers' | 'daily_closing' | 'reports' | 'recipes' | 'menu_management' | 'tables_management'
  >('kpis_and_stock');
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeItem, setSelectedRecipeItem] = useState<string>('menu-2');

  // Modals state
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [isNewIngredientModalOpen, setIsNewIngredientModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Stock Transfer Form State
  const [transferIngredientId, setTransferIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [transferFrom, setTransferFrom] = useState<'main_store' | 'kitchen'>('main_store');
  const [transferTo, setTransferTo] = useState<'main_store' | 'kitchen'>('kitchen');
  const [transferQuantity, setTransferQuantity] = useState<number>(10000);
  const [transferReason, setTransferReason] = useState<string>('Daily operation prep requisition');
  const [transferShift, setTransferShift] = useState<string>('Lunch Rush Prep');
  const [transferStaff, setTransferStaff] = useState<string>('David Kasambala (Manager)');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Stock Intake Form State
  const [intakeIngredientId, setIntakeIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [intakeQuantity, setIntakeQuantity] = useState<number>(50000);
  const [intakeCost, setIntakeCost] = useState<number>(90000);
  const [intakeSupplier, setIntakeSupplier] = useState<string>('Mbeya Farmers Cooperative');
  const [intakeInvoiceRef, setIntakeInvoiceRef] = useState<string>('INV-2026-089');

  // Wastage Form State
  const [wastageIngredientId, setWastageIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [wastageQuantity, setWastageQuantity] = useState<number>(1500);
  const [wastageLocation, setWastageLocation] = useState<'kitchen' | 'main_store'>('kitchen');
  const [wastageReason, setWastageReason] = useState<string>('Damaged during kitchen peel prep');

  // New Ingredient Form State
  const [newIngName, setNewIngName] = useState('');
  const [newIngPurchaseUnit, setNewIngPurchaseUnit] = useState('25kg Bag');
  const [newIngConsumptionUnit, setNewIngConsumptionUnit] = useState('grams');
  const [newIngConversionRatio, setNewIngConversionRatio] = useState(25000);
  const [newIngCost, setNewIngCost] = useState(65000);
  const [newIngStoreStock, setNewIngStoreStock] = useState(20000);
  const [newIngKitchenStock, setNewIngKitchenStock] = useState(5000);
  const [newIngThreshold, setNewIngThreshold] = useState(5000);
  const [newIngSupplier, setNewIngSupplier] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages'>('Dry Goods');
  const [aiSuggestionMessage, setAiSuggestionMessage] = useState<string | null>(null);

  // AI Recipe-to-BOM Creator Modal State
  const [isAiBomModalOpen, setIsAiBomModalOpen] = useState(false);
  const [aiBomTargetDishId, setAiBomTargetDishId] = useState<string>('menu-wali-nyama');

  // Batch Production & Recipe Card Modal States
  const [isBatchCookModalOpen, setIsBatchCookModalOpen] = useState(false);
  const [isRecipeCardModalOpen, setIsRecipeCardModalOpen] = useState(false);
  const [recipeCardToEdit, setRecipeCardToEdit] = useState<Recipe | null>(null);

  const handleAutoSuggestCatalogue = (nameQuery?: string) => {
    const target = nameQuery || newIngName;
    if (!target.trim()) return;
    const suggestion = suggestCatalogueItemDetails(target);
    setNewIngCategory(suggestion.category);
    setNewIngPurchaseUnit(suggestion.purchaseUnit);
    setNewIngConsumptionUnit(suggestion.consumptionUnit);
    setNewIngConversionRatio(suggestion.conversionRatio);
    setNewIngCost(suggestion.typicalCost);
    setNewIngSupplier(suggestion.supplier);
    setAiSuggestionMessage(
      `AI Auto-filled: ${suggestion.category} · ${suggestion.purchaseUnit} (${suggestion.conversionRatio.toLocaleString()} ${suggestion.consumptionUnit}) · Est. TZS ${suggestion.typicalCost.toLocaleString()}`
    );
  };

  // KPI Calculations
  const totalStoreValuation = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
      return sum + unitCost * (ing.storeStockUnits ?? 0);
    }, 0);
  }, [ingredients]);

  const totalKitchenValuation = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
      return sum + unitCost * (ing.kitchenStockUnits ?? 0);
    }, 0);
  }, [ingredients]);

  const totalStockValuation = totalStoreValuation + totalKitchenValuation;

  const lowStockItems = useMemo(() => {
    return ingredients.filter((ing) => ing.currentStockUnits <= ing.minimumThreshold);
  }, [ingredients]);

  const lowKitchenItems = useMemo(() => {
    return ingredients.filter(
      (ing) => (ing.kitchenStockUnits ?? 0) <= Math.max(1, ing.minimumThreshold * 0.25)
    );
  }, [ingredients]);

  // Today's Movements
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMovements = useMemo(() => {
    return stockMovements.filter((m) => m.date === todayStr);
  }, [stockMovements, todayStr]);

  const transferMovements = useMemo(() => {
    return stockMovements.filter((m) => m.type === 'stock_transfer');
  }, [stockMovements]);

  // Filtered Stock Movements by Period & Date
  const filteredMovements = useMemo(() => {
    const now = new Date();
    return stockMovements.filter((m) => {
      const movementDate = new Date(m.date);
      const diffTime = Math.abs(now.getTime() - movementDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let matchesDate = true;
      if (dateFilter === 'day') {
        matchesDate = diffDays <= 1;
      } else if (dateFilter === 'week') {
        matchesDate = diffDays <= 7;
      } else if (dateFilter === 'month') {
        matchesDate = diffDays <= 30;
      }

      const matchesType = movementTypeFilter === 'all' || m.type === movementTypeFilter;
      const matchesSearch =
        m.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.reference && m.reference.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDate && matchesType && matchesSearch;
    });
  }, [stockMovements, dateFilter, movementTypeFilter, searchQuery]);

  // Periodic metrics
  const totalIntakeCost = filteredMovements
    .filter((m) => m.type === 'purchase_intake')
    .reduce((sum, m) => sum + m.costImpact, 0);

  const totalConsumptionCost = filteredMovements
    .filter((m) => m.type === 'kitchen_consumption')
    .reduce((sum, m) => sum + m.costImpact, 0);

  const totalWastageCost = filteredMovements
    .filter((m) => m.type === 'wastage_spoilage')
    .reduce((sum, m) => sum + m.costImpact, 0);

  const wastagePercentage =
    totalConsumptionCost + totalWastageCost > 0
      ? ((totalWastageCost / (totalConsumptionCost + totalWastageCost)) * 100).toFixed(1)
      : '0.0';

  // Recipe calculation for selected dish
  const activeDish = menuItems.find((m) => m.id === selectedRecipeItem) || menuItems[0];
  const activeRecipe = recipes.find((r) => r.menuItemId === activeDish?.id);

  const recipeBreakdown = activeRecipe
    ? activeRecipe.ingredients.map((ri) => {
        const ingredient = ingredients.find((i) => i.id === ri.ingredientId);
        const unitCost = ingredient
          ? ingredient.costPerPurchaseUnit / ingredient.conversionRatio
          : 0;
        const totalCost = unitCost * ri.quantity;

        // Batch calculations
        const isWeight = ingredient?.consumptionUnit === 'grams';
        const isVolume = ingredient?.consumptionUnit === 'ml';
        const rawBatchRequired = ri.batchQuantity ?? ri.quantity * (activeRecipe.batchYieldPlates || 100);
        const displayBatchUnit = ri.batchUnit || (isWeight ? 'kg' : isVolume ? 'L' : ingredient?.consumptionUnit || 'pcs');
        const batchDisplayQty = isWeight || isVolume ? rawBatchRequired / 1000 : rawBatchRequired;
        const perPlateDisplayQty = isWeight || isVolume ? ri.quantity / 1000 : ri.quantity;

        const kStock = ingredient?.kitchenStockUnits ?? 0;
        const sStock = ingredient?.storeStockUnits ?? 0;
        const isNotTransferred = kStock <= 0;
        const isShortForBatch = kStock < rawBatchRequired;
        const shortage = Math.max(0, rawBatchRequired - kStock);

        return {
          ingredient,
          quantity: ri.quantity,
          unitCost,
          totalCost,
          rawBatchRequired,
          displayBatchUnit,
          batchDisplayQty,
          perPlateDisplayQty,
          kStock,
          sStock,
          isNotTransferred,
          isShortForBatch,
          shortage,
        };
      })
    : [];

  const totalIngredientCost = recipeBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
  const sellingPrice = activeDish ? activeDish.price : 0;
  const grossContribution = Math.max(0, sellingPrice - totalIngredientCost);
  const foodCostPercentage = sellingPrice > 0 ? (totalIngredientCost / sellingPrice) * 100 : 0;

  // Selected Transfer Ingredient helper
  const selectedTransferIng = ingredients.find((i) => i.id === transferIngredientId) || ingredients[0];
  const availableInSource =
    transferFrom === 'main_store'
      ? (selectedTransferIng?.storeStockUnits ?? 0)
      : (selectedTransferIng?.kitchenStockUnits ?? 0);

  // Handlers
  const handleOpenTransferModal = (
    ingId: string,
    from: 'main_store' | 'kitchen' = 'main_store',
    to: 'main_store' | 'kitchen' = 'kitchen',
    initialQty?: number
  ) => {
    const ing = ingredients.find((i) => i.id === ingId) || ingredients[0];
    setTransferIngredientId(ing.id);
    setTransferFrom(from);
    setTransferTo(to);
    const maxAvail = from === 'main_store' ? (ing.storeStockUnits ?? 0) : (ing.kitchenStockUnits ?? 0);
    setTransferQuantity(initialQty ? Math.min(initialQty, maxAvail) : Math.min(10000, maxAvail));
    setTransferError(null);
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferIng) return;

    if (transferQuantity <= 0) {
      setTransferError('Please enter a positive transfer quantity.');
      return;
    }

    if (transferQuantity > availableInSource) {
      setTransferError(
        `Insufficient stock in ${transferFrom === 'main_store' ? 'Main Store' : 'Kitchen'}. Max available: ${availableInSource.toLocaleString()} ${selectedTransferIng.consumptionUnit}`
      );
      return;
    }

    const success = transferStock({
      ingredientId: transferIngredientId,
      quantityUnits: Number(transferQuantity),
      fromLocation: transferFrom,
      toLocation: transferTo,
      reason: `${transferShift} - ${transferReason}`,
      shift: transferShift,
      recordedBy: transferStaff,
    });

    if (success) {
      setIsTransferModalOpen(false);
      setTransferError(null);
    } else {
      setTransferError('Transfer failed. Please check available stock levels.');
    }
  };

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordStockIntake(
      intakeIngredientId,
      Number(intakeQuantity),
      Number(intakeCost),
      intakeSupplier,
      intakeInvoiceRef
    );
    setIsIntakeModalOpen(false);
  };

  const handleWastageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordWastage(wastageIngredientId, Number(wastageQuantity), wastageReason, wastageLocation);
    setIsWastageModalOpen(false);
  };

  const handleNewIngredientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName) return;
    const sStock = Number(newIngStoreStock);
    const kStock = Number(newIngKitchenStock);
    addNewIngredient({
      name: newIngName,
      purchaseUnit: newIngPurchaseUnit,
      consumptionUnit: newIngConsumptionUnit,
      conversionRatio: Number(newIngConversionRatio),
      costPerPurchaseUnit: Number(newIngCost),
      storeStockUnits: sStock,
      kitchenStockUnits: kStock,
      currentStockUnits: sStock + kStock,
      minimumThreshold: Number(newIngThreshold),
      supplier: newIngSupplier || 'Local Wholesale Market',
      category: newIngCategory,
    });
    setNewIngName('');
    setIsNewIngredientModalOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-100/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Manager Top Control Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/90 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-200/80 flex items-center justify-center font-bold">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-neutral-900 tracking-tight">
                Inventory & Food Cost Operations
              </h1>
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Multi-Location Tracking
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Track Main Store (Warehouse) vs Kitchen Floor (Daily Operations), manage transfer requisitions, and reconcile end-of-day balances
            </p>
          </div>
        </div>

        {/* Manager Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenTransferModal(ingredients[0]?.id || '')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Store ↔ Kitchen Transfer</span>
          </button>

          <button
            onClick={() => setIsIntakeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Receive Goods (Intake)</span>
          </button>

          <button
            onClick={() => setIsWastageModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Log Spoilage</span>
          </button>

          <button
            onClick={() => setIsNewIngredientModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Raw Ingredient</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('kpis_and_stock')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'kpis_and_stock'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Stock Balances & Locations ({ingredients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'transfers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-blue-800 bg-blue-50/70 hover:bg-blue-100/70'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Daily Transfers & Shift Operations</span>
          {transferMovements.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
              {transferMovements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('daily_closing')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'daily_closing'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>End-of-Day Closing Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'reports'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Periodic Movement Reports</span>
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 ${
            activeTab === 'recipes'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          Recipe BOM Costing
        </button>

        <button
          onClick={() => setActiveTab('menu_management')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'menu_management'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Menu Creator & Pricing</span>
        </button>

        <button
          onClick={() => setActiveTab('tables_management')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tables_management'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Floor Tables & Seating Zones</span>
        </button>
      </div>

      {/* TAB 1: Stock Balances & Locations */}
      {activeTab === 'kpis_and_stock' && (
        <div className="space-y-6">
          {/* Inventory KPIs Strip with Dual Location Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Total Stock Assets
              </span>
              <div className="text-xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                {formatMoney(totalStockValuation)}
              </div>
              <span className="text-[10px] text-neutral-400">Combined store + kitchen stock</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Warehouse className="w-3 h-3 text-neutral-500" />
                <span>Main Store (Warehouse)</span>
              </span>
              <div className="text-xl font-extrabold font-mono text-blue-700 mt-1 tabular-nums">
                {formatMoney(totalStoreValuation)}
              </div>
              <span className="text-[10px] text-neutral-400">
                {totalStockValuation > 0 ? Math.round((totalStoreValuation / totalStockValuation) * 100) : 0}% of inventory in storage
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <ChefHat className="w-3 h-3 text-orange-500" />
                <span>Kitchen Floor (Day Prep)</span>
              </span>
              <div className="text-xl font-extrabold font-mono text-orange-600 mt-1 tabular-nums">
                {formatMoney(totalKitchenValuation)}
              </div>
              <span className="text-[10px] text-orange-700 font-semibold">Active operational prep stock</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Critical Low Stock
              </span>
              <div className={`text-xl font-extrabold font-mono mt-1 tabular-nums ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-neutral-900'}`}>
                {lowStockItems.length} items
              </div>
              <span className="text-[10px] text-neutral-400">Require supplier purchase orders</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Shrinkage / Waste Rate
              </span>
              <div className="text-xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                {wastagePercentage}%
              </div>
              <span className="text-[10px] text-neutral-400">Controlled prep loss (&lt; 2.5% target)</span>
            </div>
          </div>

          {/* Low Stock Warning Alert if any */}
          {lowStockItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Stock Reorder Required:</span>{' '}
                  {lowStockItems.map((i) => `${i.name} (${i.currentStockUnits.toLocaleString()} ${i.consumptionUnit} left total)`).join(' · ')}
                </div>
              </div>
              <button
                onClick={() => setIsIntakeModalOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
              >
                Receive Purchase Delivery
              </button>
            </div>
          )}

          {/* Low Kitchen Prep Warning if any */}
          {lowKitchenItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Kitchen Line Low on Prep:</span>{' '}
                  {lowKitchenItems.map((i) => `${i.name} (${(i.kitchenStockUnits ?? 0).toLocaleString()} ${i.consumptionUnit} on line)`).join(' · ')}. Issue more stock from Main Store!
                </div>
              </div>
              <button
                onClick={() => handleOpenTransferModal(lowKitchenItems[0].id, 'main_store', 'kitchen')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
              >
                Issue to Kitchen Now
              </button>
            </div>
          )}

          {/* Raw Ingredients Registry Table with Separate Store & Kitchen Balances */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Raw Ingredients · Main Store vs Kitchen Floor Balances
                </h3>
                <p className="text-xs text-neutral-500">
                  Real-time visibility of what is in storage room versus active kitchen prep line for day operations
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search ingredient or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
                  <tr>
                    <th className="py-3 px-3.5">Raw Ingredient</th>
                    <th className="py-3 px-3">Packaging / Ratio</th>
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1 text-blue-700 font-bold">
                        <Warehouse className="w-3.5 h-3.5" />
                        <span>Main Store</span>
                      </div>
                    </th>
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1 text-orange-600 font-bold">
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Kitchen Floor (Day Prep)</span>
                      </div>
                    </th>
                    <th className="py-3 px-3">Total Combined</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ingredients
                    .filter((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((ing) => {
                      const isCritical = ing.currentStockUnits <= ing.minimumThreshold;
                      const isKitchenLow = (ing.kitchenStockUnits ?? 0) <= Math.max(1, ing.minimumThreshold * 0.25);
                      const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
                      const storeVal = (ing.storeStockUnits ?? 0) * unitCost;
                      const kitchenVal = (ing.kitchenStockUnits ?? 0) * unitCost;
                      const totalVal = ing.currentStockUnits * unitCost;

                      return (
                        <tr key={ing.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-3.5">
                            <div className="font-bold text-neutral-900">{ing.name}</div>
                            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-neutral-600 bg-neutral-100 px-1.5 py-0.2 rounded">
                                {ing.category || 'Produce'}
                              </span>
                              <span>·</span>
                              <span>{ing.supplier}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-neutral-700">
                            <div className="font-semibold">{ing.purchaseUnit}</div>
                            <div className="text-[10px] text-neutral-400">
                              1 pk = {ing.conversionRatio.toLocaleString()} {ing.consumptionUnit}
                            </div>
                          </td>

                          {/* Main Store Stock */}
                          <td className="py-3.5 px-3">
                            <div className="font-mono font-bold text-blue-900">
                              {(ing.storeStockUnits ?? 0).toLocaleString()} {ing.consumptionUnit}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-400">
                              Val: {formatMoney(storeVal)}
                            </div>
                          </td>

                          {/* Kitchen Floor Stock */}
                          <td className="py-3.5 px-3">
                            <div className={`font-mono font-bold ${isKitchenLow ? 'text-amber-700 font-extrabold' : 'text-orange-950'}`}>
                              {(ing.kitchenStockUnits ?? 0).toLocaleString()} {ing.consumptionUnit}
                              {isKitchenLow && (
                                <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-sans">
                                  Low
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-400">
                              Val: {formatMoney(kitchenVal)}
                            </div>
                          </td>

                          {/* Total Stock */}
                          <td className="py-3.5 px-3 font-mono font-bold text-neutral-900">
                            <div>{ing.currentStockUnits.toLocaleString()} {ing.consumptionUnit}</div>
                            <div className="text-[10px] font-mono text-neutral-500 font-normal">
                              Total: {formatMoney(totalVal)}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                isCritical
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : isKitchenLow
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isCritical ? 'ORDER SUPPLIER' : isKitchenLow ? 'TRANSFER REQ' : 'BALANCED'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleOpenTransferModal(ing.id, 'main_store', 'kitchen')}
                                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                                title="Issue from Main Store to Kitchen"
                              >
                                <span>Issue → Kitchen</span>
                              </button>

                              <button
                                onClick={() => handleOpenTransferModal(ing.id, 'kitchen', 'main_store')}
                                disabled={(ing.kitchenStockUnits ?? 0) <= 0}
                                className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                                  (ing.kitchenStockUnits ?? 0) > 0
                                    ? 'text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border-neutral-300'
                                    : 'text-neutral-400 bg-neutral-50 border-neutral-200 cursor-not-allowed opacity-50'
                                }`}
                                title="Return unused from Kitchen to Main Store"
                              >
                                <span>Return ← Store</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Daily Transfers & Operations (NEW MODULE) */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-300" />
                <h2 className="text-lg font-extrabold tracking-tight">
                  Store ↔ Kitchen Daily Requisition & Stock Transfer Engine
                </h2>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                Issue raw ingredients from Main Storage for breakfast, lunch rush, or dinner service.
                At shift close, safely return unused kitchen stock to the storage room to ensure zero shrinkage.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={() => handleOpenTransferModal(ingredients[0]?.id || '')}
                className="px-4 py-2 bg-white text-blue-950 font-bold text-xs rounded-xl hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>New Stock Transfer</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Return all active kitchen stock back to Main Storage for overnight shift close?')) {
                    returnAllKitchenStockToStore();
                  }
                }}
                className="px-4 py-2 bg-blue-800/80 hover:bg-blue-700 text-white font-bold text-xs rounded-xl border border-blue-400/40 transition-colors flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4 text-emerald-300" />
                <span>Return All Kitchen Stock to Store</span>
              </button>
            </div>
          </div>

          {/* Interactive Dual-Location Visual Floor View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Location 1: Main Storage Room */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-900">Main Storage Room (Warehouse)</h3>
                    <p className="text-[11px] text-neutral-500">Bulk reserve inventory & incoming supplier deliveries</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Store Valuation:</span>
                  <div className="text-sm font-extrabold font-mono text-blue-800">{formatMoney(totalStoreValuation)}</div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {ingredients.map((ing) => {
                  const sQty = ing.storeStockUnits ?? 0;
                  const ratio = ing.conversionRatio;

                  return (
                    <div
                      key={ing.id}
                      className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex items-center justify-between gap-3 hover:bg-neutral-100/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-neutral-900 truncate">{ing.name}</div>
                        <div className="text-[11px] font-mono font-semibold text-blue-800 mt-0.5">
                          {sQty.toLocaleString()} {ing.consumptionUnit}{' '}
                          <span className="text-[10px] text-neutral-400 font-normal">
                            ({(sQty / ratio).toFixed(1)} {ing.purchaseUnit})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            const quickIssue = Math.min(sQty, Math.round(ratio * 0.2) || 10);
                            if (quickIssue > 0) {
                              transferStock({
                                ingredientId: ing.id,
                                quantityUnits: quickIssue,
                                fromLocation: 'main_store',
                                toLocation: 'kitchen',
                                reason: 'Quick morning line requisition',
                                shift: 'Morning Prep',
                              });
                            }
                          }}
                          disabled={sQty <= 0}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                            sQty > 0
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          }`}
                        >
                          <span>Issue Prep →</span>
                        </button>

                        <button
                          onClick={() => handleOpenTransferModal(ing.id, 'main_store', 'kitchen')}
                          className="p-1 text-neutral-400 hover:text-neutral-700"
                          title="Custom Transfer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location 2: Kitchen Floor & Station Line */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center font-bold">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-900">Kitchen Floor & Stations</h3>
                    <p className="text-[11px] text-neutral-500">Live operational stock on the cooking line ready for POS orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Kitchen Line Value:</span>
                  <div className="text-sm font-extrabold font-mono text-orange-600">{formatMoney(totalKitchenValuation)}</div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {ingredients.map((ing) => {
                  const kQty = ing.kitchenStockUnits ?? 0;
                  const isLow = kQty <= Math.max(1, ing.minimumThreshold * 0.25);

                  return (
                    <div
                      key={ing.id}
                      className={`p-3 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
                        isLow
                          ? 'bg-amber-50/50 border-amber-300'
                          : 'bg-neutral-50/80 border-neutral-200/70 hover:bg-neutral-100/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-neutral-900 truncate">{ing.name}</div>
                        <div className="text-[11px] font-mono font-semibold text-orange-900 mt-0.5">
                          {kQty.toLocaleString()} {ing.consumptionUnit}
                          {isLow && (
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-sans ml-1.5 font-bold">
                              Low Prep
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if (kQty > 0) {
                              transferStock({
                                ingredientId: ing.id,
                                quantityUnits: kQty,
                                fromLocation: 'kitchen',
                                toLocation: 'main_store',
                                reason: 'Shift close return to main store',
                                shift: 'Shift Close',
                              });
                            }
                          }}
                          disabled={kQty <= 0}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                            kQty > 0
                              ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          }`}
                        >
                          <span>← Return All</span>
                        </button>

                        <button
                          onClick={() => handleOpenTransferModal(ing.id, 'kitchen', 'main_store')}
                          className="p-1 text-neutral-400 hover:text-neutral-700"
                          title="Custom Return"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Transfer Movements Audit Trail Table */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Stock Transfer Audit History ({transferMovements.length} Events)
                </h3>
                <p className="text-xs text-neutral-500">
                  Detailed requisition trail tracking ingredients issued to kitchen stations or returned to storage
                </p>
              </div>

              <button
                onClick={() => alert('Exporting Stock Transfer Log CSV...')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Transfer Log</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
                  <tr>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3">Ingredient</th>
                    <th className="py-3 px-3">Direction</th>
                    <th className="py-3 px-3">Transfer Qty</th>
                    <th className="py-3 px-3">Value</th>
                    <th className="py-3 px-3">Reference / Reason</th>
                    <th className="py-3 px-3 text-right">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {transferMovements.length > 0 ? (
                    transferMovements.map((m) => {
                      const isStoreToKitchen = m.destinationLocation === 'kitchen' || m.quantityDelta > 0;
                      return (
                        <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3 px-3.5 font-mono text-neutral-600">{m.date}</td>
                          <td className="py-3 px-3 font-bold text-neutral-900">{m.ingredientName}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isStoreToKitchen
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isStoreToKitchen ? (
                                <>
                                  <Warehouse className="w-2.5 h-2.5" />
                                  <span>Store → Kitchen</span>
                                </>
                              ) : (
                                <>
                                  <ChefHat className="w-2.5 h-2.5" />
                                  <span>Kitchen → Store</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                            {Math.abs(m.quantityDelta).toLocaleString()} {m.unit}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-neutral-900">
                            {formatMoney(m.costImpact)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-neutral-800">{m.reference || 'TRF'}</div>
                            <div className="text-[10px] text-neutral-500 italic">{m.reason}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-neutral-600">{m.recordedBy}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        No stock transfers recorded yet. Use the transfer button above to issue morning prep stock to the kitchen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: End-of-Day Closing Stock (NEW MODULE - Answers User Prompt Directly) */}
      {activeTab === 'daily_closing' && (
        <div className="space-y-6">
          {/* Executive Closing Header */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCheck className="w-6 h-6 text-emerald-600" />
                <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight">
                  End-of-Day Stock Balance & Shift Closing
                </h2>
              </div>
              <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
                At the end of operations, view exactly how much raw material remains in Main Storage, what is left on the kitchen line, and what was consumed by orders today.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => {
                  if (confirm('Return all remaining kitchen line ingredients back to Main Storage for shift close?')) {
                    returnAllKitchenStockToStore();
                  }
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Return All Kitchen Stock to Main Store</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shift Audit</span>
              </button>
            </div>
          </div>

          {/* Today's Closing KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Total Closing Assets On-Hand
              </span>
              <div className="text-2xl font-extrabold font-mono text-neutral-900 tabular-nums">
                {formatMoney(totalStockValuation)}
              </div>
              <p className="text-[11px] text-neutral-400">Main Store + Kitchen Floor assets combined</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Main Storage Room (Safe)
              </span>
              <div className="text-2xl font-extrabold font-mono text-blue-700 tabular-nums">
                {formatMoney(totalStoreValuation)}
              </div>
              <p className="text-[11px] text-neutral-400">Safe inventory in warehouse coldroom & racks</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Kitchen Prep On Line
              </span>
              <div className="text-2xl font-extrabold font-mono text-orange-600 tabular-nums">
                {formatMoney(totalKitchenValuation)}
              </div>
              <p className="text-[11px] text-neutral-400">Remaining ingredients actively on kitchen line</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Today's Orders Food Cost (COGS)
              </span>
              <div className="text-2xl font-extrabold font-mono text-emerald-700 tabular-nums">
                {formatMoney(
                  todayMovements
                    .filter((m) => m.type === 'kitchen_consumption')
                    .reduce((sum, m) => sum + m.costImpact, 0)
                )}
              </div>
              <p className="text-[11px] text-neutral-400">Theoretical BOM cost of items cooked today</p>
            </div>
          </div>

          {/* End-of-Day Stock Balance Sheet Table */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Daily Closing Stock Reconciliation Ledger
                </h3>
                <p className="text-xs text-neutral-500">
                  Final closing count for {todayStr}. Shows exactly where stock is positioned and daily throughput.
                </p>
              </div>

              <div className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-xl">
                Shift: Daily Evening Audit · Lead: David Kasambala (Manager)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
                  <tr>
                    <th className="py-3 px-3.5">Raw Ingredient</th>
                    <th className="py-3 px-3">In Main Store</th>
                    <th className="py-3 px-3">On Kitchen Line</th>
                    <th className="py-3 px-3">Cooked Today (COGS)</th>
                    <th className="py-3 px-3">Wasted Today</th>
                    <th className="py-3 px-3">Verified Closing Stock</th>
                    <th className="py-3 px-3 font-mono text-right">Closing Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ingredients.map((ing) => {
                    const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
                    const sStock = ing.storeStockUnits ?? 0;
                    const kStock = ing.kitchenStockUnits ?? 0;
                    const totalClosing = sStock + kStock;
                    const totalVal = totalClosing * unitCost;

                    const todayConsumed = todayMovements
                      .filter((m) => m.ingredientId === ing.id && m.type === 'kitchen_consumption')
                      .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

                    const todayWasted = todayMovements
                      .filter((m) => m.ingredientId === ing.id && m.type === 'wastage_spoilage')
                      .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

                    return (
                      <tr key={ing.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-neutral-900">{ing.name}</div>
                          <div className="text-[10px] text-neutral-400">{ing.purchaseUnit}</div>
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-blue-900">
                          {sStock.toLocaleString()} {ing.consumptionUnit}
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-orange-900">
                          {kStock.toLocaleString()} {ing.consumptionUnit}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-neutral-600">
                          {todayConsumed > 0 ? (
                            <span className="text-emerald-700 font-semibold">
                              -{todayConsumed.toLocaleString()} {ing.consumptionUnit}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-neutral-600">
                          {todayWasted > 0 ? (
                            <span className="text-red-600 font-semibold">
                              -{todayWasted.toLocaleString()} {ing.consumptionUnit}
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono font-extrabold text-neutral-900">
                          {totalClosing.toLocaleString()} {ing.consumptionUnit}
                        </td>

                        <td className="py-3.5 px-3 font-mono font-extrabold text-neutral-900 text-right">
                          {formatMoney(totalVal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Periodic Movement Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Period Filter Toolbar */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Report Period:
              </span>
              {(['day', 'week', 'month', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setDateFilter(p)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                    dateFilter === p
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {p === 'day'
                    ? 'Today (Day)'
                    : p === 'week'
                    ? 'This Week (7 Days)'
                    : p === 'month'
                    ? 'This Month (30 Days)'
                    : 'All Time'}
                </button>
              ))}

              <div className="h-4 w-px bg-neutral-200 mx-2 hidden sm:block" />

              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5"
              >
                <option value="all">All Movement Types</option>
                <option value="stock_transfer">Stock Transfers (Store ↔ Kitchen)</option>
                <option value="purchase_intake">Purchase Intake (Deliveries)</option>
                <option value="kitchen_consumption">Kitchen POS Consumption</option>
                <option value="wastage_spoilage">Wastage / Spoilage</option>
                <option value="manual_adjustment">Manual Audit Adjustments</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert(`Exporting ${dateFilter.toUpperCase()} inventory movement report as CSV...`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Periodic Financial Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
                <span>Total Restock Purchased</span>
                <span className="text-emerald-600 font-bold">+ Deliveries</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-neutral-900 tabular-nums">
                {formatMoney(totalIntakeCost)}
              </div>
              <p className="text-[11px] text-neutral-400">Total expenditure on inventory in period</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
                <span>Kitchen Food Consumption (COGS)</span>
                <span className="text-blue-600 font-bold">- Orders</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-neutral-900 tabular-nums">
                {formatMoney(totalConsumptionCost)}
              </div>
              <p className="text-[11px] text-neutral-400">Direct ingredient usage from sales orders</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
                <span>Wastage & Spoilage Loss</span>
                <span className="text-red-600 font-bold">Shrinkage</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-red-600 tabular-nums">
                {formatMoney(totalWastageCost)}
              </div>
              <p className="text-[11px] text-neutral-400">
                Waste ratio: <strong className="text-neutral-800">{wastagePercentage}%</strong> of total food throughput
              </p>
            </div>
          </div>

          {/* Movement Ledger Table */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Stock Movement Ledger ({filteredMovements.length} Transactions)
                </h3>
                <p className="text-xs text-neutral-500">
                  Audit trail recording who received, transferred, cooked, or discarded stock
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
                  <tr>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3">Ingredient</th>
                    <th className="py-3 px-3">Movement Type</th>
                    <th className="py-3 px-3">Quantity Delta</th>
                    <th className="py-3 px-3">Financial Impact</th>
                    <th className="py-3 px-3">Reference / Reason</th>
                    <th className="py-3 px-3 text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredMovements.length > 0 ? (
                    filteredMovements.map((m) => {
                      const isPositive = m.quantityDelta > 0;
                      return (
                        <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3 px-3.5 font-mono text-neutral-600">{m.date}</td>
                          <td className="py-3 px-3 font-bold text-neutral-900">{m.ingredientName}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                m.type === 'purchase_intake'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.type === 'stock_transfer'
                                  ? 'bg-blue-100 text-blue-800'
                                  : m.type === 'kitchen_consumption'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : m.type === 'wastage_spoilage'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {m.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">
                            <span className={isPositive ? 'text-emerald-700' : 'text-neutral-800'}>
                              {isPositive ? `+${m.quantityDelta.toLocaleString()}` : m.quantityDelta.toLocaleString()} {m.unit}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-neutral-900">
                            {formatMoney(m.costImpact)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-neutral-800">{m.reference || '—'}</div>
                            <div className="text-[10px] text-neutral-500 italic">{m.reason}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-neutral-600">
                            {m.recordedBy}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        No stock movement records matching this period and filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Recipe BOM Costing */}
      {activeTab === 'recipes' && (
        <div className="space-y-6">
          {/* AI BOM Architecture Banner */}
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px] font-bold tracking-wider uppercase border border-white/20">
                  Core Principle: AI Proposes · Rules Calculate · Humans Approve
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold">
                  {recipes.length} BOMs Configured
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Bill of Materials (BOM) & Recipe Cost Rollup
              </h2>
              <p className="text-xs text-orange-100 leading-relaxed">
                AI parses messy chef text, handles Tanzanian Swahili synonyms & local units (debe, gunia, tray, fungu), and matches ingredients. Deterministic code calculates unit arithmetic and margins. Humans approve all changes.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setAiBomTargetDishId(selectedRecipeItem);
                  setIsAiBomModalOpen(true);
                }}
                className="px-5 py-3 bg-white text-orange-900 font-extrabold text-xs rounded-2xl shadow-lg hover:bg-orange-50 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span>Launch AI Recipe-to-BOM Creator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiBomTargetDishId(selectedRecipeItem);
                  setIsAiBomModalOpen(true);
                }}
                className="px-4 py-3 bg-black/20 hover:bg-black/30 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5"
              >
                <History className="w-4 h-4" />
                <span>Audit Trail ({bomAuditLogs.length})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Dish Selection */}
            <div className="bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Configured Menu Items</h3>
                  <p className="text-xs text-neutral-500">Select any dish to inspect Bill of Materials</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {menuItems.map((item) => {
                  const hasRecipe = recipes.some((r) => r.menuItemId === item.id);
                  const isSelected = selectedRecipeItem === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`w-full p-3 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold ring-1 ring-orange-500/20'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRecipeItem(item.id)}
                        className="text-left flex-1"
                      >
                        <div className="font-bold">{item.name}</div>
                        <div className="text-[11px] font-normal text-neutral-400 font-mono">
                          {formatMoney(item.price)}
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            hasRecipe ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {hasRecipe ? 'BOM Linked' : 'Direct Stock'}
                        </span>

                        <button
                          type="button"
                          title="Generate or revise BOM using AI"
                          onClick={() => {
                            setAiBomTargetDishId(item.id);
                            setSelectedRecipeItem(item.id);
                            setIsAiBomModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-orange-100/80 hover:bg-orange-200 text-orange-800 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 2 Columns: BOM Breakdown & Food Cost Margin */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Recipe Card (BOM Master Data)
                      </span>
                      {activeRecipe && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Yield: {activeRecipe.batchYieldPlates || 100} Plates (Batch) · Portion: 1 Plate
                        </span>
                      )}
                      {activeRecipe?.cookingMethod === 'batch_cooking' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          Batch Cooking (Pot/Buffet)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                          On-Sale (Made-to-Order)
                        </span>
                      )}
                      {activeRecipe?.version && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-neutral-500 bg-neutral-100">
                          v{activeRecipe.version}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-neutral-900 mt-1">{activeDish?.name}</h2>
                    {activeRecipe?.approvedBy && (
                      <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Approved by {activeRecipe.approvedBy}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Cook Batch Button (Real-life production) */}
                    {activeRecipe && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchCookModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5 text-white" />
                        <span>Cook Batch ({activeRecipe.batchYieldPlates || 100} Plates)</span>
                      </button>
                    )}

                    {/* Edit Recipe Card Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setRecipeCardToEdit(activeRecipe || null);
                        setIsRecipeCardModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      <ChefHat className="w-3.5 h-3.5 text-neutral-600" />
                      <span>{activeRecipe ? 'Edit Recipe Card' : 'Create Recipe Card'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAiBomTargetDishId(activeDish?.id || selectedRecipeItem);
                        setIsAiBomModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold text-xs rounded-xl border border-orange-200 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                      <span>AI Parse Notes</span>
                    </button>

                    <div className="text-right pl-2 border-l border-neutral-200">
                      <span className="text-xs text-neutral-400">Sell Price:</span>
                      <div className="text-base font-extrabold font-mono text-neutral-900">
                        {formatMoney(sellingPrice)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kitchen Stock Readiness Warning Alert (if any recipe line is not in kitchen) */}
                {activeRecipe && recipeBreakdown.some((r) => r.isNotTransferred || r.isShortForBatch) && (
                  <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900">
                        <div className="font-bold">
                          Kitchen Stock Shortage for {activeRecipe.name || 'Dish'}
                        </div>
                        <p className="text-amber-800 text-[11px] mt-0.5">
                          {recipeBreakdown
                            .filter((r) => r.isNotTransferred || r.isShortForBatch)
                            .map((r) =>
                              r.isNotTransferred
                                ? `${r.ingredient?.name}: 0 in Kitchen (not transferred)`
                                : `${r.ingredient?.name}: short by ${(r.shortage / (r.ingredient?.consumptionUnit === 'grams' || r.ingredient?.consumptionUnit === 'ml' ? 1000 : 1)).toFixed(1)} ${r.displayBatchUnit}`
                            )
                            .join('; ')}
                          . Batch cooking is blocked until transferred.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchCookModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Transfer Missing Items</span>
                    </button>
                  </div>
                )}

                {/* Recipe Card Ingredients Table matching User Spec */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
                      <tr>
                        <th className="py-2.5 px-3">Ingredient</th>
                        <th className="py-2.5 px-3">Qty (Batch)</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Per Plate (Auto)</th>
                        <th className="py-2.5 px-3">Kitchen Stock</th>
                        <th className="py-2.5 px-3">Store Stock</th>
                        <th className="py-2.5 px-3 text-right">Cost / Plate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {recipeBreakdown.length > 0 ? (
                        recipeBreakdown.map((row, idx) => {
                          const isWeightOrVolume = row.ingredient?.consumptionUnit === 'grams' || row.ingredient?.consumptionUnit === 'ml';
                          const displayKStock = isWeightOrVolume ? (row.kStock / 1000).toFixed(1) : row.kStock;
                          const displaySStock = isWeightOrVolume ? (row.sStock / 1000).toFixed(1) : row.sStock;

                          return (
                            <tr key={idx} className="hover:bg-neutral-50/50">
                              <td className="py-3 px-3 font-semibold text-neutral-800">
                                <div>{row.ingredient?.name || 'Raw Ingredient'}</div>
                                <span className="text-[10px] text-neutral-400">
                                  Category: {row.ingredient?.category || 'General'}
                                </span>
                              </td>

                              <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                                {row.batchDisplayQty}
                              </td>

                              <td className="py-3 px-3 font-mono text-neutral-500">
                                {row.displayBatchUnit}
                              </td>

                              <td className="py-3 px-3 font-mono font-bold text-orange-950 bg-orange-50/40">
                                {row.perPlateDisplayQty.toFixed(3)} {row.displayBatchUnit}
                                <span className="block text-[10px] text-neutral-400 font-normal">
                                  ({row.quantity} {row.ingredient?.consumptionUnit})
                                </span>
                              </td>

                              {/* Kitchen Stock Status */}
                              <td className="py-3 px-3 font-mono">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                    row.isNotTransferred
                                      ? 'bg-red-100 text-red-800'
                                      : row.isShortForBatch
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {displayKStock} {row.displayBatchUnit}
                                  {row.isNotTransferred && ' (0 in Kitchen)'}
                                  {!row.isNotTransferred && row.isShortForBatch && ' (Short)'}
                                  {!row.isNotTransferred && !row.isShortForBatch && ' (Ready)'}
                                </span>
                              </td>

                              {/* Store Stock Status */}
                              <td className="py-3 px-3 font-mono text-neutral-600">
                                {displaySStock} {row.displayBatchUnit}
                              </td>

                              <td className="py-3 px-3 font-mono font-bold text-right text-neutral-900">
                                {formatMoney(row.totalCost)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-neutral-400">
                            Direct-stock item (beverage/packaged good). Decrements 1 unit per sale.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <span className="text-[11px] font-semibold text-neutral-500">Total Ingredient Cost</span>
                    <div className="text-lg font-bold font-mono text-neutral-900 mt-1 tabular-nums">
                      {formatMoney(totalIngredientCost)}
                    </div>
                    <span className="text-[10px] text-neutral-400">Direct COGS per plate</span>
                  </div>

                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <span className="text-[11px] font-semibold text-neutral-500">Gross Contribution</span>
                    <div className="text-lg font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                      {formatMoney(grossContribution)}
                    </div>
                    <span className="text-[10px] text-neutral-400">Gross profit margin</span>
                  </div>

                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <span className="text-[11px] font-semibold text-neutral-500">Food Cost %</span>
                    <div className="text-lg font-bold font-mono text-blue-700 mt-1 tabular-nums">
                      {foodCostPercentage.toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-neutral-400">Target benchmark: 28% - 35%</span>
                  </div>
                </div>
              </div>

              {/* Module: Prepared Plates Available & Batch Production Ledger */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-neutral-900">
                        Kitchen Prepared Stock & Bulk Cooked Batches
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Method 1: Batch cooking creates ready-to-serve prepared plates pool; orders decrement plate count directly.
                      </p>
                    </div>
                  </div>

                  {activeRecipe && (
                    <button
                      type="button"
                      onClick={() => setIsBatchCookModalOpen(true)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cook Another Batch ({activeRecipe.batchYieldPlates || 100} Plates)</span>
                    </button>
                  )}
                </div>

                {/* Prepared Dish Stocks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {preparedDishStocks.map((dish) => {
                    const isLow = dish.preparedPlatesAvailable <= 10 && dish.preparedPlatesAvailable > 0;
                    const isOut = dish.preparedPlatesAvailable === 0;

                    return (
                      <div
                        key={dish.menuItemId}
                        className={`p-4 rounded-2xl border transition-all ${
                          isOut
                            ? 'bg-red-50/60 border-red-200'
                            : isLow
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-neutral-50/80 border-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-neutral-900">{dish.dishName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOut
                                ? 'bg-red-100 text-red-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOut ? 'Sold Out' : isLow ? 'Low Prep Stock' : 'Ready for Service'}
                          </span>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl font-extrabold font-mono text-neutral-900">
                              {dish.preparedPlatesAvailable}
                            </span>
                            <span className="text-xs text-neutral-500 font-semibold ml-1">
                              plates ready to serve
                            </span>
                          </div>

                          <div className="text-right text-[11px] text-neutral-500 font-mono">
                            <div>Cooked Today: <strong className="text-neutral-800">{dish.totalCookedToday}</strong></div>
                            <div>Sold Today: <strong className="text-emerald-700">{dish.totalSoldToday}</strong></div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-500">
                          <span>Last batch: {dish.lastCookedAt}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeItem(dish.menuItemId);
                              setIsBatchCookModalOpen(true);
                            }}
                            className="font-bold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            Cook Batch +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Production Log History */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800">
                      Production & Batch Cooking Ledger ({productionLogs.length} batches logged)
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Step 2: Real raw ingredients deducted from Kitchen Floor at cooking time
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-neutral-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-100/70 text-neutral-600 font-bold border-b">
                        <tr>
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Dish Cooked</th>
                          <th className="py-2.5 px-3">Batch Scale</th>
                          <th className="py-2.5 px-3">Plates Yield</th>
                          <th className="py-2.5 px-3">Total COGS</th>
                          <th className="py-2.5 px-3">Unit Cost</th>
                          <th className="py-2.5 px-3">Cooked By</th>
                          <th className="py-2.5 px-3 text-right">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-mono">
                        {productionLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-neutral-50/60">
                            <td className="py-2.5 px-3 text-neutral-500 text-[11px]">{log.timestamp}</td>
                            <td className="py-2.5 px-3 font-sans font-bold text-neutral-900">{log.dishName}</td>
                            <td className="py-2.5 px-3 font-semibold text-neutral-700">{log.batchesCooked} Batch</td>
                            <td className="py-2.5 px-3 font-bold text-orange-950">{log.actualPlatesProduced} plates</td>
                            <td className="py-2.5 px-3 font-bold text-neutral-900">{formatMoney(log.totalCost)}</td>
                            <td className="py-2.5 px-3 font-bold text-blue-700">{formatMoney(log.costPerPlate)} / plate</td>
                            <td className="py-2.5 px-3 font-sans text-neutral-600">{log.cookedBy}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              {log.remainingPlates} plates
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Step 3: Theoretical vs Actual Usage Reconciliation */}
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-600" />
                      Step 3: End-of-Day Theoretical vs Actual Kitchen Usage
                    </span>
                    <span className="text-[11px] font-normal text-blue-700">
                      Theoretical (Sales × Recipe) vs Counted Stock
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    By comparing <strong>Theoretical Usage</strong> ({preparedDishStocks.reduce((sum, p) => sum + p.totalSoldToday, 0)} plates sold × per-plate BOM) against <strong>Actual Counted Kitchen Stock</strong>, RestaurantOS automatically isolates over-portioning, kitchen waste, prep loss, or theft.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* TAB 6: Menu Creator & Pricing */}
      {activeTab === 'menu_management' && (
        <div className="pt-2">
          <MenuManagementView />
        </div>
      )}

      {/* TAB 7: Floor Tables & Seating Zones */}
      {activeTab === 'tables_management' && (
        <div className="pt-2">
          <TableManagementView />
        </div>
      )}

      {/* MODAL: STOCK TRANSFER (MAIN STORE ↔ KITCHEN) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleTransferSubmit}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-neutral-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-neutral-900">
                  Stock Transfer · Store ↔ Kitchen Requisition
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {/* Direction Toggle */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Transfer Direction:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransferFrom('main_store');
                    setTransferTo('kitchen');
                    setTransferError(null);
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    transferFrom === 'main_store' && transferTo === 'kitchen'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Warehouse className="w-4 h-4 text-blue-600" />
                  <span>Main Store → Kitchen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTransferFrom('kitchen');
                    setTransferTo('main_store');
                    setTransferError(null);
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    transferFrom === 'kitchen' && transferTo === 'main_store'
                      ? 'bg-orange-50 border-orange-500 text-orange-900 ring-2 ring-orange-500/20'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <ChefHat className="w-4 h-4 text-orange-600" />
                  <span>Kitchen → Main Store</span>
                </button>
              </div>
            </div>

            {/* Ingredient Selection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700">Select Ingredient:</label>
                <span className="text-[11px] font-mono text-neutral-500">
                  Available in {transferFrom === 'main_store' ? 'Main Store' : 'Kitchen'}:{' '}
                  <strong className="text-neutral-900">
                    {availableInSource.toLocaleString()} {selectedTransferIng?.consumptionUnit}
                  </strong>
                </span>
              </div>
              <select
                value={transferIngredientId}
                onChange={(e) => {
                  setTransferIngredientId(e.target.value);
                  const sel = ingredients.find((i) => i.id === e.target.value);
                  if (sel) {
                    const avail = transferFrom === 'main_store' ? (sel.storeStockUnits ?? 0) : (sel.kitchenStockUnits ?? 0);
                    setTransferQuantity(Math.min(10000, avail));
                  }
                  setTransferError(null);
                }}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Store: {(ing.storeStockUnits ?? 0).toLocaleString()} | Kitchen: {(ing.kitchenStockUnits ?? 0).toLocaleString()} {ing.consumptionUnit})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input with shortcut percentage buttons */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Transfer Quantity (in {selectedTransferIng?.consumptionUnit}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={availableInSource}
                  required
                  value={transferQuantity}
                  onChange={(e) => {
                    setTransferQuantity(Number(e.target.value));
                    setTransferError(null);
                  }}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              {/* Quick shortcut buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[
                  { label: '25%', factor: 0.25 },
                  { label: '50%', factor: 0.5 },
                  { label: '75%', factor: 0.75 },
                  { label: 'All Available', factor: 1.0 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => {
                      setTransferQuantity(Math.round(availableInSource * btn.factor));
                      setTransferError(null);
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Service Shift:</label>
                <select
                  value={transferShift}
                  onChange={(e) => setTransferShift(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  <option value="Morning Breakfast Prep">Morning Breakfast Prep</option>
                  <option value="Lunch Rush Prep">Lunch Rush Prep</option>
                  <option value="Dinner Evening Service">Dinner Evening Service</option>
                  <option value="Late Night Fast Grill">Late Night Fast Grill</option>
                  <option value="Shift Close Reversal">Shift Close Reversal</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Authorized By:</label>
                <input
                  type="text"
                  required
                  value={transferStaff}
                  onChange={(e) => setTransferStaff(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Requisition Note / Reason:</label>
              <input
                type="text"
                placeholder="e.g. Replenishing fry station for lunch rush order surge"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Confirm Stock Transfer</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Receive Goods / Stock Intake */}
      {isIntakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleIntakeSubmit}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-neutral-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-neutral-900">Record Stock Delivery / Intake</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIntakeModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Select Raw Ingredient:</label>
              <select
                value={intakeIngredientId}
                onChange={(e) => {
                  const sel = ingredients.find((i) => i.id === e.target.value);
                  setIntakeIngredientId(e.target.value);
                  if (sel) {
                    setIntakeQuantity(sel.conversionRatio);
                    setIntakeCost(sel.costPerPurchaseUnit);
                    setIntakeSupplier(sel.supplier);
                  }
                }}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.purchaseUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">
                  Received Quantity:
                </label>
                <input
                  type="number"
                  required
                  value={intakeQuantity}
                  onChange={(e) => setIntakeQuantity(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Total Purchase Cost:</label>
                <input
                  type="number"
                  required
                  value={intakeCost}
                  onChange={(e) => setIntakeCost(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Supplier / Vendor:</label>
              <input
                type="text"
                required
                value={intakeSupplier}
                onChange={(e) => setIntakeSupplier(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Invoice / PO Reference:</label>
              <input
                type="text"
                required
                value={intakeInvoiceRef}
                onChange={(e) => setIntakeInvoiceRef(e.target.value)}
                placeholder="e.g. INV-2026-402 / PO-88192"
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
              />
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900">
              <Warehouse className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
              Incoming deliveries are safely catalogued into <strong>Main Storage Room</strong>.
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsIntakeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Confirm & Add to Store
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Record Spoilage / Wastage */}
      {isWastageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleWastageSubmit}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-neutral-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm text-neutral-900">Log Wastage or Spoilage Loss</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWastageModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Select Ingredient:</label>
              <select
                value={wastageIngredientId}
                onChange={(e) => setWastageIngredientId(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Total: {ing.currentStockUnits.toLocaleString()} {ing.consumptionUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Location of Loss:</label>
                <select
                  value={wastageLocation}
                  onChange={(e) => setWastageLocation(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  <option value="kitchen">Kitchen Floor / Prep Line</option>
                  <option value="main_store">Main Storage / Warehouse</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">
                  Quantity Lost (units):
                </label>
                <input
                  type="number"
                  required
                  value={wastageQuantity}
                  onChange={(e) => setWastageQuantity(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Reason / Incident Description:</label>
              <textarea
                required
                rows={2}
                value={wastageReason}
                onChange={(e) => setWastageReason(e.target.value)}
                placeholder="e.g. Expired past shelf life, cooking spillage, bruised vegetables during transit..."
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsWastageModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-xs"
              >
                Record Shrinkage Loss
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add New Raw Ingredient */}
      {isNewIngredientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleNewIngredientSubmit}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-neutral-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-neutral-900">Catalogue New Raw Ingredient</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewIngredientModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">Ingredient Name:</label>
                  <button
                    type="button"
                    onClick={() => handleAutoSuggestCatalogue()}
                    disabled={!newIngName.trim()}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Auto-Suggest Packaging & Unit</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cooking oil 20L jerrycan, or Nyanya (Roma Tomatoes), or Basmati Rice 25kg"
                  value={newIngName}
                  onChange={(e) => {
                    setNewIngName(e.target.value);
                    if (aiSuggestionMessage) setAiSuggestionMessage(null);
                  }}
                  onBlur={() => {
                    if (newIngName.trim() && !newIngSupplier) {
                      handleAutoSuggestCatalogue(newIngName);
                    }
                  }}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
                {aiSuggestionMessage && (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{aiSuggestionMessage}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Category:</label>
                <select
                  value={newIngCategory}
                  onChange={(e) => setNewIngCategory(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  <option value="Produce">Produce & Vegetables</option>
                  <option value="Meat & Seafood">Meat & Seafood</option>
                  <option value="Dry Goods">Dry Goods & Grains</option>
                  <option value="Oils & Dairy">Oils & Dairy</option>
                  <option value="Beverages">Beverages & Bar</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Supplier:</label>
                <input
                  type="text"
                  placeholder="e.g. Dar Wholesale Produce"
                  value={newIngSupplier}
                  onChange={(e) => setNewIngSupplier(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Purchase Packaging:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25kg Bag, 20L Jerrycan"
                  value={newIngPurchaseUnit}
                  onChange={(e) => setNewIngPurchaseUnit(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Consumption Unit:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. grams, ml, pcs, bottle"
                  value={newIngConsumptionUnit}
                  onChange={(e) => setNewIngConsumptionUnit(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Conversion Ratio:</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={newIngConversionRatio}
                  onChange={(e) => setNewIngConversionRatio(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Cost Per Package (TZS):</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 65000"
                  value={newIngCost}
                  onChange={(e) => setNewIngCost(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Initial Store Stock:</label>
                <input
                  type="number"
                  required
                  value={newIngStoreStock}
                  onChange={(e) => setNewIngStoreStock(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Initial Kitchen Prep:</label>
                <input
                  type="number"
                  required
                  value={newIngKitchenStock}
                  onChange={(e) => setNewIngKitchenStock(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewIngredientModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors shadow-xs"
              >
                Save Ingredient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: AI Recipe-to-BOM Creator (Interactive Review & Approval) */}
      <AiBomBuilderModal
        isOpen={isAiBomModalOpen}
        onClose={() => setIsAiBomModalOpen(false)}
        initialMenuItemId={aiBomTargetDishId}
      />

      {/* MODAL: Batch Cooking Production (Strict Kitchen Stock Block, Missing Alerts & Requisition) */}
      {activeRecipe && (
        <BatchCookingModal
          isOpen={isBatchCookModalOpen}
          onClose={() => setIsBatchCookModalOpen(false)}
          recipe={activeRecipe}
        />
      )}

      {/* MODAL: Recipe Card (BOM) Editor & Master Data */}
      <RecipeCardModal
        isOpen={isRecipeCardModalOpen}
        onClose={() => setIsRecipeCardModalOpen(false)}
        recipe={recipeCardToEdit}
        defaultMenuItemId={selectedRecipeItem}
      />
    </div>
  );
};

