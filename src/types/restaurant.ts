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
  serviceCouponCode?: string; // e.g. SV-4827 (for easy counter/waiter/kitchen/reception service verification)
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
  referralWaiterId?: string; // Waiter whose link was used or QR was scanned
  servingWaiterId?: string; // Waiter who physically served the order
  subtotal: number;
  originalAmount?: number;
  discount: number; // monetary discount amount
  discountType?: 'percent' | 'fixed';
  discountValue?: number; // e.g. 10 for 10% or 5000 for 5,000 TZS
  discountReason?: string;
  tax: number;
  taxRate?: number; // e.g. 0.18 or 0 if tax removed
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
  commissionValue?: number; // e.g. 5 for 5%, or 2000 for TZS 2,000 fixed per order
  commissionAmount?: number; // Snapshot in TZS credited once order is paid
  commissionConfiguredBy?: string; // Manager / Owner / Auto Rule
  commissionUpdatedAt?: string;
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
  referralCode: string; // e.g. WAITER_JOHN
  avatar?: string;
  active: boolean;
  commissionRate: number; // e.g. 0.05 (5%)
}

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  phone: string;
  role: Role;
  position: string;
  branch: string;
  salaryType: 'monthly' | 'daily' | 'hourly';
  baseSalary: number;
  joinedDate: string;
  status: 'active' | 'on_leave' | 'inactive';
  advances: { id: string; amount: number; date: string; approved: boolean; reason: string }[];
}

export interface Ingredient {
  id: string;
  name: string;
  purchaseUnit: string; // e.g. "20L Container", "25kg Bag", "Crate"
  consumptionUnit: string; // e.g. "ml", "grams", "bottle"
  conversionRatio: number; // 1 purchaseUnit = X consumptionUnits
  costPerPurchaseUnit: number;
  currentStockUnits: number; // total = storeStockUnits + kitchenStockUnits
  storeStockUnits: number; // Main warehouse / store stock
  kitchenStockUnits: number; // Kitchen floor / daily operations stock
  minimumThreshold: number;
  supplier: string;
  category?: 'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages';
}

export type MovementType =
  | 'purchase_intake'
  | 'kitchen_consumption'
  | 'wastage_spoilage'
  | 'manual_adjustment'
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
  reference?: string; // e.g. "PO-8819", "Order #F0027", "Manager Audit", "TRF-KITCHEN-01"
  reason?: string;
  recordedBy: string;
  sourceLocation?: 'main_store' | 'kitchen';
  destinationLocation?: 'main_store' | 'kitchen';
  transferStatus?: 'in_transit' | 'received' | 'rejected';
  receivedAt?: string;
  receivedBy?: string;
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
  quantity: number; // in consumption units per single plate (auto: batchQuantity / batchYieldPlates)
  batchQuantity?: number; // e.g. 20,000g for 20kg batch
  batchUnit?: string; // e.g. "kg", "L", "pcs", "g"
  yieldPercentage?: number; // e.g. 90% for onions, 55% for whole fish
  notes?: string;
  isSubRecipe?: boolean; // sub-recipe flag (e.g. Beef stew base used inside Wali Nyama, Ugali Nyama)
  subRecipeId?: string;
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
  preparationInstructions?: string;
  archivedAt?: string;
  archivedBy?: string;
  totalCostPerPlate?: number;
}

export interface Recipe {
  id: string;
  menuItemId?: string;
  name?: string;
  batchYieldPlates: number; // Mandatory: Number of plates batch produces (e.g. 100 plates for Wali Nyama)
  version: number; // Recipe versioning (v1, v2)
  cookingMethod: 'batch_cooking' | 'on_sale_order'; // Batch pot/buffet vs made-to-order
  ingredients: RecipeIngredient[];
  preparationInstructions?: string;
  isSubRecipe?: boolean; // allow sub-recipes (e.g. "Beef Stew Base" used in Wali Nyama, Ugali Nyama)
  history?: RecipeVersionHistoryItem[]; // Recipe version history
  isAiGenerated?: boolean;
  aiConfidence?: number;
  approvedBy?: string;
  approvedAt?: string;
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
  inTransitQty?: number; // Stock currently in transit from store awaiting kitchen confirmation
  unit: string;
  status: 'not_transferred' | 'insufficient' | 'ok';
  shortageQty: number;
}

export interface ProductionLog {
  id: string;
  recipeId: string;
  menuItemId: string;
  dishName: string;
  batchesCooked: number; // e.g. 1 batch or 0.5 batch
  targetYieldPlates: number; // e.g. 100
  actualPlatesProduced: number; // e.g. 90 plates (allows real yield variance)
  totalCost: number;
  costPerPlate: number;
  cookedBy: string;
  timestamp: string;
  remainingPlates: number;
  ingredientsConsumed: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    cost: number;
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
  confidence: number; // 0 - 100
  quantityPerBatch: number;
  rawUnit: string;
  normalizedBaseQuantity: number; // consumption unit per 1 plate
  baseUnit: string;
  typicalYieldPercentage: number; // e.g. 90%
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
  currencyRate: number; // 1 USD = 2600 TZS
  taxRate: number; // 0.18 for 18% VAT
  deliveryFee: number;
}
