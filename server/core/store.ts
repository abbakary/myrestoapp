import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_LEAD_INQUIRIES,
  INITIAL_ORGANIZATIONS,
  INITIAL_PROVIDER_AUDIT_LOGS,
  INITIAL_SAAS_ACCOUNTS,
  INITIAL_BRANCHES,
  SAAS_PLANS,
  createInitialBranchStores,
  createStarterBranchStore,
} from '../../src/data/saasSeeds.ts';
import type { BranchWorkspaceStore } from '../../src/data/saasSeeds.ts';
import type { RestaurantTenant, SaasOrganization } from '../../src/types/restaurant.ts';
import type { PlatformState } from '../../src/shared/types.ts';
import { sanitizeBranchStore } from '../../src/shared/helpers.ts';
import { HttpError } from './http.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STATE_FILE = path.join(DATA_DIR, 'restaurantos-state.json');

function createSeedState(): PlatformState {
  return {
    organizations: structuredClone(INITIAL_ORGANIZATIONS),
    saasPlans: structuredClone(SAAS_PLANS),
    allBranches: structuredClone(INITIAL_BRANCHES),
    saasAccounts: structuredClone(INITIAL_SAAS_ACCOUNTS),
    providerAuditLogs: structuredClone(INITIAL_PROVIDER_AUDIT_LOGS),
    leadInquiries: structuredClone(INITIAL_LEAD_INQUIRIES),
    branchStores: createInitialBranchStores(),
  };
}

class StateRepository {
  private state: PlatformState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): PlatformState {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PlatformState>;
        if (
          parsed &&
          Array.isArray(parsed.organizations) &&
          Array.isArray(parsed.saasPlans) &&
          Array.isArray(parsed.allBranches) &&
          Array.isArray(parsed.saasAccounts) &&
          parsed.branchStores &&
          typeof parsed.branchStores === 'object'
        ) {
          const sanitizedStores = Object.fromEntries(
            Object.entries(parsed.branchStores).map(([branchId, store]) => [
              branchId,
              sanitizeBranchStore(store),
            ])
          );
          return {
            organizations: parsed.organizations,
            saasPlans: parsed.saasPlans,
            allBranches: parsed.allBranches,
            saasAccounts: parsed.saasAccounts,
            providerAuditLogs: parsed.providerAuditLogs || [],
            leadInquiries: parsed.leadInquiries || [],
            branchStores: sanitizedStores,
          };
        }
      }
    } catch (err) {
      console.warn('[StateRepository] Could not load persisted state, falling back to seeds:', err);
    }
    const seed = createSeedState();
    this.persistToDisk(seed);
    return seed;
  }

  private persistToDisk(snapshot: PlatformState) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmpFile = `${STATE_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(snapshot), 'utf-8');
      fs.renameSync(tmpFile, STATE_FILE);
    } catch (err) {
      console.error('[StateRepository] Failed to persist state:', err);
    }
  }

  getState(): PlatformState {
    return this.state;
  }

  commit(): PlatformState {
    this.persistToDisk(this.state);
    return this.state;
  }

  reset(): PlatformState {
    this.state = createSeedState();
    this.persistToDisk(this.state);
    return this.state;
  }

  getOrgOrThrow(orgId: string): SaasOrganization {
    const org = this.state.organizations.find((o) => o.id === orgId);
    if (!org) {
      throw new HttpError(404, `Organization "${orgId}" not found.`, 'ORG_NOT_FOUND');
    }
    return org;
  }

  getBranchOrThrow(branchId: string): RestaurantTenant {
    const branch = this.state.allBranches.find((b) => b.id === branchId);
    if (!branch) {
      throw new HttpError(404, `Branch "${branchId}" not found.`, 'BRANCH_NOT_FOUND');
    }
    return branch;
  }

  getBranchInOrgOrThrow(orgId: string, branchId: string): RestaurantTenant {
    this.getOrgOrThrow(orgId);
    const branch = this.state.allBranches.find((b) => b.id === branchId && b.organizationId === orgId);
    if (!branch) {
      throw new HttpError(
        404,
        `Branch "${branchId}" does not belong to organization "${orgId}".`,
        'BRANCH_NOT_FOUND'
      );
    }
    return branch;
  }

  getBranchStoreOrThrow(branchId: string): BranchWorkspaceStore {
    const branch = this.getBranchOrThrow(branchId);
    if (!this.state.branchStores[branchId]) {
      const org = this.getOrgOrThrow(branch.organizationId);
      this.state.branchStores[branchId] = createStarterBranchStore(branch, org);
    }
    return this.state.branchStores[branchId];
  }
}

export const storeRepo = new StateRepository();
