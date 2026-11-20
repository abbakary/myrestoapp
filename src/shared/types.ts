import type {
  SaasOrganization,
  SaasPlanDefinition,
  RestaurantTenant,
  SaasAccount,
  ProviderAuditEvent,
  PlatformLeadInquiry,
} from '../types/restaurant.ts';
import type { BranchCartItem, BranchWorkspaceStore } from '../data/saasSeeds.ts';

export interface PlatformState {
  organizations: SaasOrganization[];
  saasPlans: SaasPlanDefinition[];
  allBranches: RestaurantTenant[];
  saasAccounts: SaasAccount[];
  providerAuditLogs: ProviderAuditEvent[];
  leadInquiries: PlatformLeadInquiry[];
  branchStores: Record<string, BranchWorkspaceStore>;
}

export type CartItem = BranchCartItem;

export interface ScaledRequirementRow {
  key: string;
  ingredientId: string;
  ingredientName: string;
  isSubRecipe: boolean;
  subRecipeId?: string;
  requiredQty: number;
  unit: string;
  availableKitchenQty: number;
  availableStoreQty: number;
  reservedQty: number;
  totalAvailableQty: number;
  netUnreservedTotalQty: number;
  kitchenShortageQty: number;
  globalShortageQty: number;
  status: 'ok' | 'kitchen_short_store_ok' | 'shortage';
  unitCost: number;
  estimatedCost: number;
  substituteIngredientId?: string;
  substituteIngredientName?: string;
  substituteAvailableQty?: number;
  usedSubstituteName?: string;
}

export interface ScaledRequirementsResult {
  rows: ScaledRequirementRow[];
  canProduceFromKitchen: boolean;
  canProduceWithStore: boolean;
  totalEstimatedCost: number;
  maxProduciblePortions: number;
}
