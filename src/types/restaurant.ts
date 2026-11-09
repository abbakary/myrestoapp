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
  currentStockUnits: number; // in consumption units
  minimumThreshold: number;
  supplier: string;
  category?: 'Produce' | 'Meat & Seafood' | 'Dry Goods' | 'Oils & Dairy' | 'Beverages';
}

export type MovementType = 'purchase_intake' | 'kitchen_consumption' | 'wastage_spoilage' | 'manual_adjustment';

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: MovementType;
  quantityDelta: number; // + or - in consumption units
  unit: string;
  costImpact: number;
  date: string;
  reference?: string; // e.g. "PO-8819", "Order #F0027", "Manager Audit"
  reason?: string;
  recordedBy: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number; // in consumption units
}

export interface Recipe {
  id: string;
  menuItemId: string;
  ingredients: RecipeIngredient[];
  preparationInstructions?: string;
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
