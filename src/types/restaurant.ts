export type OrderType = 'dine_in' | 'pickup' | 'delivery';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'sent_to_kitchen'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'dispatched'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export type PaymentMethod = 'cash' | 'mpesa' | 'airtel' | 'card' | 'bank_transfer' | 'split';

export type KitchenStation =
  | 'hot_kitchen'
  | 'grill'
  | 'drinks'
  | 'bakery'
  | 'dessert'
  | 'pastry'
  | 'cold_prep'
  | 'beverage';

export type Role = 'owner' | 'manager' | 'cashier' | 'reception' | 'waiter' | 'kitchen' | 'customer';

export type ProductionMethod = 'recipe_bom' | 'semi_standardized' | 'direct_stock';

export type RecipeStatus = 'draft' | 'testing' | 'approved' | 'archived';

export type BomDeductionPolicy = 'on_kitchen_start' | 'on_order_submit' | 'on_payment';

export interface ModifierItem {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  image: string;
  preparationTimeMinutes: number;
  isAvailable: boolean;
  station: KitchenStation;
  portions?: { name: string; priceDelta: number }[];
  modifiers?: ModifierItem[];
  recipeId?: string;
  tags?: string[];
}

export type OrderItemStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'rejected';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  portion?: string;
  selectedModifiers: ModifierItem[];
  customerNotes?: string;
  customInstructions?: string;
  extraCharge?: number;
  isCustomItem?: boolean;
  promotedToMenuId?: string;
  station: KitchenStation;
  status: OrderItemStatus;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  method: Exclude<PaymentMethod, 'split'>;
  amount: number;
  receivedBy: string;
  transactionRef?: string;
  timestamp: string;
  isRefund?: boolean;
}

export interface OrderAdjustment {
  id: string;
  orderId: string;
  type: 'addition' | 'discount' | 'price_change' | 'void_item' | 'cancellation' | 'refund';
  originalAmount: number;
  newAmount: number;
  difference: number;
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'approved' | 'pending' | 'rejected';
  timestamp: string;
}

export interface ApprovalRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  actionType: 'discount' | 'void_item' | 'price_change' | 'cancel_order' | 'refund';
  requestedBy: string;
  requestedRole: Role;
  details: string;
  amountImpact: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  payload?: {
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    itemIndex?: number;
    newUnitPrice?: number;
  };
}

export interface AuditLogEntry {
  id: string;
  orderId?: string;
  orderNumber?: string;
  actor: string;
  actorRole: Role;
  action: string;
  details: string;
  timestamp: string;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  actor: string;
  note?: string;
  timestamp: string;
}

export interface DiscrepancyAlert {
  id: string;
  severity: 'critical' | 'warning';
  type: 'served_unpaid' | 'rejected_item' | 'unapproved_adjustment' | 'overdue_open' | 'partial_balance';
  orderId: string;
  orderNumber: string;
  title: string;
  detail: string;
  amountImpact: number;
}

export type CommissionMode = 'percent' | 'fixed';

