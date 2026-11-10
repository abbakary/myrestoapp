export type OrderType = 'dine_in' | 'pickup' | 'delivery';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'sent_to_kitchen'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'dispatched'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export type PaymentMethod = 'cash' | 'mpesa' | 'airtel' | 'card' | 'bank_transfer' | 'split';

export type KitchenStation = 'hot_kitchen' | 'grill' | 'drinks' | 'bakery' | 'dessert';

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

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  portion?: string;
  selectedModifiers: ModifierItem[];
  customerNotes?: string;
  station: KitchenStation;
  status: 'pending' | 'preparing' | 'ready';
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. #F0027
  tenantId: string;
  type: OrderType;
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
}

export interface Recipe {
  id: string;
  menuItemId: string;
  name?: string;
  batchYieldPlates: number; // Mandatory: Number of plates batch produces (e.g. 100 plates for Wali Nyama)
  version: number; // Recipe versioning (v1, v2)
  cookingMethod: 'batch_cooking' | 'on_sale_order'; // Batch pot/buffet vs made-to-order
  ingredients: RecipeIngredient[];
  preparationInstructions?: string;
  isAiGenerated?: boolean;
  aiConfidence?: number;
  approvedBy?: string;
  approvedAt?: string;
}

export interface MissingStockItem {
  ingredientId: string;
  ingredientName: string;
  requiredQty: number; // in consumption units
  availableKitchenQty: number;
  storeAvailableQty: number;
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
