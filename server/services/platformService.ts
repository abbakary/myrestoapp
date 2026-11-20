import { SAAS_PLANS, createStarterBranchStore } from '../../src/data/saasSeeds.ts';
import type {
  PlatformLeadInquiry,
  ProviderAuditEvent,
  RestaurantTenant,
  SaasAccount,
  SaasAccountRole,
  SaasAccountStatus,
  SaasOrganization,
  SaasPlanDefinition,
  SaasPlanId,
  SaasTenantStatus,
} from '../../src/types/restaurant.ts';
import {
  computeProviderStatsPure,
  computeProviderTenantSummariesPure,
} from '../../src/shared/analyticsEngine.ts';
import {
  createId,
  nowTimestampStr,
  slugify,
  todayDateStr,
} from '../../src/shared/helpers.ts';
import { HttpError } from '../core/http.ts';
import { storeRepo } from '../core/store.ts';

function recordProviderAuditInternal(
  action: string,
  target: string,
  details: string,
  actor?: { name: string; email: string }
) {
  const state = storeRepo.getState();
  const entry: ProviderAuditEvent = {
    id: createId('paud'),
    actorName: actor?.name || 'System Provider Admin',
    actorEmail: actor?.email || 'provider@restaurantos.io',
    action,
    target,
    details,
    timestamp: nowTimestampStr(),
  };
  state.providerAuditLogs.unshift(entry);
  return entry;
}