export interface Order {
  id: string;
  orderNumber: string; // e.g. #F0027
  kotNumber?: string; // e.g. KOT-154647
  serviceCouponCode?: string; // e.g. SV-4827
  tenantId: string;
  type: OrderType;
  priority?: 'normal' | 'rush' | 'vip';
  tableNumber?: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  referralWaiterId?: string;
  servingWaiterId?: string;
  subtotal: number;
  originalAmount?: number;
  discount: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  discountReason?: string;
  tax: number;
  taxRate?: number;
  isTaxExempt?: boolean;
  deliveryFee: number;
  donation: number;
  total: number;
  paidAmount: number;
  payments?: PaymentTransaction[];
  adjustments?: OrderAdjustment[];
  statusHistory?: OrderStatusHistoryItem[];
  cancellationRecord?: {
    cancelledBy: string;
    approvedBy?: string;
    reason: string;
    timestamp: string;
  };
  commissionMode?: CommissionMode;
  commissionValue?: number;
  commissionAmount?: number;
  commissionConfiguredBy?: string;
  commissionUpdatedAt?: string;
  stockDeducted?: boolean;
  stockDeductionStage?: string;
  reversedStock?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Table {
  id: string;
  number: string;
  capacity: number;
  zone?: 'Main Dining' | 'Terrace & Patio' | 'VIP Lounge' | 'Bar Area';
  status: 'available' | 'occupied' | 'reserved' | 'billing';
  currentOrderId?: string;
  assignedWaiterId?: string;
}

export interface Waiter {
  id: string;
  name: string;
  phone: string;
  email: string;
  referralCode: string;
  avatar?: string;
  active: boolean;
  commissionRate: number;
}

export interface AdvanceRecord {
  id: string;
  amount: number;
  date: string;
  approved: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'deducted' | 'repaid';
  reason: string;
  approvedBy?: string;
  repaymentMonth?: string;
  deductedInPayrollId?: string;
}

export interface PayrollPaymentRecord {
  id: string;
  period: string; // e.g. '2026-11'
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  commission: number;
  grossPay: number;
  nssfDeduction: number;
  payeTax: number;
  advanceDeducted: number;
  netPaid: number;
  method: 'bank_transfer' | 'mpesa' | 'cash';
  reference: string;
  paidAt: string;
  paidBy: string;
}

export interface CommissionPayoutLog {
  id: string;
  waiterId: string;
  waiterName: string;
  amount: number;
  method: 'cash' | 'mpesa' | 'bank_transfer';
  reference: string;
  settledAt: string;
  settledBy: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  position: string;
  branch: string;
  salaryType: 'monthly' | 'daily' | 'hourly';
  baseSalary: number;
  allowances?: number;
  tinNumber?: string;
  nssfNumber?: string;
  bankAccount?: string;
  paymentMethod?: 'bank_transfer' | 'mpesa' | 'cash';
  joinedDate: string;
  status: 'active' | 'on_leave' | 'inactive';
  advances: AdvanceRecord[];
}

export interface Ingredient {
  id: string;
  name: string;
  purchaseUnit: string; // e.g. "20L Container", "25kg Bag", "Crate"
  consumptionUnit: string; // e.g. "ml", "grams", "bottle", "pcs"
  conversionRatio: number; // 1 purchaseUnit = X consumptionUnits
  costPerPurchaseUnit: number;
  lastUnitCost?: number; // Latest invoice unit cost in consumption units
  valuationMethod?: 'weighted_avg' | 'fifo';
  currentStockUnits: number; // total = storeStockUnits + kitchenStockUnits
  storeStockUnits: number; // Main warehouse / store stock
  kitchenStockUnits: number; // Kitchen floor / daily operations stock
  minimumThreshold: number;
  supplier: string;
  category?: 'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages';
  allergens?: string[];
  shelfLifeDays?: number;
  directConsumptionOnly?: boolean; // e.g. frying oil, charcoal, cleaning supplies
}

export interface StockBatchLot {
  id: string;
  ingredientId: string;
  lotNumber: string;
  location: 'main_store' | 'kitchen';
  initialQty: number;
  remainingQty: number;
  unit: string;
  unitCost: number; // cost per consumption unit
  receivedDate: string;
  expiryDate?: string;
  supplier?: string;
  invoiceRef?: string;
}

export type MovementType =
  | 'purchase_intake'
  | 'kitchen_consumption'
  | 'direct_consumption'
  | 'production_issue'
  | 'production_output'
  | 'production_reversal'
  | 'wastage_spoilage'
  | 'manual_adjustment'
  | 'reconciliation_adjustment'
  | 'stock_transfer';

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: MovementType;
  quantityDelta: number; // + or - in consumption units
  unit: string;
  costImpact: number;
  date: string;
  reference?: string;
  reason?: string;
  recordedBy: string;
  sourceLocation?: 'main_store' | 'kitchen';
  destinationLocation?: 'main_store' | 'kitchen';
  transferStatus?: 'in_transit' | 'received' | 'rejected';
  receivedAt?: string;
  receivedBy?: string;
  batchNumber?: string;
  recipeId?: string;
  isReversed?: boolean;
  reversalOfId?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'stock' | 'transfer' | 'kitchen' | 'payroll';
  timestamp: string;
  read: boolean;
  actionRole?: Role;
  actionLabel?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number; // in consumption units per single plate (or per unit for sub-recipe)
  batchQuantity?: number; // e.g. 20000 for 20kg batch
  batchUnit?: string; // e.g. "kg", "L", "pcs", "g", "ml", "portions"
  yieldPercentage?: number; // e.g. 90% for onions, 55% for whole fish
  notes?: string;
  isSubRecipe?: boolean;
  subRecipeId?: string;
  subRecipeQuantity?: number; // e.g. 50g Tomato Sauce per plate, or 1 portion Beef Stew
  subRecipeUnit?: string; // e.g. "grams", "ml", "portions"
  substituteIngredientId?: string;
  isOptional?: boolean;
}

