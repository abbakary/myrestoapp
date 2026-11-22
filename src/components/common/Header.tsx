import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  Mail,
  Coins,
  ChevronDown,
  ShoppingBag,
  ArrowLeftRight,
  AlertTriangle,
  ChefHat,
  ShieldCheck,
  CheckCheck,
  X,
  ExternalLink,
  Building2,
  Layers,
  Plus,
  Globe,
  Check,
  LogOut,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Role, AppNotification, RestaurantTenant } from '../../types/restaurant';
import { EmailWorkspaceModal } from './EmailWorkspaceModal';

export const Header: React.FC = () => {
  const {
    organizations,
    currentOrganization,
    setCurrentOrganizationId,
    createSaasTenant,
    tenants,
    currentTenant,
    setCurrentTenantId,
    viewScope,
    switchToHqOverview,
    activeOperator,
    addBranchToCurrentOrg,
    currentBranchQuota,
    branchMetricsSummaries,
    activeRole,
    setActiveRole,
    currency,
    toggleCurrency,
    formatMoney,
    soundAlertTriggered,
    dismissSoundAlert,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    unreadEmailCount,
    orders,
    menuItems,
    waiters,
    authenticatedAccount,
    providerExitInspection,
    setPlatformSurface,
    logoutAccount,
  } = useRestaurant();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const [branchLimitNotice, setBranchLimitNotice] = useState<string | null>(null);
  const [showAddTenantForm, setShowAddTenantForm] = useState(false);

  // Quick Add Branch form state
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchModel, setNewBranchModel] =
    useState<RestaurantTenant['operatingModel']>('dine_in_restaurant');

  // Quick Add Tenant form state
  const [newTenantOrgName, setNewTenantOrgName] = useState('');
  const [newTenantOwnerName, setNewTenantOwnerName] = useState('');
  const [newTenantOwnerEmail, setNewTenantOwnerEmail] = useState('');
  const [newTenantBranchName, setNewTenantBranchName] = useState('');
  const [newTenantBranchCode, setNewTenantBranchCode] = useState('HQ-01');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [notifFilter, setNotifFilter] = useState<'all' | 'order' | 'transfer_stock' | 'kitchen'>('all');
  const switcherRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (switcherRef.current && !switcherRef.current.contains(target)) {
        setIsSwitcherOpen(false);
        setShowAddBranchForm(false);
        setShowAddTenantForm(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleTitles: Record<Role, { title: string; subtitle: string }> = {
    owner: {
      title: viewScope === 'hq_overview' ? 'Main HQ Multi-Branch Control' : 'Sales Summary & Analytics',
      subtitle:
        viewScope === 'hq_overview'
          ? `${currentOrganization.name} · ${tenants.length} Branches`
          : `${currentTenant.branchCode} · Branch Back Office`,
    },
    cashier: { title: 'Cashier POS Terminal', subtitle: `${currentTenant.branchCode} · Live Counter & Orders` },
    waiter: { title: 'Waiter Management & QR', subtitle: `${currentTenant.branchCode} · Sales & Commissions` },
    kitchen: { title: 'Kitchen Display System (KDS)', subtitle: `${currentTenant.branchCode} · Live Stations` },
    customer: { title: 'Customer Ordering Portal', subtitle: `${currentTenant.name} · Online Dining` },
    manager: { title: 'Inventory, Recipes & BOM', subtitle: `${currentTenant.branchCode} · Food Costing & Stock` },
    reception: { title: 'Staff, Advances & Payroll', subtitle: `${currentTenant.branchCode} · HR & Settlements` },
  };

  const currentInfo = roleTitles[activeRole];

  const totalOrgSales = useMemo(
    () => branchMetricsSummaries.reduce((sum, b) => sum + b.todaySales, 0),
    [branchMetricsSummaries]
  );

  // Scoped Search Results (strictly isolated to active tenant / branch)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { dishes: [], branchOrders: [], staff: [] };
    return {
      dishes: menuItems.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)).slice(0, 4),
      branchOrders: orders
        .filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            (o.serviceCouponCode && o.serviceCouponCode.toLowerCase().includes(q))
        )
        .slice(0, 4),
      staff: waiters.filter((w) => w.name.toLowerCase().includes(q) || w.referralCode.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [searchQuery, menuItems, orders, waiters]);

  const hasSearchResults =
    searchResults.dishes.length > 0 ||
    searchResults.branchOrders.length > 0 ||
    searchResults.staff.length > 0;

  const formatRelativeTime = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'all') return true;
    if (notifFilter === 'order') return n.type === 'order';
    if (notifFilter === 'transfer_stock') return n.type === 'transfer' || n.type === 'stock';
    if (notifFilter === 'kitchen') return n.type === 'kitchen';
    return true;
  });

  const getNotifIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-orange-600" />;
      case 'transfer':
        return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
      case 'stock':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'kitchen':
        return <ChefHat className="w-4 h-4 text-emerald-600" />;
      case 'payroll':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-600" />;
    }
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setBranchLimitNotice(null);
    const created = addBranchToCurrentOrg({
      name: newBranchName,
      branchCode: newBranchCode || `BR-${tenants.length + 1}`,
      operatingModel: newBranchModel,
      phone: '+255 755 000 100',
      email: newBranchEmail,
      managerName: newBranchManager || 'Branch Manager',
      address: newBranchAddress || 'Dar es Salaam, Tanzania',
      cloneCatalogFromCurrent: true,
    });
    if (!created) {
      setBranchLimitNotice(
        `Package branch quota reached (${currentBranchQuota.used}/${currentBranchQuota.max} on ${currentOrganization.plan}). Upgrade package in System Provider Control.`
      );
      return;
    }
    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchEmail('');
    setNewBranchManager('');
    setNewBranchAddress('');
    setShowAddBranchForm(false);
    setCurrentTenantId(created.id);
    setIsSwitcherOpen(false);
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantOrgName.trim()) return;
    createSaasTenant({
      orgName: newTenantOrgName,
      ownerName: newTenantOwnerName || 'Tenant Owner',
      ownerEmail: newTenantOwnerEmail,
      branchName: newTenantBranchName || `${newTenantOrgName.trim()} — Main HQ`,
      branchCode: newTenantBranchCode || 'HQ-01',
      operatingModel: 'dine_in_restaurant',
      phone: '+255 700 100 200',
      address: 'Dar es Salaam, Tanzania',
    });
    setNewTenantOrgName('');
    setNewTenantOwnerName('');
    setNewTenantOwnerEmail('');
    setNewTenantBranchName('');
    setShowAddTenantForm(false);
    setIsSwitcherOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-200/80">
        {/* Sound / Live Order Alert Bar */}
        {soundAlertTriggered && (
          <div className="bg-orange-500 text-white text-xs py-1.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 animate-bounce" />
              <span className="font-semibold">New Order Received ({currentTenant.branchCode})!</span>
              <span>Real-time ticket dispatched to Kitchen Display and Waiter ledger.</span>
            </div>
            <button
              type="button"
              onClick={dismissSoundAlert}
              className="text-xs bg-orange-700 hover:bg-orange-800 text-white px-2 py-0.5 rounded text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Top Header Strip */}
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left Side: SaaS Tenant & Branch / Main HQ Switcher + Breadcrumb */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen((prev) => !prev)}
                className={`flex items-center gap-2.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                  viewScope === 'hq_overview'
                    ? 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800'
                    : 'bg-neutral-100 text-neutral-800 border-neutral-200/80 hover:bg-neutral-200/70'
                }`}
                aria-expanded={isSwitcherOpen}
              >
                <span className="text-base leading-none">
                  {viewScope === 'hq_overview' ? currentOrganization.logo : currentTenant.logo}
                </span>
                <div className="text-left leading-tight">
                  <div className="max-w-[170px] sm:max-w-[230px] truncate">
                    {viewScope === 'hq_overview'
                      ? `${currentOrganization.name} · HQ`
                      : currentTenant.name}
                  </div>
                  <div
                    className={`text-[10px] font-mono ${
                      viewScope === 'hq_overview' ? 'text-orange-300' : 'text-neutral-500'
                    }`}
                  >
                    {viewScope === 'hq_overview'
                      ? `All ${tenants.length} Branches`
                      : `${currentOrganization.slug} · ${currentTenant.branchCode}`}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 ${
                    viewScope === 'hq_overview' ? 'text-neutral-300' : 'text-neutral-400'
                  }`}
                />
              </button>

              {/* Click-triggered Tenant & Branch Popover */}
              {isSwitcherOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-3 z-50 space-y-3 max-h-[82vh] overflow-y-auto">
                  {/* SaaS Tenant Organization Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>SaaS Tenant Organization (Isolated)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddTenantForm((p) => !p);
                          setShowAddBranchForm(false);
                        }}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        {showAddTenantForm ? 'Close' : '+ New Tenant'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                      {organizations.map((org) => {
                        const active = org.id === currentOrganization.id;
                        return (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => {
                              setCurrentOrganizationId(org.id);
                              setIsSwitcherOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              active
                                ? 'bg-neutral-900 text-white font-semibold'
                                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base">{org.logo}</span>
                              <div className="min-w-0">
                                <div className="truncate font-bold">{org.name}</div>
                                <div
                                  className={`text-[10px] font-mono truncate ${
                                    active ? 'text-neutral-300' : 'text-neutral-500'
                                  }`}
                                >
                                  {org.ownerEmail} · {org.plan}
                                </div>
                              </div>
                            </div>
                            {active && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {showAddTenantForm && (
                      <form
                        onSubmit={handleCreateTenant}
                        className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs"
                      >
                        <div className="font-bold text-neutral-900">Onboard New Isolated SaaS Tenant</div>
                        <input
                          type="text"
                          required
                          value={newTenantOrgName}
                          onChange={(e) => setNewTenantOrgName(e.target.value)}
                          placeholder="Organization Name (e.g. Zanzibar Spice Group)"
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={newTenantOwnerName}
                            onChange={(e) => setNewTenantOwnerName(e.target.value)}
                            placeholder="Owner Name"
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg"
                          />
                          <input
                            type="email"
                            value={newTenantOwnerEmail}
                            onChange={(e) => setNewTenantOwnerEmail(e.target.value)}
                            placeholder="Owner Email"
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newTenantBranchName}
                            onChange={(e) => setNewTenantBranchName(e.target.value)}
                            placeholder="HQ Branch Name"
                            className="col-span-2 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg"
                          />
                          <input
                            type="text"
                            value={newTenantBranchCode}
                            onChange={(e) => setNewTenantBranchCode(e.target.value)}
                            placeholder="Code"
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg font-mono uppercase"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg cursor-pointer"
                        >
                          Create Isolated Tenant
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Main HQ Overview Control */}
                  <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>Main HQ Overview &amp; Control</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        switchToHqOverview();
                        setIsSwitcherOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                        viewScope === 'hq_overview'
                          ? 'bg-orange-50 border-orange-300 text-orange-950 font-bold'
                          : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-orange-600" />
                          <span>Main HQ — All {tenants.length} Branches Overview</span>
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5 font-mono tabular-nums">
                          Consolidated Live Sales: {formatMoney(totalOrgSales)} · HQ Controls
                        </div>
                      </div>
                      {viewScope === 'hq_overview' && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      )}
                    </button>
                  </div>

                  {/* Isolated Branches inside Current Tenant */}
                  <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {currentOrganization.name} Branches ({currentBranchQuota.used}/{currentBranchQuota.max} Quota)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBranchLimitNotice(null);
                          setShowAddBranchForm((p) => !p);
                          setShowAddTenantForm(false);
                        }}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Branch</span>
                      </button>
                    </div>

                    {branchLimitNotice && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-800">
                        {branchLimitNotice}
                      </div>
                    )}

                    <div className="space-y-1">
                      {branchMetricsSummaries.map(({ branch, activeOrdersCount, todaySales }) => {
                        const isActiveBranch =
                          viewScope === 'branch' && branch.id === currentTenant.id;
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => {
                              setCurrentTenantId(branch.id);
                              setIsSwitcherOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                              isActiveBranch
                                ? 'bg-orange-50 border-orange-300 text-orange-950 font-semibold'
                                : 'bg-white border-transparent hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span>{branch.logo}</span>
                                <span className="truncate font-bold">{branch.name}</span>
                                <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                  {branch.branchCode}
                                </span>
                              </div>
                              <div className="text-[10px] text-neutral-500 pl-5 font-mono truncate tabular-nums">
                                {branch.email} · {activeOrdersCount} orders · {formatMoney(todaySales)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {branch.status === 'maintenance' && (
                                <span className="text-[10px] font-mono text-amber-700">Maint.</span>
                              )}
                              {isActiveBranch && (
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {showAddBranchForm && (
                      <form
                        onSubmit={handleCreateBranch}
                        className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs"
                      >
                        <div className="font-bold text-neutral-900">
                          Add Isolated Branch under {currentOrganization.name}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="Branch Name (e.g. Mlimani City)"
                            className="col-span-2 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg"
                          />
                          <input
                            type="text"
                            value={newBranchCode}
                            onChange={(e) => setNewBranchCode(e.target.value)}
                            placeholder="SAV-MLM"
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg font-mono uppercase"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="email"
                            value={newBranchEmail}
                            onChange={(e) => setNewBranchEmail(e.target.value)}
                            placeholder={`branch@${currentOrganization.domain}`}
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg font-mono"
                          />
                          <input
                            type="text"
                            value={newBranchManager}
                            onChange={(e) => setNewBranchManager(e.target.value)}
                            placeholder="Manager Name"
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={newBranchModel}
                            onChange={(e) =>
                              setNewBranchModel(e.target.value as RestaurantTenant['operatingModel'])
                            }
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg"
                          >
                            <option value="dine_in_restaurant">Dine-In Restaurant</option>
                            <option value="cafe_bistro">Cafe &amp; Bistro</option>
                            <option value="fast_food_chips">Fast Grill</option>
                          </select>
                          <input
                            type="text"
                            value={newBranchAddress}
                            onChange={(e) => setNewBranchAddress(e.target.value)}
                            placeholder="Location Address"
                            className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg cursor-pointer"
                        >
                          Provision &amp; Switch to Branch
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden xl:block text-xs text-neutral-300">/</div>

            <div className="hidden xl:block min-w-0">
              <div className="text-xs font-bold text-neutral-900 leading-none truncate">
                {currentInfo.title}
              </div>
            </div>
          </div>

          {/* Center: Working Branch-Scoped Search */}
          <div className="flex-1 max-w-lg hidden md:block relative" ref={searchRef}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder={`Search ${currentTenant.branchCode} dishes, orders, waiters...`}
                className="w-full bg-neutral-100/80 border border-neutral-200/80 text-xs text-neutral-800 placeholder-neutral-400 rounded-full py-2 pl-4 pr-10 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 z-50 max-h-80 overflow-y-auto text-xs space-y-2">
                {!hasSearchResults ? (
                  <div className="p-3 text-center text-neutral-500">
                    No matching items in {currentTenant.name}.
                  </div>
                ) : (
                  <>
                    {searchResults.branchOrders.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase text-neutral-400">
                          Orders ({currentTenant.branchCode})
                        </div>
                        {searchResults.branchOrders.map((ord) => (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => {
                              setActiveRole('cashier');
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-semibold text-neutral-900">
                              {ord.orderNumber} · {ord.customerName}
                            </span>
                            <span className="font-mono text-neutral-500">{formatMoney(ord.total)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.dishes.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase text-neutral-400">
                          Menu Items
                        </div>
                        {searchResults.dishes.map((dish) => (
                          <button
                            key={dish.id}
                            type="button"
                            onClick={() => {
                              setActiveRole('cashier');
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-semibold text-neutral-900">{dish.name}</span>
                            <span className="font-mono text-neutral-500">{formatMoney(dish.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.staff.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase text-neutral-400">
                          Waiters
                        </div>
                        {searchResults.staff.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => {
                              setActiveRole('waiter');
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-semibold text-neutral-900">{w.name}</span>
                            <span className="font-mono text-neutral-500">{w.referralCode}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Currency Toggle, Notifications, Working Email Site, Dynamic Operator Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Currency Toggle */}
            <button
              type="button"
              onClick={toggleCurrency}
              className="flex items-center gap-1 py-1.5 px-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              title="Toggle Currency between Tanzanian Shillings (TZS) and USD"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono font-bold">{currency}</span>
            </button>

            {/* Interactive Notification Bell with Dropdown */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`p-2 rounded-full transition-all relative cursor-pointer ${
                  isNotifOpen
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                title="Activity & Alert Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-orange-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md font-mono border-2 border-white">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200/90 z-50 overflow-hidden">
                  <div className="p-3.5 bg-neutral-50/90 border-b border-neutral-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-neutral-900">
                        Notifications ({currentTenant.branchCode})
                      </span>
                      {unreadNotificationCount > 0 ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">
                          {unreadNotificationCount} unread
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          All caught up
                        </span>
                      )}
                    </div>

                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-semibold cursor-pointer"
                        title="Mark all notifications as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="px-3 py-2 border-b border-neutral-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'transfer_stock', label: 'Stock & Transfers' },
                      { id: 'order', label: 'Orders' },
                      { id: 'kitchen', label: 'Kitchen' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotifFilter(tab.id as any)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          notifFilter === tab.id
                            ? 'bg-neutral-900 text-white'
                            : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3.5 transition-colors relative flex items-start gap-3 group ${
                            !notif.read ? 'bg-orange-50/30 hover:bg-orange-50/60' : 'hover:bg-neutral-50/70'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200/60 mt-0.5">
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-neutral-900 leading-tight">
                                {notif.title}
                              </span>
                              {!notif.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-mono text-neutral-400">
                                {formatRelativeTime(notif.timestamp)}
                              </span>
                              {notif.actionRole && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    markNotificationAsRead(notif.id);
                                    setActiveRole(notif.actionRole!);
                                    setIsNotifOpen(false);
                                  }}
                                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>{notif.actionLabel || 'View Details'}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notif.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-700 rounded transition-opacity cursor-pointer"
                            title="Dismiss notification"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-2">
                          <Bell className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-neutral-700">No notifications in this category</p>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-neutral-50/90 border-t border-neutral-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-mono">{notifications.length} total alerts</span>
                    <button
                      type="button"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-neutral-600 hover:text-neutral-900 font-semibold px-2 py-0.5 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Working Email Site Button with Unread Counter */}
            <button
              type="button"
              onClick={() => setIsMailOpen(true)}
              className={`p-2 rounded-full transition-colors relative cursor-pointer ${
                isMailOpen
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title={`Open Email Workspace (${activeOperator.email})`}
              aria-label="Open Email Site"
            >
              <Mail className="w-4 h-4" />
              {unreadEmailCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md font-mono border-2 border-white">
                  {unreadEmailCount > 9 ? '9+' : unreadEmailCount}
                </span>
              )}
            </button>

            {/* Clean Account & Workspace Menu (Consolidates Profile, Mailbox, Public Site, Provider & Sign Out) */}
            <div className="relative pl-2 border-l border-neutral-200" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 hover:bg-neutral-50 rounded-xl py-1 px-2 transition-colors cursor-pointer text-left whitespace-nowrap"
                aria-expanded={isAccountMenuOpen}
                title={`${activeOperator.name} · ${activeOperator.email}`}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {activeOperator.initials}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-neutral-900 leading-tight max-w-[130px] truncate">
                    {activeOperator.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-tight">
                    {activeOperator.roleLabel}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </button>

              {isAccountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-2 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-neutral-100">
                    <div className="text-xs font-bold text-neutral-900 truncate">
                      {activeOperator.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono truncate">
                      {activeOperator.email}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      setIsMailOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-50 text-xs font-semibold text-neutral-800 flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-neutral-500" />
                      <span>Email Workspace</span>
                    </span>
                    {unreadEmailCount > 0 && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700">
                        {unreadEmailCount} unread
                      </span>
                    )}
                  </button>

                  {authenticatedAccount?.role === 'provider_admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        providerExitInspection();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-50 text-xs font-semibold text-neutral-800 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-orange-500" />
                      <span>Provider Console</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      setPlatformSurface('landing');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-50 text-xs font-semibold text-neutral-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-neutral-500" />
                    <span>Public Website</span>
                  </button>

                  <div className="pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        logoutAccount();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <EmailWorkspaceModal isOpen={isMailOpen} onClose={() => setIsMailOpen(false)} />
    </>
  );
};
