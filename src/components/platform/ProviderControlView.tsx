import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Coins,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  KeyRound,
  Layers,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  RestaurantTenant,
  SaasAccountRole,
  SaasAccountStatus,
  SaasPlanDefinition,
  SaasPlanId,
  SaasTenantStatus,
} from '../../types/restaurant';

type ProviderTab = 'overview' | 'tenants' | 'packages' | 'accounts' | 'billing' | 'leads_audit';

export const ProviderControlView: React.FC = () => {
  const {
    organizations,
    saasPlans,
    providerTenantSummaries,
    providerStats,
    saasAccounts,
    authenticatedAccount,
    providerAuditLogs,
    leadInquiries,
    currency,
    toggleCurrency,
    formatMoney,
    setPlatformSurface,
    logoutAccount,
    createSaasTenant,
    providerUpdateTenantStatus,
    providerUpdateTenantPlan,
    providerCreatePlan,
    providerUpdatePlan,
    providerTogglePlanVisibility,
    providerTogglePlanStatus,
    providerMarkBillingPaid,
    providerInspectTenant,
    providerCreateAccount,
    providerUpdateAccountStatus,
    providerUpdateAccountRole,
    providerResetAccountPassword,
    providerConvertLeadToTenant,
  } = useRestaurant();

  const activePlans = useMemo(() => saasPlans.filter((p) => p.status === 'active'), [saasPlans]);

  const [activeTab, setActiveTab] = useState<ProviderTab>('overview');
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<'all' | SaasTenantStatus>('all');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | SaasAccountRole>('all');
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Provision Tenant Form
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('HQ-01');
  const [newPlan, setNewPlan] = useState<SaasPlanId>('Growth');
  const [newModel, setNewModel] = useState<RestaurantTenant['operatingModel']>('dine_in_restaurant');

  // Create Account Form
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [accName, setAccName] = useState('');
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('pass1234');
  const [accRole, setAccRole] = useState<SaasAccountRole>('tenant_owner');
  const [accOrgId, setAccOrgId] = useState<string>(() => organizations[0]?.id || '');

  // Password reset inline editor
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordDraft, setResetPasswordDraft] = useState('reset123');

  // Package Management state (Create & Edit SaaS Packages)
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgTagline, setPkgTagline] = useState('');
  const [pkgAudience, setPkgAudience] = useState('');
  const [pkgFee, setPkgFee] = useState('165000');
  const [pkgDiscount, setPkgDiscount] = useState('15');
  const [pkgTrialDays, setPkgTrialDays] = useState('14');
  const [pkgMaxBranches, setPkgMaxBranches] = useState('3');
  const [pkgMaxSeats, setPkgMaxSeats] = useState('25');
  const [pkgMaxRecipes, setPkgMaxRecipes] = useState('100');
  const [pkgSummary, setPkgSummary] = useState('');
  const [pkgModulesText, setPkgModulesText] = useState(
    'Cashier POS & Split Payments, Kitchen Display System (KDS), Waiter Referral & Commission Engine'
  );
  const [pkgPublic, setPkgPublic] = useState(true);
  const [pkgFeatured, setPkgFeatured] = useState(false);

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<SaasPlanDefinition> & { modulesText?: string }>({});

  const filteredTenants = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    return providerTenantSummaries.filter((t) => {
      if (tenantStatusFilter !== 'all' && t.org.status !== tenantStatusFilter) return false;
      if (!q) return true;
      return (
        t.org.name.toLowerCase().includes(q) ||
        t.org.ownerName.toLowerCase().includes(q) ||
        t.org.ownerEmail.toLowerCase().includes(q) ||
        t.org.domain.toLowerCase().includes(q)
      );
    });
  }, [providerTenantSummaries, tenantSearch, tenantStatusFilter]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return saasAccounts.filter((a) => {
      if (accountRoleFilter !== 'all' && a.role !== accountRoleFilter) return false;
      if (!q) return true;
      const orgName = organizations.find((o) => o.id === a.organizationId)?.name || '';
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        orgName.toLowerCase().includes(q)
      );
    });
  }, [saasAccounts, accountSearch, accountRoleFilter, organizations]);

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOwnerEmail.trim()) return;
    const created = createSaasTenant({
      orgName: newOrgName.trim(),
      ownerName: newOwnerName.trim() || 'Tenant Owner',
      ownerEmail: newOwnerEmail.trim(),
      branchName: newBranchName.trim() || `${newOrgName.trim()} — Main HQ`,
      branchCode: newBranchCode.trim() || 'HQ-01',
      operatingModel: newModel,
      phone: '+255 754 000 000',
      address: 'Dar es Salaam, Tanzania',
      plan: newPlan,
      status: 'active',
      switchToNew: false,
    });
    setNotice({
      type: 'ok',
      text: `Provisioned isolated tenant "${created.org.name}" (${created.branch.branchCode}) with owner login ${created.account.email}.`,
    });
    setNewOrgName('');
    setNewOwnerName('');
    setNewOwnerEmail('');
    setNewBranchName('');
    setShowNewTenantForm(false);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const res = providerCreateAccount({
      name: accName,
      email: accEmail,
      password: accPassword,
      role: accRole,
      organizationId: accRole === 'provider_admin' ? undefined : accOrgId,
    });
    if (!res.success) {
      setNotice({ type: 'err', text: res.error || 'Could not create account.' });
      return;
    }
    setNotice({ type: 'ok', text: `Created active ${accRole} account for ${accEmail.trim().toLowerCase()}.` });
    setAccName('');
    setAccEmail('');
    setShowNewAccountForm(false);
  };

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const modules = pkgModulesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const res = providerCreatePlan({
      name: pkgName,
      tagline: pkgTagline,
      audience: pkgAudience,
      monthlyFeeTzs: Number(pkgFee) || 0,
      annualDiscountPct: Number(pkgDiscount) || 0,
      trialDays: Number(pkgTrialDays) || 14,
      maxBranches: Number(pkgMaxBranches) || 1,
      maxStaffSeats: Number(pkgMaxSeats) || 10,
      maxRecipes: Number(pkgMaxRecipes) || 40,
      includedModules: modules,
      summary: pkgSummary,
      isFeatured: pkgFeatured,
      isPublic: pkgPublic,
    });
    if (!res.success) {
      setNotice({ type: 'err', text: res.error || 'Could not create package.' });
      return;
    }
    setNotice({
      type: 'ok',
      text: `Published package "${res.plan?.name}" (${res.plan?.isPublic ? 'visible on Landing Page' : 'private'}).`,
    });
    setPkgName('');
    setPkgTagline('');
    setPkgAudience('');
    setPkgSummary('');
    setShowNewPlanForm(false);
  };

  const startEditingPlan = (plan: SaasPlanDefinition) => {
    setEditingPlanId(plan.id);
    setEditDraft({
      name: plan.name,
      tagline: plan.tagline,
      audience: plan.audience,
      monthlyFeeTzs: plan.monthlyFeeTzs,
      annualDiscountPct: plan.annualDiscountPct,
      trialDays: plan.trialDays,
      maxBranches: plan.maxBranches,
      maxStaffSeats: plan.maxStaffSeats,
      maxRecipes: plan.maxRecipes,
      summary: plan.summary,
      isFeatured: Boolean(plan.isFeatured),
      isPublic: plan.isPublic,
      modulesText: plan.includedModules.join(', '),
    });
  };

  const handleSavePlanEdit = (planId: string) => {
    const modules = (editDraft.modulesText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    providerUpdatePlan(planId, {
      name: editDraft.name,
      tagline: editDraft.tagline,
      audience: editDraft.audience,
      monthlyFeeTzs: Number(editDraft.monthlyFeeTzs) || 0,
      annualDiscountPct: Number(editDraft.annualDiscountPct) || 0,
      trialDays: Number(editDraft.trialDays) || 0,
      maxBranches: Math.max(1, Number(editDraft.maxBranches) || 1),
      maxStaffSeats: Math.max(1, Number(editDraft.maxStaffSeats) || 1),
      maxRecipes: Math.max(10, Number(editDraft.maxRecipes) || 10),
      summary: editDraft.summary,
      isFeatured: Boolean(editDraft.isFeatured),
      isPublic: Boolean(editDraft.isPublic),
      includedModules: modules.length > 0 ? modules : ['Cashier POS & Split Payments'],
    });
    setEditingPlanId(null);
    setNotice({
      type: 'ok',
      text: `Saved package "${editDraft.name || planId}". Landing Page pricing and subscribed tenant quotas are now updated.`,
    });
  };

  const statusTextStyle = (status: SaasTenantStatus | SaasAccountStatus) => {
    if (status === 'active') return 'text-emerald-700 font-semibold';
    if (status === 'trial' || status === 'pending') return 'text-amber-700 font-semibold';
    return 'text-rose-700 font-semibold';
  };

  const sidebarItems: { id: ProviderTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'overview', label: 'Platform Overview', icon: LayoutGrid },
    { id: 'tenants', label: 'Tenant Organizations', icon: Building2, count: providerStats.totalTenants },
    { id: 'packages', label: 'Packages & Quotas', icon: Layers, count: activePlans.length },
    { id: 'accounts', label: 'User & Provider Accounts', icon: Users, count: saasAccounts.length },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
    { id: 'leads_audit', label: 'Leads & Audit Log', icon: FileText, count: providerStats.openLeadsCount },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
      {/* ================= LEFT SIDEBAR (256px) ================= */}
      <aside className="hidden lg:flex flex-col justify-between w-64 bg-slate-950 text-slate-100 border-r border-slate-800 shrink-0 sticky top-0 h-screen">
        <div className="p-5 space-y-6">
          <div className="space-y-1">
            <div className="text-base font-extrabold tracking-tight text-white">RestaurantOS</div>
            <div className="text-xs text-slate-400">System Provider Control</div>
          </div>

          <nav aria-label="Provider sections" className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && (
                    <span className="font-mono tabular-nums text-[11px] opacity-80">{item.count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3 text-xs">
          <div className="px-2 space-y-0.5">
            <div className="font-bold text-white truncate">
              {authenticatedAccount?.name || 'System Provider Admin'}
            </div>
            <div className="font-mono text-[11px] text-slate-400 truncate">
              {authenticatedAccount?.email || 'provider@restaurantos.io'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlatformSurface('landing')}
              className="py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Site</span>
            </button>
            <button
              type="button"
              onClick={logoutAccount}
              className="py-2 px-2.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-200 hover:text-rose-200 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN WORKSPACE ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb Left, 2 Action Controls Right */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-slate-500">
              System Provider / <span className="text-slate-900 font-semibold">Accounts &amp; Tenant Control</span>
            </div>
            <div className="text-sm font-extrabold text-slate-950 truncate">
              {sidebarItems.find((i) => i.id === activeTab)?.label}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleCurrency}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>{currency}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('tenants');
                setShowNewTenantForm(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Provision Tenant</span>
            </button>
          </div>
        </header>

        {/* Mobile Tab Strip */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 ${
                activeTab === item.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPlatformSurface('landing')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold whitespace-nowrap shrink-0"
          >
            Public Site
          </button>
          <button
            type="button"
            onClick={logoutAccount}
            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold whitespace-nowrap shrink-0"
          >
            Sign Out
          </button>
        </div>

        <main className="flex-1 p-6 max-w-[1280px] w-full mx-auto space-y-6">
          {/* Action Feedback Notice */}
          {notice && (
            <div
              className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
                notice.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <span>{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-current opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pending Approvals Alert Strip when pending accounts exist */}
          {providerStats.pendingAccountsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>{providerStats.pendingAccountsCount} user account</strong> awaiting System Provider activation before login access is permitted.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer"
              >
                Review Pending Accounts
              </button>
            </div>
          )}

          {/* ================= TAB 1: PLATFORM OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Monthly Recurring Revenue</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-slate-950 mt-1">
                    {formatMoney(providerStats.monthlyRecurringRevenueTzs)}
                  </div>
                  <div className="text-xs text-emerald-700 mt-1">
                    {providerStats.activeTenants} active · {providerStats.trialTenants} trial
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Live Platform GMV</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-slate-950 mt-1">
                    {formatMoney(providerStats.platformGmvTzs)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Across all isolated stores</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Tenant Organizations</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-slate-950 mt-1">
                    {providerStats.totalTenants}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {providerStats.suspendedTenants} suspended
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Provisioned Branches</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-slate-950 mt-1">
                    {providerStats.totalBranches}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Isolated branch workspaces</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 lg:col-span-1">
                  <div className="text-xs text-slate-500">Platform Accounts</div>
                  <div className="text-xl font-extrabold font-mono tabular-nums text-slate-950 mt-1">
                    {providerStats.activeAccountsCount} Active
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    {providerStats.pendingAccountsCount} pending approval
                  </div>
                </div>
              </div>

              {/* Tenant Snapshot Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-950">Active Tenant Portfolio &amp; Branch Telemetry</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tenants')}
                    className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                  >
                    Manage All Tenants
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Tenant Organization</th>
                        <th className="py-2.5 px-3">Plan &amp; Quota</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Branches</th>
                        <th className="py-2.5 px-3 text-right">Live GMV</th>
                        <th className="py-2.5 px-3 text-right">Monthly Fee</th>
                        <th className="py-2.5 px-4 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {providerTenantSummaries.map((row) => (
                        <tr key={row.org.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-950">{row.org.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {row.org.ownerName} · {row.org.ownerEmail}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{row.org.plan}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Max {row.org.maxBranches} branches
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={statusTextStyle(row.org.status)}>
                              {row.org.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {row.activeBranchesCount} / {row.branchesCount}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-950">
                            {formatMoney(row.liveGmvTzs)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                            {formatMoney(row.org.monthlyFeeTzs)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => providerInspectTenant(row.org.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Inspect ERP</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: TENANT ORGANIZATIONS CONTROL ================= */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              {showNewTenantForm && (
                <form
                  onSubmit={handleCreateTenant}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-950">Provision New Isolated SaaS Tenant</h2>
                    <button
                      type="button"
                      onClick={() => setShowNewTenantForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <input
                      type="text"
                      required
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Organization Name *"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="Owner Full Name"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="email"
                      required
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                      placeholder="Owner Email *"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="Flagship Branch Name"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={newBranchCode}
                      onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                      placeholder="Branch Code (HQ-01)"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                    />
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value as SaasPlanId)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      {activePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatMoney(p.monthlyFeeTzs)}/mo)
                        </option>
                      ))}
                    </select>
                    <select
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value as RestaurantTenant['operatingModel'])}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="dine_in_restaurant">Dine-In Restaurant</option>
                      <option value="fast_food_chips">Fast Food Grill</option>
                      <option value="cafe_bistro">Cafe &amp; Bistro</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Provision Tenant &amp; Owner Account
                    </button>
                  </div>
                </form>
              )}

              {/* Search & Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    placeholder="Search organizations, owner email, or domain..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                  {(['all', 'active', 'trial', 'suspended'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTenantStatusFilter(st)}
                      className={`px-3 py-1 rounded-md font-semibold capitalize cursor-pointer ${
                        tenantStatusFilter === st ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tenants Governance Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Tenant &amp; Domain</th>
                        <th className="py-3 px-3">Plan Tier</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Branches / Quota</th>
                        <th className="py-3 px-3 text-right">Orders / GMV</th>
                        <th className="py-3 px-4 text-right">Provider Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTenants.map(({ org, branchesCount, liveOrdersCount, liveGmvTzs, accountsCount }) => (
                        <tr key={org.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-950">{org.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {org.ownerName} · {org.ownerEmail} · {accountsCount} users
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={org.plan}
                              onChange={(e) => {
                                providerUpdateTenantPlan(org.id, e.target.value as SaasPlanId);
                                setNotice({ type: 'ok', text: `Updated ${org.name} to ${e.target.value} plan.` });
                              }}
                              aria-label={`Plan for ${org.name}`}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold"
                            >
                              {saasPlans.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <span className={statusTextStyle(org.status)}>{org.status.toUpperCase()}</span>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Billing: {org.billingStatus}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {branchesCount} / {org.maxBranches}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <div className="font-bold text-slate-950">{formatMoney(liveGmvTzs)}</div>
                            <div className="text-[11px] text-slate-500">{liveOrdersCount} orders</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {org.status !== 'active' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    providerUpdateTenantStatus(org.id, 'active');
                                    setNotice({ type: 'ok', text: `Activated ${org.name}.` });
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}
                              {org.status !== 'suspended' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    providerUpdateTenantStatus(org.id, 'suspended');
                                    setNotice({
                                      type: 'err',
                                      text: `Suspended ${org.name}. Tenant logins are now blocked until reactivated.`,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => providerInspectTenant(org.id)}
                                className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Inspect HQ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB: PACKAGES & QUOTAS MANAGEMENT ================= */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              {/* Top Package Control Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-950">
                    SaaS Packages, Branch Quotas &amp; Landing Page Sync
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create, reprice, or toggle public visibility of SaaS packages. Updates sync immediately to the Public Landing Site, Registration page, and tenant branch quotas.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlatformSurface('landing')}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Preview Landing Packages</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewPlanForm((v) => !v)}
                    className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showNewPlanForm ? 'Close Form' : 'New SaaS Package'}</span>
                  </button>
                </div>
              </div>

              {/* Create New Package Form */}
              {showNewPlanForm && (
                <form
                  onSubmit={handleCreatePackage}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-950">Create New Hospitality SaaS Package</h3>
                    <button
                      type="button"
                      onClick={() => setShowNewPlanForm(false)}
                      className="text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Package Name *</label>
                      <input
                        type="text"
                        required
                        value={pkgName}
                        onChange={(e) => setPkgName(e.target.value)}
                        placeholder="e.g. Boutique Hotel Pro"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
                      <input
                        type="text"
                        value={pkgTagline}
                        onChange={(e) => setPkgTagline(e.target.value)}
                        placeholder="Short descriptor"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                      <input
                        type="text"
                        value={pkgAudience}
                        onChange={(e) => setPkgAudience(e.target.value)}
                        placeholder="e.g. For regional cafes"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Monthly Fee (TZS) *</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={pkgFee}
                        onChange={(e) => setPkgFee(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Max Branches Quota</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={pkgMaxBranches}
                        onChange={(e) => setPkgMaxBranches(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Max Staff Seats</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={pkgMaxSeats}
                        onChange={(e) => setPkgMaxSeats(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">BOM Recipe Limit</label>
                      <input
                        type="number"
                        min={10}
                        required
                        value={pkgMaxRecipes}
                        onChange={(e) => setPkgMaxRecipes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Trial Days</label>
                        <input
                          type="number"
                          min={0}
                          value={pkgTrialDays}
                          onChange={(e) => setPkgTrialDays(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Annual % Off</label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={pkgDiscount}
                          onChange={(e) => setPkgDiscount(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Included Modules (comma-separated)</label>
                      <input
                        type="text"
                        value={pkgModulesText}
                        onChange={(e) => setPkgModulesText(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Package Summary</label>
                      <input
                        type="text"
                        value={pkgSummary}
                        onChange={(e) => setPkgSummary(e.target.value)}
                        placeholder="Describe operational scope included in this tier..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-5">
                      <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pkgPublic}
                          onChange={(e) => setPkgPublic(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>Publish on Public Landing Page</span>
                      </label>
                      <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pkgFeatured}
                          onChange={(e) => setPkgFeatured(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>Mark as Recommended Tier</span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-bold cursor-pointer"
                    >
                      Save &amp; Publish Package
                    </button>
                  </div>
                </form>
              )}

              {/* Live Package Catalog Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {saasPlans.map((plan) => {
                  const subscribers = organizations.filter((o) => o.plan === plan.id);
                  const pkgMrr = subscribers
                    .filter((o) => o.status !== 'suspended')
                    .reduce((sum, o) => sum + o.monthlyFeeTzs, 0);
                  const isEditing = editingPlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`bg-white border rounded-xl p-5 flex flex-col justify-between space-y-4 ${
                        plan.isFeatured ? 'border-orange-400 ring-1 ring-orange-200' : 'border-slate-200'
                      }`}
                    >
                      {!isEditing ? (
                        <>
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  {plan.status === 'active' ? 'ACTIVE PACKAGE' : 'ARCHIVED'} ·{' '}
                                  <span className={plan.isPublic ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                    {plan.isPublic ? 'ON LANDING PAGE' : 'HIDDEN'}
                                  </span>
                                </div>
                                <h3 className="text-base font-extrabold text-slate-950 mt-0.5">{plan.name}</h3>
                                <div className="text-xs text-slate-500">{plan.audience}</div>
                              </div>
                              {plan.isFeatured && (
                                <span className="text-[10px] font-mono font-bold text-orange-600 shrink-0">
                                  RECOMMENDED
                                </span>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between gap-2">
                              <div>
                                <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-950">
                                  {formatMoney(plan.monthlyFeeTzs)}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  /month · {plan.annualDiscountPct}% annual off · {plan.trialDays}d trial
                                </div>
                              </div>
                              <div className="text-right text-[11px] font-mono">
                                <div className="font-bold text-slate-900">{subscribers.length} Tenants</div>
                                <div className="text-slate-500">MRR: {formatMoney(pkgMrr)}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] font-mono">
                              <div>
                                <div className="text-slate-500">Branches</div>
                                <div className="font-bold text-slate-950">{plan.maxBranches}</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Seats</div>
                                <div className="font-bold text-slate-950">{plan.maxStaffSeats}</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Recipes</div>
                                <div className="font-bold text-slate-950">{plan.maxRecipes}</div>
                              </div>
                            </div>

                            <ul className="space-y-1 text-xs text-slate-600">
                              {plan.includedModules.map((m) => (
                                <li key={m} className="flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => startEditingPlan(plan)}
                              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                            >
                              Edit Price &amp; Quotas
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                providerTogglePlanVisibility(plan.id);
                                setNotice({
                                  type: 'ok',
                                  text: `${plan.name} is now ${plan.isPublic ? 'hidden from' : 'visible on'} the Public Landing Page.`,
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              {plan.isPublic ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{plan.isPublic ? 'Hide on Landing' : 'Show on Landing'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                providerTogglePlanStatus(plan.id);
                                setNotice({
                                  type: 'ok',
                                  text: `${plan.name} set to ${plan.status === 'active' ? 'ARCHIVED' : 'ACTIVE'}.`,
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                            >
                              {plan.status === 'active' ? 'Archive' : 'Activate'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-950">Editing {plan.name}</span>
                            <button
                              type="button"
                              onClick={() => setEditingPlanId(null)}
                              className="text-slate-500 hover:text-slate-900 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block font-semibold text-slate-600 mb-0.5">Package Name</label>
                              <input
                                type="text"
                                value={editDraft.name || ''}
                                onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 mb-0.5">Monthly Fee (TZS)</label>
                              <input
                                type="number"
                                min={0}
                                value={editDraft.monthlyFeeTzs ?? 0}
                                onChange={(e) => setEditDraft((d) => ({ ...d, monthlyFeeTzs: Number(e.target.value) }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 mb-0.5">Max Branches</label>
                              <input
                                type="number"
                                min={1}
                                value={editDraft.maxBranches ?? 1}
                                onChange={(e) => setEditDraft((d) => ({ ...d, maxBranches: Number(e.target.value) }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 mb-0.5">Max Staff Seats</label>
                              <input
                                type="number"
                                min={1}
                                value={editDraft.maxStaffSeats ?? 10}
                                onChange={(e) => setEditDraft((d) => ({ ...d, maxStaffSeats: Number(e.target.value) }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 mb-0.5">BOM Recipes Limit</label>
                              <input
                                type="number"
                                min={10}
                                value={editDraft.maxRecipes ?? 40}
                                onChange={(e) => setEditDraft((d) => ({ ...d, maxRecipes: Number(e.target.value) }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 mb-0.5">Trial Days / Annual %</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  value={editDraft.trialDays ?? 14}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, trialDays: Number(e.target.value) }))}
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                                  title="Trial days"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={50}
                                  value={editDraft.annualDiscountPct ?? 15}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, annualDiscountPct: Number(e.target.value) }))}
                                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                                  title="Annual discount %"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-600 mb-0.5">Included Modules (comma-separated)</label>
                            <textarea
                              rows={2}
                              value={editDraft.modulesText || ''}
                              onChange={(e) => setEditDraft((d) => ({ ...d, modulesText: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(editDraft.isFeatured)}
                                onChange={(e) => setEditDraft((d) => ({ ...d, isFeatured: e.target.checked }))}
                              />
                              <span>Recommended Tier</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSavePlanEdit(plan.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
                            >
                              Save &amp; Sync Tenants
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tenant Package Assignment & Quota Utilization Matrix */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-950">Tenant Package Flow &amp; Branch Quota Enforcement</h3>
                  <p className="text-xs text-slate-500">
                    When tenants reach their package branch limit, HQ cannot add more branches until the System Provider upgrades their tier here.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Tenant Organization</th>
                        <th className="py-2.5 px-3">Assigned Package</th>
                        <th className="py-2.5 px-3">Branch Quota Used</th>
                        <th className="py-2.5 px-3 text-right">Monthly Fee</th>
                        <th className="py-2.5 px-4 text-right">Upgrade / Switch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {providerTenantSummaries.map(({ org, branchesCount }) => {
                        const pct = Math.min(100, Math.round((branchesCount / Math.max(1, org.maxBranches)) * 100));
                        return (
                          <tr key={org.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-950">{org.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                Status: {org.status.toUpperCase()} · Billing: {org.billingStatus}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900">{org.plan}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2 font-mono tabular-nums">
                                <span className="font-bold text-slate-900">
                                  {branchesCount} / {org.maxBranches}
                                </span>
                                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${pct >= 90 ? 'bg-rose-600' : 'bg-emerald-600'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                              {formatMoney(org.monthlyFeeTzs)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <select
                                value={org.plan}
                                onChange={(e) => {
                                  providerUpdateTenantPlan(org.id, e.target.value as SaasPlanId);
                                  setNotice({
                                    type: 'ok',
                                    text: `Switched ${org.name} to ${e.target.value} package and updated branch quota.`,
                                  });
                                }}
                                aria-label={`Switch package for ${org.name}`}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                              >
                                {saasPlans.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.maxBranches} branches)
                                  </option>
                                ))}
                              </select>
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

          {/* ================= TAB 3: USER & PROVIDER ACCOUNTS DIRECTORY ================= */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      placeholder="Search name, email, or organization..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg text-xs">
                    {(
                      [
                        { id: 'all', label: 'All Roles' },
                        { id: 'provider_admin', label: 'Providers' },
                        { id: 'tenant_owner', label: 'Owners' },
                        { id: 'branch_manager', label: 'Managers' },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setAccountRoleFilter(r.id)}
                        className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                          accountRoleFilter === r.id ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewAccountForm((v) => !v)}
                  className="px-3.5 py-2 rounded-lg bg-slate-950 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add User / Provider Account</span>
                </button>
              </div>

              {showNewAccountForm && (
                <form
                  onSubmit={handleCreateAccount}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs"
                >
                  <div className="font-bold text-slate-950">Create Platform Operator or Tenant User Account</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <input
                      type="text"
                      required
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Full Name *"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="email"
                      required
                      value={accEmail}
                      onChange={(e) => setAccEmail(e.target.value)}
                      placeholder="Email Address *"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                    <input
                      type="text"
                      required
                      value={accPassword}
                      onChange={(e) => setAccPassword(e.target.value)}
                      placeholder="Password *"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                    <select
                      value={accRole}
                      onChange={(e) => setAccRole(e.target.value as SaasAccountRole)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <option value="tenant_owner">Tenant Owner</option>
                      <option value="branch_manager">Branch Manager</option>
                      <option value="provider_admin">System Provider Admin</option>
                    </select>
                    {accRole !== 'provider_admin' ? (
                      <select
                        value={accOrgId}
                        onChange={(e) => setAccOrgId(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        {organizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-600 font-mono flex items-center">
                        Global Provider Scope
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewAccountForm(false)}
                      className="px-3 py-1.5 text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-orange-600 text-white font-bold cursor-pointer"
                    >
                      Create Active Account
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Account Holder</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">Organization Scope</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Last Login</th>
                        <th className="py-3 px-4 text-right">Access Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAccounts.map((acc) => {
                        const org = organizations.find((o) => o.id === acc.organizationId);
                        const isSelf = authenticatedAccount?.id === acc.id;
                        return (
                          <tr key={acc.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-950">{acc.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{acc.email}</div>
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={acc.role}
                                disabled={isSelf}
                                onChange={(e) => {
                                  providerUpdateAccountRole(acc.id, e.target.value as SaasAccountRole);
                                  setNotice({ type: 'ok', text: `Updated role for ${acc.email}.` });
                                }}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold disabled:opacity-60"
                              >
                                <option value="provider_admin">System Provider</option>
                                <option value="tenant_owner">Tenant Owner</option>
                                <option value="branch_manager">Branch Manager</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {acc.role === 'provider_admin' ? 'Platform-Wide Root' : org?.name || 'Unassigned'}
                            </td>
                            <td className="py-3 px-3">
                              <span className={statusTextStyle(acc.status)}>{acc.status.toUpperCase()}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                              {acc.lastLoginAt}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                                {acc.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      providerUpdateAccountStatus(acc.id, 'active');
                                      setNotice({ type: 'ok', text: `Approved pending account ${acc.email}.` });
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>
                                )}
                                {acc.status === 'suspended' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      providerUpdateAccountStatus(acc.id, 'active');
                                      setNotice({ type: 'ok', text: `Reactivated ${acc.email}.` });
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                                  >
                                    Reactivate
                                  </button>
                                )}
                                {acc.status === 'active' && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      providerUpdateAccountStatus(acc.id, 'suspended');
                                      setNotice({ type: 'err', text: `Suspended user ${acc.email}.` });
                                    }}
                                    className="px-2.5 py-1 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Suspend
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetTargetId(resetTargetId === acc.id ? null : acc.id);
                                    setResetPasswordDraft('reset123');
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <KeyRound className="w-3 h-3" />
                                  <span>Reset Key</span>
                                </button>
                              </div>

                              {resetTargetId === acc.id && (
                                <div className="mt-2 flex items-center justify-end gap-1.5">
                                  <input
                                    type="text"
                                    value={resetPasswordDraft}
                                    onChange={(e) => setResetPasswordDraft(e.target.value)}
                                    className="px-2 py-1 border border-slate-300 rounded font-mono text-[11px] w-28"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      providerResetAccountPassword(acc.id, resetPasswordDraft);
                                      setResetTargetId(null);
                                      setNotice({
                                        type: 'ok',
                                        text: `Updated password for ${acc.email} to "${resetPasswordDraft}".`,
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded bg-slate-950 text-white text-[11px] font-semibold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              )}
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

          {/* ================= TAB 4: BILLING & INVOICES ================= */}
          {activeTab === 'billing' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Subscription Billing Ledger</h2>
                  <p className="text-xs text-slate-500">
                    Active MRR: <span className="font-mono font-bold text-slate-900">{formatMoney(providerStats.monthlyRecurringRevenueTzs)}</span>
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tenant Organization</th>
                      <th className="py-3 px-3">Plan</th>
                      <th className="py-3 px-3 text-right">Monthly Fee</th>
                      <th className="py-3 px-3">Billing Status</th>
                      <th className="py-3 px-3">Next Renewal</th>
                      <th className="py-3 px-4 text-right">Invoice Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-950">{org.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{org.ownerEmail}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{org.plan}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                          {formatMoney(org.monthlyFeeTzs)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={
                              org.billingStatus === 'paid'
                                ? 'text-emerald-700 font-semibold'
                                : org.billingStatus === 'pending'
                                ? 'text-amber-700 font-semibold'
                                : 'text-rose-700 font-semibold'
                            }
                          >
                            {org.billingStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{org.nextBillingDate}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              providerMarkBillingPaid(org.id);
                              setNotice({ type: 'ok', text: `Marked billing invoice paid for ${org.name}.` });
                            }}
                            className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Record Payment</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 5: INBOUND LEADS & PROVIDER AUDIT LOG ================= */}
          {activeTab === 'leads_audit' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inbound Leads from Landing Pages */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <h2 className="text-sm font-bold text-slate-950">Inbound Onboarding Inquiries ({leadInquiries.length})</h2>
                  <p className="text-xs text-slate-500">Submitted from public Customers &amp; Contact landing page</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {leadInquiries.map((lead) => (
                    <div key={lead.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-950">{lead.companyName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {lead.contactName} · {lead.email} · {lead.branchesCount} branches · {lead.planInterest}
                          </div>
                        </div>
                        <span
                          className={
                            lead.status === 'converted'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {lead.status.toUpperCase()}
                        </span>
                      </div>
                      {lead.notes && <p className="text-slate-600">{lead.notes}</p>}
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-[11px] text-slate-400">{lead.createdAt}</span>
                        {lead.status !== 'converted' && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = providerConvertLeadToTenant(lead.id);
                              setNotice({ type: res.success ? 'ok' : 'err', text: res.message });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Convert to Active Tenant
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immutable Provider Security & Billing Audit Log */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">System Provider Audit Stream</h2>
                    <p className="text-xs text-slate-500">All provisioning, suspensions, role changes, and inspections</p>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {providerAuditLogs.map((ev) => (
                    <div key={ev.id} className="p-4 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900">{ev.action}</span>
                        <span className="font-mono text-[11px] text-slate-400">{ev.timestamp}</span>
                      </div>
                      <div className="font-semibold text-slate-800">{ev.target}</div>
                      <div className="text-slate-600">{ev.details}</div>
                      <div className="text-[11px] font-mono text-slate-400">Actor: {ev.actorEmail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