export interface RecipeVariant {
  id: string;
  name: string; // Matches MenuItem portion name e.g. "Small", "Regular", "Large"
  portionMultiplier: number; // e.g. 0.75, 1.0, 1.4
  ingredientOverrides?: { ingredientId: string; quantity: number }[];
  notes?: string;
}

export interface RecipeModifierRule {
  id: string;
  modifierName: string; // e.g. "Extra Chicken Piece", "No Onions", "Boiled Egg Add-on"
  action: 'add' | 'remove' | 'substitute';
  ingredientId: string;
  quantityDelta: number; // positive for add, or absolute quantity to remove/replace
  substituteIngredientId?: string;
}

export interface RecipeVersionHistoryItem {
  version: number;
  changedAt: string;
  changedBy: string;
  changeSummary: string;
  batchYieldPlates: number;
  ingredients: RecipeIngredient[];
  totalBatchCost: number;
  costPerPlate: number;
  foodCostPercentage: number;
  name?: string;
  cookingMethod?: 'batch_cooking' | 'on_sale_order';
  productionMethod?: ProductionMethod;
  preparationInstructions?: string;
  cookingInstructions?: string;
  archivedAt?: string;
  archivedBy?: string;
  totalCostPerPlate?: number;
}

export interface Recipe {
  id: string;
  code?: string; // e.g. "RCP-001", "SUB-001"
  menuItemId?: string;
  name?: string;
  category?: string;
  productionLocation?: KitchenStation | 'prep_kitchen';
  productionMethod?: ProductionMethod; // Method 1: recipe_bom | Method 2: semi_standardized | Method 3: direct_stock
  status?: RecipeStatus; // draft | testing | approved | archived
  standardPortionSize?: string; // e.g. "350g Plate", "5 kg Usable"
  yieldUnit?: string; // "plates" | "grams" | "ml" | "portions"
  expectedYieldPct?: number; // e.g. 92
  batchYieldPlates: number; // Portions or usable qty produced by 1 standard batch
  version: number;
  cookingMethod: 'batch_cooking' | 'on_sale_order';
  ingredients: RecipeIngredient[];
  preparationInstructions?: string;
  cookingInstructions?: string;
  allergens?: string[];
  shelfLifeHours?: number;
  variants?: RecipeVariant[];
  modifierRules?: RecipeModifierRule[];
  isSubRecipe?: boolean;
  history?: RecipeVersionHistoryItem[];
  isAiGenerated?: boolean;
  aiConfidence?: number;
  approvedBy?: string;
  approvedAt?: string;
  costSnapshotAt?: string;
}

export interface SubRecipeStockBatch {
  id: string;
  batchNumber: string; // e.g. "SUB-20261119-01"
  subRecipeId: string;
  name: string;
  producedQty: number;
  remainingQty: number;
  unit: string; // "grams" | "ml" | "portions"
  totalCost: number;
  costPerUnit: number; // TZS per gram/ml/portion
  preparedAt: string;
  expiresAt: string;
  preparedBy: string;
  status: 'available' | 'low' | 'expired' | 'consumed' | 'reversed';
}

