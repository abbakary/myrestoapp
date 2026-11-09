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
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Ingredient, Recipe, StockMovement, MovementType } from '../../types/restaurant';

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
    stockMovements,
    currentTenant,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<
    'kpis_and_stock' | 'reports' | 'recipes' | 'menu_management' | 'tables_management'
  >('kpis_and_stock');
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeItem, setSelectedRecipeItem] = useState<string>('menu-2');

  // Modals state
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [isNewIngredientModalOpen, setIsNewIngredientModalOpen] = useState(false);

  // Stock Intake Form State
  const [intakeIngredientId, setIntakeIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [intakeQuantity, setIntakeQuantity] = useState<number>(50000);
  const [intakeCost, setIntakeCost] = useState<number>(90000);
  const [intakeSupplier, setIntakeSupplier] = useState<string>('Mbeya Farmers Cooperative');
  const [intakeInvoiceRef, setIntakeInvoiceRef] = useState<string>('INV-2026-089');

  // Wastage Form State
  const [wastageIngredientId, setWastageIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [wastageQuantity, setWastageQuantity] = useState<number>(1500);
  const [wastageReason, setWastageReason] = useState<string>('Damaged during kitchen peel prep');

  // New Ingredient Form State
  const [newIngName, setNewIngName] = useState('');
  const [newIngPurchaseUnit, setNewIngPurchaseUnit] = useState('25kg Bag');
  const [newIngConsumptionUnit, setNewIngConsumptionUnit] = useState('grams');
  const [newIngConversionRatio, setNewIngConversionRatio] = useState(25000);
  const [newIngCost, setNewIngCost] = useState(65000);
  const [newIngStock, setNewIngStock] = useState(25000);
  const [newIngThreshold, setNewIngThreshold] = useState(5000);
  const [newIngSupplier, setNewIngSupplier] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages'>('Dry Goods');

  // KPI Calculations
  const totalStockValuation = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
      return sum + unitCost * ing.currentStockUnits;
    }, 0);
  }, [ingredients]);

  const lowStockItems = useMemo(() => {
    return ingredients.filter((ing) => ing.currentStockUnits <= ing.minimumThreshold);
  }, [ingredients]);

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

  // Recipe calculation for selected dish (WITHOUT description)
  const activeDish = menuItems.find((m) => m.id === selectedRecipeItem) || menuItems[0];
  const activeRecipe = recipes.find((r) => r.menuItemId === activeDish?.id);

  const recipeBreakdown = activeRecipe
    ? activeRecipe.ingredients.map((ri) => {
        const ingredient = ingredients.find((i) => i.id === ri.ingredientId);
        const unitCost = ingredient
          ? ingredient.costPerPurchaseUnit / ingredient.conversionRatio
          : 0;
        const totalCost = unitCost * ri.quantity;
        return {
          ingredient,
          quantity: ri.quantity,
          unitCost,
          totalCost,
        };
      })
    : [];

  const totalIngredientCost = recipeBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
  const sellingPrice = activeDish ? activeDish.price : 0;
  const grossContribution = Math.max(0, sellingPrice - totalIngredientCost);
  const foodCostPercentage = sellingPrice > 0 ? (totalIngredientCost / sellingPrice) * 100 : 0;

  // Handlers
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
    recordWastage(wastageIngredientId, Number(wastageQuantity), wastageReason);
    setIsWastageModalOpen(false);
  };

  const handleNewIngredientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName) return;
    addNewIngredient({
      name: newIngName,
      purchaseUnit: newIngPurchaseUnit,
      consumptionUnit: newIngConsumptionUnit,
      conversionRatio: Number(newIngConversionRatio),
      costPerPurchaseUnit: Number(newIngCost),
      currentStockUnits: Number(newIngStock),
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
            <h1 className="text-lg font-extrabold text-neutral-900 tracking-tight">
              Inventory & Food Cost Operations
            </h1>
            <p className="text-xs text-neutral-500">
              Manager intake portal, stockout prevention, wastage accounting & periodic movement reports
            </p>
          </div>
        </div>

        {/* Manager Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsIntakeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Receive Goods / Intake</span>
          </button>

          <button
            onClick={() => setIsWastageModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Log Spoilage / Wastage</span>
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
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 ${
            activeTab === 'kpis_and_stock'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200/60'
          }`}
        >
          Stock Balances & KPIs ({ingredients.length})
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
          <span>Periodic Movement Reports (Day/Week/Month)</span>
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
          <Boxes className="w-3.5 h-3.5" />
          <span>Floor Tables & Seating Zones</span>
        </button>
      </div>

      {/* TAB 1: Stock Balances & KPIs */}
      {activeTab === 'kpis_and_stock' && (
        <div className="space-y-6">
          {/* Inventory KPIs Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Total Stock Valuation
              </span>
              <div className="text-xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                {formatMoney(totalStockValuation)}
              </div>
              <span className="text-[10px] text-neutral-400">Current on-hand inventory value</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Turnover Rate
              </span>
              <div className="text-xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
                6.4 Days
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">High freshness rotation</span>
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

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Raw Ingredients
              </span>
              <div className="text-xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                {ingredients.length} SKU
              </div>
              <span className="text-[10px] text-neutral-400">Tracked in kitchen consumption units</span>
            </div>
          </div>

          {/* Low Stock Warning Alert if any */}
          {lowStockItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Stock Reorder Required:</span>{' '}
                  {lowStockItems.map((i) => `${i.name} (${i.currentStockUnits} ${i.consumptionUnit} left)`).join(' · ')}
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

          {/* Raw Ingredients Registry Table */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Raw Ingredients & Warehouse Balances</h3>
                <p className="text-xs text-neutral-500">Live balances, purchase-to-consumption conversions, and supplier links</p>
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
                    <th className="py-3 px-3.5">Ingredient Name</th>
                    <th className="py-3 px-3">Purchase Package</th>
                    <th className="py-3 px-3">Conversion Ratio</th>
                    <th className="py-3 px-3">Purchase Cost</th>
                    <th className="py-3 px-3">Current Stock</th>
                    <th className="py-3 px-3">Threshold</th>
                    <th className="py-3 px-3">Health Status</th>
                    <th className="py-3 px-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ingredients
                    .filter((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((ing) => {
                      const isLow = ing.currentStockUnits <= ing.minimumThreshold;
                      const currentValuation = (ing.costPerPurchaseUnit / ing.conversionRatio) * ing.currentStockUnits;

                      return (
                        <tr key={ing.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-3.5">
                            <div className="font-bold text-neutral-900">{ing.name}</div>
                            <div className="text-[10px] text-neutral-400">{ing.supplier}</div>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-neutral-800">{ing.purchaseUnit}</td>
                          <td className="py-3.5 px-3 font-mono text-neutral-600">
                            1 {ing.purchaseUnit} = {ing.conversionRatio.toLocaleString()} {ing.consumptionUnit}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-semibold text-neutral-900">
                            {formatMoney(ing.costPerPurchaseUnit)}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-neutral-900">
                            {ing.currentStockUnits.toLocaleString()} {ing.consumptionUnit}
                            <div className="text-[10px] text-neutral-400 font-normal">
                              Val: {formatMoney(currentValuation)}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-neutral-500">
                            {ing.minimumThreshold.toLocaleString()} {ing.consumptionUnit}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                isLow
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isLow ? 'LOW STOCK' : 'ADEQUATE'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setIntakeIngredientId(ing.id);
                                  setIntakeQuantity(ing.conversionRatio);
                                  setIntakeCost(ing.costPerPurchaseUnit);
                                  setIntakeSupplier(ing.supplier);
                                  setIsIntakeModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                              >
                                + Intake
                              </button>
                              <button
                                onClick={() => {
                                  setWastageIngredientId(ing.id);
                                  setIsWastageModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                Waste
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

      {/* TAB 2: Periodic Movement Reports (Day, Week, Month, Custom Date Filter) */}
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
                  Audit trail recording who received, cooked, or discarded stock with reference IDs
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
                                  : m.type === 'kitchen_consumption'
                                  ? 'bg-blue-100 text-blue-800'
                                  : m.type === 'wastage_spoilage'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {m.type.replace('_', ' ')}
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

      {/* TAB 3: Recipe BOM Costing (NO description shown anywhere) */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Dish Selection */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-neutral-900">Configured Menu Items</h3>
            <p className="text-xs text-neutral-500">Select any dish to inspect Bill of Materials</p>

            <div className="space-y-2 pt-2">
              {menuItems.map((item) => {
                const hasRecipe = recipes.some((r) => r.menuItemId === item.id);
                const isSelected = selectedRecipeItem === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedRecipeItem(item.id)}
                    className={`w-full text-left p-3 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold ring-1 ring-orange-500/20'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-[11px] font-normal text-neutral-400 font-mono">
                        {formatMoney(item.price)}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        hasRecipe ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {hasRecipe ? 'BOM Linked' : 'Direct Stock'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 2 Columns: BOM Breakdown & Food Cost Margin */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Recipe Breakdown
                  </span>
                  <h2 className="text-lg font-bold text-neutral-900">{activeDish?.name}</h2>
                </div>

                <div className="text-right">
                  <span className="text-xs text-neutral-400">Selling Price:</span>
                  <div className="text-base font-extrabold font-mono text-neutral-900">
                    {formatMoney(sellingPrice)}
                  </div>
                </div>
              </div>

              {/* Recipe Ingredients Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
                    <tr>
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3">Consumption Qty</th>
                      <th className="py-2.5 px-3">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Ingredient Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {recipeBreakdown.length > 0 ? (
                      recipeBreakdown.map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="py-2.5 px-3 font-semibold text-neutral-800">
                            {row.ingredient?.name || 'Raw Ingredient'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-neutral-600">
                            {row.quantity} {row.ingredient?.consumptionUnit}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-neutral-500">
                            {formatMoney(row.unitCost)} / {row.ingredient?.consumptionUnit}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-neutral-900">
                            {formatMoney(row.totalCost)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-neutral-400">
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
          </div>
        </div>
      )}

      {/* TAB 4: Menu Creator & Pricing */}
      {activeTab === 'menu_management' && (
        <div className="pt-2">
          <MenuManagementView />
        </div>
      )}

      {/* TAB 5: Floor Tables & Seating Zones */}
      {activeTab === 'tables_management' && (
        <div className="pt-2">
          <TableManagementView />
        </div>
      )}

      {/* MODAL 1: Receive Goods / Stock Intake */}
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
                Confirm & Add to Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Record Spoilage / Wastage */}
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
                    {ing.name} (Current: {ing.currentStockUnits.toLocaleString()} {ing.consumptionUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Quantity Lost / Wasted (in consumption units):
              </label>
              <input
                type="number"
                required
                value={wastageQuantity}
                onChange={(e) => setWastageQuantity(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
              />
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

      {/* MODAL 3: Add New Raw Ingredient */}
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
                <label className="text-xs font-semibold text-neutral-700">Ingredient Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice Extra Long"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
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
                <label className="text-xs font-semibold text-neutral-700">Kitchen Consumption Unit:</label>
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
                <label className="text-xs font-semibold text-neutral-700">Opening Stock Units:</label>
                <input
                  type="number"
                  required
                  value={newIngStock}
                  onChange={(e) => setNewIngStock(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Min. Alert Threshold:</label>
                <input
                  type="number"
                  required
                  value={newIngThreshold}
                  onChange={(e) => setNewIngThreshold(Number(e.target.value))}
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
    </div>
  );
};