export const platformService = {
  getPublicPlans() {
    return storeRepo.getState().saasPlans.filter((p) => p.status === 'active' && p.isPublic);
  },

  submitLeadInquiry(params: {
    id?: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    branchesCount: number;
    planInterest: SaasPlanId;
    notes: string;
  }): PlatformLeadInquiry {
    const state = storeRepo.getState();
    const newLead: PlatformLeadInquiry = {
      id: params.id || createId('lead'),
      companyName: params.companyName.trim(),
      contactName: params.contactName.trim(),
      email: params.email.trim().toLowerCase(),
      phone: params.phone.trim(),
      branchesCount: Math.max(1, Math.round(params.branchesCount || 1)),
      planInterest: params.planInterest,
      notes: (params.notes || '').trim(),
      status: 'new',
      createdAt: nowTimestampStr(),
    };
    state.leadInquiries.unshift(newLead);
    storeRepo.commit();
    return newLead;
  },

  loginWithCredentials(email: string, password: string) {
    const state = storeRepo.getState();
    const cleanEmail = email.trim().toLowerCase();
    const account = state.saasAccounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!account || account.password !== password) {
      throw new HttpError(401, 'Invalid email address or password.', 'INVALID_CREDENTIALS');
    }
    if (account.status === 'pending') {
      throw new HttpError(
        403,
        'Account is awaiting System Provider activation. Sign in as System Provider to approve this account.',
        'ACCOUNT_PENDING'
      );
    }
    if (account.status === 'suspended') {
      throw new HttpError(
        403,
        'This user account has been suspended by the System Provider.',
        'ACCOUNT_SUSPENDED'
      );
    }

    const nowLabel = nowTimestampStr();
    if (account.role === 'provider_admin') {
      account.lastLoginAt = nowLabel;
      storeRepo.commit();
      return {
        success: true,
        account,
        surface: 'provider' as const,
      };
    }

    const targetOrg = state.organizations.find((o) => o.id === account.organizationId);
    if (!targetOrg) {
      throw new HttpError(404, 'No tenant organization is linked to this account.', 'ORG_NOT_FOUND');
    }
    if (targetOrg.status === 'suspended') {
      throw new HttpError(
        403,
        `${targetOrg.name} subscription is currently suspended by System Provider. Reactivate tenant in Provider Control.`,
        'TENANT_SUSPENDED'
      );
    }

    account.lastLoginAt = nowLabel;
    const orgBranches = state.allBranches.filter((b) => b.organizationId === targetOrg.id);
    const preferredBranch =
      (account.branchId && orgBranches.find((b) => b.id === account.branchId)) ||
      orgBranches.find((b) => b.isHqBranch) ||
      orgBranches[0];

    storeRepo.commit();
    return {
      success: true,
      account,
      organization: targetOrg,
      branch: preferredBranch,
      surface: 'erp' as const,
    };
  },

  createSaasTenant(params: {
    orgName: string;
    ownerName: string;
    ownerEmail: string;
    branchName: string;
    branchCode: string;
    operatingModel: RestaurantTenant['operatingModel'];
    phone: string;
    address: string;
    plan?: SaasPlanId;
    status?: SaasTenantStatus;
    password?: string;
    orgId?: string;
    branchId?: string;
    accountId?: string;
  }) {
    const state = storeRepo.getState();
    const slug = slugify(params.orgName, 'tenant');
    const domain = `${slug.replace(/-/g, '')}.co.tz`;
    const orgId = params.orgId || `org-${slug}-${Date.now()}`;
    const chosenPlan =
      state.saasPlans.find((p) => p.id === (params.plan || 'Enterprise Multi-Branch') || p.name === params.plan) ||
      state.saasPlans[state.saasPlans.length - 1] ||
      SAAS_PLANS[2];

    const nextMonth = new Date(
      Date.now() + (params.status === 'trial' ? chosenPlan.trialDays : 30) * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0];

    const newOrg: SaasOrganization = {
      id: orgId,
      name: params.orgName.trim(),
      slug,
      plan: chosenPlan.id,
      status: params.status || 'active',
      monthlyFeeTzs: chosenPlan.monthlyFeeTzs,
      maxBranches: chosenPlan.maxBranches,
      billingStatus: params.status === 'trial' ? 'pending' : 'paid',
      nextBillingDate: nextMonth,
      country: 'Tanzania',
      ownerName: params.ownerName.trim() || 'Tenant Owner',
      ownerEmail: params.ownerEmail.trim() || `owner@${domain}`,
      hqEmail: `hq@${domain}`,
      domain,
      logo: '🏢',
      currency: 'TZS',
      currencyRate: 2600,
      createdAt: todayDateStr(),
    };

    const branchId = params.branchId || `branch-${slug}-hq-${Date.now()}`;
    const branchCode = params.branchCode.trim().toUpperCase() || 'HQ-01';
    const hqBranch: RestaurantTenant = {
      id: branchId,
      organizationId: orgId,
      branchCode,
      isHqBranch: true,
      status: 'active',
      name: params.branchName.trim() || `${params.orgName.trim()} — Main HQ`,
      slug: `${slug}-hq`,
      tagline: `${params.orgName.trim()} Flagship Location`,
      operatingModel: params.operatingModel,
      phone: params.phone.trim() || '+255 700 000 000',
      email: `hq@${domain}`,
      managerName: newOrg.ownerName,
      managerEmail: newOrg.ownerEmail,
      address: params.address.trim() || 'Dar es Salaam, Tanzania',
      operatingHours: '08:00 AM – 11:00 PM (Daily)',
      logo: '🏢',
      bannerImage: '/src/assets/images/hero_restaurant_dining_1794223268333.jpg',
      currency: 'TZS',
      currencyRate: 2600,
      taxRate: 0.18,
      deliveryFee: 4000,
    };

    const starterStore = createStarterBranchStore(hqBranch, newOrg);
    state.organizations.push(newOrg);
    state.allBranches.push(hqBranch);
    state.branchStores[branchId] = starterStore;

    const newOwnerAccount: SaasAccount = {
      id: params.accountId || createId('acc'),
      name: newOrg.ownerName,
      email: newOrg.ownerEmail,
      password: params.password || 'tenant123',
      role: 'tenant_owner',
      status: 'active',
      organizationId: orgId,
      phone: params.phone.trim() || '+255 700 000 000',
      lastLoginAt: nowTimestampStr(),
      createdAt: todayDateStr(),
    };

    if (!state.saasAccounts.some((a) => a.email.toLowerCase() === newOwnerAccount.email.toLowerCase())) {
      state.saasAccounts.unshift(newOwnerAccount);
    }

    storeRepo.commit();
    return { org: newOrg, branch: hqBranch, account: newOwnerAccount };
  },

  registerTenantAccount(params: {
    orgId?: string;
    branchId?: string;
    accountId?: string;
    orgName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
    plan: SaasPlanId;
    operatingModel: RestaurantTenant['operatingModel'];
    branchName: string;
    branchCode: string;
    phone: string;
    address: string;
  }) {
    const state = storeRepo.getState();
    const cleanEmail = params.ownerEmail.trim().toLowerCase();
    if (!cleanEmail || !params.orgName.trim() || !params.ownerName.trim() || params.password.length < 4) {
      throw new HttpError(422, 'Complete all required fields (password minimum 4 characters).', 'VALIDATION_ERROR');
    }
    if (state.saasAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      throw new HttpError(409, 'An account with this email already exists. Please sign in instead.', 'EMAIL_EXISTS');
    }

    const created = this.createSaasTenant({
      ...params,
      ownerEmail: cleanEmail,
      status: 'trial',
    });

    recordProviderAuditInternal(
      'TENANT_SELF_REGISTERED',
      `${created.org.name} (${created.org.plan})`,
      `Self-onboarded 14-day trial with flagship branch ${created.branch.branchCode}.`,
      { name: created.account.name, email: created.account.email }
    );
    storeRepo.commit();
    return created;
  },

  quickLaunchWorkspace(preset: 'provider' | 'savanna_hq' | 'kona_hq' | 'cashier_pos') {
    const state = storeRepo.getState();
    if (preset === 'provider') {
      const prov = state.saasAccounts.find((a) => a.role === 'provider_admin') || state.saasAccounts[0];
      return { account: prov, surface: 'provider' as const };
    }
    if (preset === 'kona_hq') {
      const konaAcc = state.saasAccounts.find((a) => a.organizationId === 'org-kona') || state.saasAccounts[3];
      return {
        account: konaAcc,
        organizationId: 'org-kona',
        viewScope: 'hq_overview' as const,
        role: 'owner' as const,
        surface: 'erp' as const,
      };
    }
    const savAcc =
      state.saasAccounts.find((a) => a.organizationId === 'org-savanna' && a.role === 'tenant_owner') ||
      state.saasAccounts[1];
    return {
      account: savAcc,
      organizationId: 'org-savanna',
      viewScope: preset === 'cashier_pos' ? ('branch' as const) : ('hq_overview' as const),
      role: preset === 'cashier_pos' ? ('cashier' as const) : ('owner' as const),
      surface: 'erp' as const,
    };
  },

  getProviderOverview() {
    const state = storeRepo.getState();
    const tenantSummaries = computeProviderTenantSummariesPure(
      state.organizations,
      state.allBranches,
      state.branchStores,
      state.saasAccounts
    );
    const stats = computeProviderStatsPure(
      state.organizations,
      state.allBranches,
      state.saasAccounts,
      state.leadInquiries,
      tenantSummaries
    );
    return {
      stats,
      tenantSummaries,
      plans: state.saasPlans,
      accounts: state.saasAccounts,
      leads: state.leadInquiries,
      auditLogs: state.providerAuditLogs,
    };
  },

  updateTenantStatus(orgId: string, status: SaasTenantStatus) {
    const target = storeRepo.getOrgOrThrow(orgId);
    target.status = status;
    recordProviderAuditInternal('TENANT_STATUS_CHANGED', target.name, `Set subscription status to ${status.toUpperCase()}.`);
    storeRepo.commit();
    return target;
  },

  updateTenantPlan(orgId: string, plan: SaasPlanId) {
    const state = storeRepo.getState();
    const target = storeRepo.getOrgOrThrow(orgId);
    const planDef = state.saasPlans.find((p) => p.id === plan || p.name === plan);
    if (!planDef) {
      throw new HttpError(404, `SaaS plan "${plan}" not found.`, 'PLAN_NOT_FOUND');
    }
    target.plan = planDef.id;
    target.monthlyFeeTzs = planDef.monthlyFeeTzs;
    target.maxBranches = planDef.maxBranches;
    recordProviderAuditInternal(
      'TENANT_PLAN_UPDATED',
      target.name,
      `Switched package to ${planDef.name} (quota: ${planDef.maxBranches} branches, fee: TZS ${planDef.monthlyFeeTzs.toLocaleString()}/mo).`
    );
    storeRepo.commit();
    return target;
  },

  markBillingPaid(orgId: string) {
    const target = storeRepo.getOrgOrThrow(orgId);
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    target.billingStatus = 'paid';
    if (target.status === 'suspended') target.status = 'active';
    target.nextBillingDate = nextMonth;
    recordProviderAuditInternal(
      'BILLING_VERIFIED',
      target.name,
      `Marked monthly subscription invoice settled (next cycle ${nextMonth}).`
    );
    storeRepo.commit();
    return target;
  },

  inspectTenant(orgId: string) {
    const target = storeRepo.getOrgOrThrow(orgId);
    const audit = recordProviderAuditInternal(
      'TENANT_IMPERSONATION_STARTED',
      target.name,
      'System Provider entered tenant Main HQ for live inspection.'
    );
    storeRepo.commit();
    return { organization: target, audit };
  },

  createPlan(params: {
    name: string;
    tagline: string;
    audience: string;
    monthlyFeeTzs: number;
    annualDiscountPct: number;
    trialDays: number;
    maxBranches: number;
    maxStaffSeats: number;
    maxRecipes: number;
    includedModules: string[];
    summary: string;
    isFeatured?: boolean;
    isPublic?: boolean;
  }) {
    const state = storeRepo.getState();
    const cleanName = params.name.trim();
    if (!cleanName || params.monthlyFeeTzs < 0 || params.maxBranches < 1) {
      throw new HttpError(
        422,
        'Provide package name, valid monthly fee, and minimum 1 branch quota.',
        'VALIDATION_ERROR'
      );
    }
    if (
      state.saasPlans.some(
        (p) => p.id.toLowerCase() === cleanName.toLowerCase() || p.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      throw new HttpError(409, `A package named "${cleanName}" already exists.`, 'PLAN_EXISTS');
    }

    const newPlan: SaasPlanDefinition = {
      id: cleanName,
      name: cleanName,
      tagline: params.tagline.trim() || `${cleanName} Hospitality Package`,
      audience: params.audience.trim() || 'For growing hospitality operations',
      monthlyFeeTzs: Math.round(params.monthlyFeeTzs),
      annualDiscountPct: Math.min(50, Math.max(0, Math.round(params.annualDiscountPct))),
      trialDays: Math.max(0, Math.round(params.trialDays)),
      maxBranches: Math.max(1, Math.round(params.maxBranches)),
      maxStaffSeats: Math.max(1, Math.round(params.maxStaffSeats)),
      maxRecipes: Math.max(10, Math.round(params.maxRecipes)),
      includedModules:
        params.includedModules.length > 0
          ? params.includedModules
          : ['Cashier POS & Split Payments', 'Kitchen Display System (KDS)'],
      summary: params.summary.trim() || 'Custom provider-managed SaaS hospitality package.',
      isFeatured: Boolean(params.isFeatured),
      isPublic: params.isPublic !== false,
      status: 'active',
    };

    if (newPlan.isFeatured) {
      state.saasPlans.forEach((p) => {
        p.isFeatured = false;
      });
    }
    state.saasPlans.push(newPlan);
    recordProviderAuditInternal(
      'PACKAGE_CREATED',
      newPlan.name,
      `Published ${newPlan.name} (TZS ${newPlan.monthlyFeeTzs.toLocaleString()}/mo · ${newPlan.maxBranches} branches · ${
        newPlan.isPublic ? 'Visible on Landing' : 'Private'
      }).`
    );
    storeRepo.commit();
    return newPlan;
  },

  updatePlan(planId: string, patch: Partial<SaasPlanDefinition>) {
    const state = storeRepo.getState();
    const idx = state.saasPlans.findIndex((p) => p.id === planId);
    if (idx === -1) {
      throw new HttpError(404, `Plan "${planId}" not found.`, 'PLAN_NOT_FOUND');
    }
    if (patch.isFeatured) {
      state.saasPlans.forEach((p) => {
        p.isFeatured = false;
      });
    }
    const updatedPlan: SaasPlanDefinition = {
      ...state.saasPlans[idx],
      ...patch,
      id: state.saasPlans[idx].id,
    };
    state.saasPlans[idx] = updatedPlan;

    if (patch.monthlyFeeTzs !== undefined || patch.maxBranches !== undefined) {
      state.organizations.forEach((o) => {
        if (o.plan === planId) {
          o.monthlyFeeTzs = updatedPlan.monthlyFeeTzs;
          o.maxBranches = updatedPlan.maxBranches;
        }
      });
    }

    recordProviderAuditInternal(
      'PACKAGE_UPDATED',
      updatedPlan.name,
      `Updated fee TZS ${updatedPlan.monthlyFeeTzs.toLocaleString()}/mo, branch quota ${updatedPlan.maxBranches}, seats ${updatedPlan.maxStaffSeats}, landing visibility: ${
        updatedPlan.isPublic ? 'PUBLIC' : 'HIDDEN'
      }.`
    );
    storeRepo.commit();
    return updatedPlan;
  },

  togglePlanVisibility(planId: string) {
    const state = storeRepo.getState();
    const target = state.saasPlans.find((p) => p.id === planId);
    if (!target) throw new HttpError(404, `Plan "${planId}" not found.`, 'PLAN_NOT_FOUND');
    target.isPublic = !target.isPublic;
    recordProviderAuditInternal(
      'PACKAGE_VISIBILITY_CHANGED',
      target.name,
      `${target.isPublic ? 'Published' : 'Hidden'} package on Public Landing Page & Self-Registration.`
    );
    storeRepo.commit();
    return target;
  },

  togglePlanStatus(planId: string) {
    const state = storeRepo.getState();
    const target = state.saasPlans.find((p) => p.id === planId);
    if (!target) throw new HttpError(404, `Plan "${planId}" not found.`, 'PLAN_NOT_FOUND');
    target.status = target.status === 'active' ? 'archived' : 'active';
    if (target.status === 'archived') target.isPublic = false;
    recordProviderAuditInternal(
      'PACKAGE_STATUS_CHANGED',
      target.name,
      `Set package lifecycle status to ${target.status.toUpperCase()}.`
    );
    storeRepo.commit();
    return target;
  },

  createAccount(params: {
    id?: string;
    name: string;
    email: string;
    password: string;
    role: SaasAccountRole;
    organizationId?: string;
    branchId?: string;
    phone?: string;
  }) {
    const state = storeRepo.getState();
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail || !params.name.trim() || params.password.length < 4) {
      throw new HttpError(422, 'Provide name, valid email, and password (min 4 chars).', 'VALIDATION_ERROR');
    }
    if (state.saasAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      throw new HttpError(409, 'Email already registered on platform.', 'EMAIL_EXISTS');
    }
    const newAcc: SaasAccount = {
      id: params.id || createId('acc'),
      name: params.name.trim(),
      email: cleanEmail,
      password: params.password,
      role: params.role,
      status: 'active',
      organizationId: params.role === 'provider_admin' ? undefined : params.organizationId,
      branchId: params.role === 'branch_manager' ? params.branchId : undefined,
      phone: params.phone?.trim(),
      lastLoginAt: 'Never',
      createdAt: todayDateStr(),
    };
    state.saasAccounts.unshift(newAcc);
    recordProviderAuditInternal('ACCOUNT_CREATED', cleanEmail, `Created ${params.role} account for ${params.name.trim()}.`);
    storeRepo.commit();
    return newAcc;
  },

  updateAccountStatus(accountId: string, status: SaasAccountStatus) {
    const state = storeRepo.getState();
    const acc = state.saasAccounts.find((a) => a.id === accountId);
    if (!acc) throw new HttpError(404, `Account "${accountId}" not found.`, 'ACCOUNT_NOT_FOUND');
    acc.status = status;
    recordProviderAuditInternal('ACCOUNT_STATUS_CHANGED', acc.email, `Set user account status to ${status.toUpperCase()}.`);
    storeRepo.commit();
    return acc;
  },

  updateAccountRole(accountId: string, role: SaasAccountRole) {
    const state = storeRepo.getState();
    const acc = state.saasAccounts.find((a) => a.id === accountId);
    if (!acc) throw new HttpError(404, `Account "${accountId}" not found.`, 'ACCOUNT_NOT_FOUND');
    acc.role = role;
    acc.organizationId = role === 'provider_admin' ? undefined : acc.organizationId || state.organizations[0]?.id;
    recordProviderAuditInternal('ACCOUNT_ROLE_CHANGED', acc.email, `Changed platform role to ${role}.`);
    storeRepo.commit();
    return acc;
  },

  resetAccountPassword(accountId: string, newPassword: string) {
    const state = storeRepo.getState();
    const acc = state.saasAccounts.find((a) => a.id === accountId);
    if (!acc) throw new HttpError(404, `Account "${accountId}" not found.`, 'ACCOUNT_NOT_FOUND');
    if (newPassword.length < 4) {
      throw new HttpError(422, 'Password must be at least 4 characters.', 'VALIDATION_ERROR');
    }
    acc.password = newPassword;
    recordProviderAuditInternal('ACCOUNT_PASSWORD_RESET', acc.email, 'System Provider issued new account password.');
    storeRepo.commit();
    return acc;
  },

  convertLeadToTenant(
    leadId: string,
    ids?: { orgId?: string; branchId?: string; accountId?: string }
  ) {
    const state = storeRepo.getState();
    const lead = state.leadInquiries.find((l) => l.id === leadId);
    if (!lead) throw new HttpError(404, `Lead "${leadId}" not found.`, 'LEAD_NOT_FOUND');
    if (lead.status === 'converted') {
      throw new HttpError(409, 'Lead has already been converted.', 'ALREADY_CONVERTED');
    }
    const codePrefix = lead.companyName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'TEN';
    const created = this.createSaasTenant({
      orgId: ids?.orgId,
      branchId: ids?.branchId,
      accountId: ids?.accountId,
      orgName: lead.companyName,
      ownerName: lead.contactName,
      ownerEmail: lead.email,
      branchName: `${lead.companyName} — Main HQ`,
      branchCode: `${codePrefix}-HQ`,
      operatingModel: 'dine_in_restaurant',
      phone: lead.phone || '+255 754 000 000',
      address: 'Dar es Salaam, Tanzania',
      plan: lead.planInterest,
      status: 'active',
    });
    lead.status = 'converted';
    recordProviderAuditInternal(
      'LEAD_CONVERTED_TO_TENANT',
      created.org.name,
      `Provisioned active ${created.org.plan} tenant and owner credentials for ${lead.email}.`
    );
    storeRepo.commit();
    return {
      success: true,
      message: `Converted ${lead.companyName} into active Tenant (${created.branch.branchCode}).`,
      created,
    };
  },
};