export interface BlockedCookingAttempt {
  id: string;
  recipeId: string;
  dishName: string;
  batches: number;
  attemptedBy: string;
  timestamp: string;
  missingItems: MissingStockItem[];
  reason: string;
  resolution?: 'requisition_created' | 'manager_override' | 'cancelled';
}

export interface DailyReconciliationItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  openingKitchenStock: number;
  transferredToKitchen: number;
  theoreticalUsage: number;
  actualUsage?: number;
  expectedClosingStock: number;
  actualCountedStock: number;
  varianceQty: number;
  varianceCost: number;
  varianceType: 'match' | 'over_portioning' | 'unaccounted_loss' | 'surplus';
  status: 'pending' | 'reconciled';
  notes?: string;
}

export interface MissingStockItem {
  ingredientId: string;
  ingredientName: string;
  requiredQty: number; // in consumption units
  availableKitchenQty: number;
  storeAvailableQty: number;
  inTransitQty?: number;
  unit: string;
  status: 'not_transferred' | 'insufficient' | 'ok';
  shortageQty: number;
  isSubRecipe?: boolean;
  subRecipeId?: string;
  substituteIngredientId?: string;
  substituteIngredientName?: string;
  substituteKitchenQty?: number;
}

export interface ProductionLog {
  id: string;
  batchNumber?: string;
  recipeId: string;
  recipeVersion?: number;
  menuItemId: string;
  dishName: string;
  productionType?: 'batch_finished' | 'sub_recipe' | 'semi_standardized';
  batchesCooked: number;
  targetYieldPlates: number;
  actualPlatesProduced: number;
  unitLabel?: string;
  totalCost: number;
  costPerPlate: number;
  cookedBy: string;
  timestamp: string;
  expiryDate?: string;
  remainingPlates: number;
  status?: 'completed' | 'partial' | 'reversed';
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  ingredientsConsumed: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    cost: number;
    isSubRecipe?: boolean;
    subRecipeId?: string;
  }[];
  actualInputAdjustments?: {
    ingredientId: string;
    ingredientName: string;
    standardQty: number;
    actualQty: number;
    unit: string;
  }[];
  managerOverride?: boolean;
  overrideReason?: string;
}

export interface PreparedDishStock {
  menuItemId: string;
  dishName: string;
  preparedPlatesAvailable: number;
  totalCookedToday: number;
  totalSoldToday: number;
  lastCookedAt: string;
  status: 'ready' | 'low' | 'out_of_stock';
}

export interface BomAuditLog {
  id: string;
  recipeId: string;
  dishName: string;
  rawInputText: string;
  suggestedIngredientsCount: number;
  approvedIngredientsCount: number;
  avgConfidence: number;
  anomaliesDetected: string[];
  approvedBy: string;
  timestamp: string;
  totalCostPerPlate: number;
  foodCostPercentage: number;
}

export interface AiParsedLineItem {
  rawText: string;
  rawIngredientName: string;
  matchedIngredientId: string | null;
  matchedIngredientName: string;
  confidence: number;
  quantityPerBatch: number;
  rawUnit: string;
  normalizedBaseQuantity: number;
  baseUnit: string;
  typicalYieldPercentage: number;
  notes?: string;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface AiParsedBOMResult {
  recipeName: string;
  batchPortions: number;
  prepInstructions?: string;
  lines: AiParsedLineItem[];
  anomalies: string[];
}

export interface RestaurantTenant {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  operatingModel: 'dine_in_restaurant' | 'fast_food_chips' | 'cafe_bistro';
  phone: string;
  address: string;
  operatingHours: string;
  logo: string;
  bannerImage: string;
  currency: 'TZS' | 'USD';
  currencyRate: number;
  taxRate: number;
  deliveryFee: number;
}
