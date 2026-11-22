import React from 'react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { SidebarNav } from './components/common/SidebarNav';
import { Header } from './components/common/Header';
import { PosView } from './components/pos/PosView';
import { WaiterView } from './components/waiter/WaiterView';
import { KitchenView } from './components/kitchen/KitchenView';
import { CustomerPortalView } from './components/customer/CustomerPortalView';
import { InventoryRecipesView } from './components/inventory/InventoryRecipesView';
import { HrPayrollView } from './components/hr/HrPayrollView';
import { OwnerDashboardView } from './components/owner/OwnerDashboardView';
import { PublicLandingSite } from './components/platform/PublicLandingSite';
import { AuthPortalView } from './components/platform/AuthPortalView';
import { ProviderControlView } from './components/platform/ProviderControlView';
import { useMobileEnvironment } from './utils/mobileEnvironment';

const AppContent: React.FC = () => {
  const {
    activeRole,
    setActiveRole,
    isStandalonePortal,
    platformSurface,
    authenticatedAccount,
    impersonatingOrgId,
    providerExitInspection,
    currentOrganization,
    currentTenant,
    tenants,
    setCurrentTenantId,
    viewScope,
    switchToHqOverview,
    workspaceRevision,
  } = useRestaurant();
  const { isMobileViewport, isStandalonePortal: envStandalone } = useMobileEnvironment();

  const isDedicatedMobilePortal = activeRole === 'customer' || activeRole === 'waiter';
  const lockedStandalone = isStandalonePortal || envStandalone;

  // Non-QR sessions route across Public Landing, Auth Portal, and System Provider Control surfaces
  if (!lockedStandalone) {
    if (platformSurface === 'landing') {
      return <PublicLandingSite />;
    }
    if (platformSurface === 'login' || platformSurface === 'register') {
      return <AuthPortalView />;
    }
    if (platformSurface === 'provider') {
      return <ProviderControlView />;
    }
  }

  // Hide ERP sidebar completely on mobile viewports or standalone mobile app shells for Customer/Waiter
  const showSidebar = !isDedicatedMobilePortal || (!isMobileViewport && !lockedStandalone);
  // Customer and Waiter portals have their own focused AppBars instead of the ERP back-office Header
  const showErpHeader = !isDedicatedMobilePortal;

  // Remount active workspace views whenever Tenant, HQ/Branch Scope, Active Branch, or explicit refresh changes
  const workspaceKey = `${currentOrganization.id}:${viewScope}:${currentTenant.id}:${workspaceRevision}`;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex font-sans selection:bg-orange-500 selection:text-white">
      {showSidebar && (
        <div className={isDedicatedMobilePortal ? 'hidden md:flex' : 'flex'}>
          <SidebarNav />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {showErpHeader &&
          authenticatedAccount?.role === 'provider_admin' &&
          impersonatingOrgId && (
            <div className="bg-amber-950 text-amber-50 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-amber-900">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold uppercase tracking-wider text-amber-300 whitespace-nowrap">
                  Provider Inspection
                </span>
                <span className="text-amber-600">·</span>
                <span className="truncate">
                  Auditing tenant <strong className="text-white">{currentOrganization.name}</strong> ({currentOrganization.plan})
                </span>
              </div>
              <button
                type="button"
                onClick={providerExitInspection}
                className="px-3 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Return to Provider Control Site
              </button>
            </div>
          )}

        {showErpHeader && <Header />}

        {/* Main HQ Cross-Branch Operational Context Bar when HQ inspects a non-owner terminal */}
        {showErpHeader && viewScope === 'hq_overview' && activeRole !== 'owner' && (
          <div className="bg-neutral-900 text-white px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-neutral-800">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-mono font-bold uppercase tracking-wider text-orange-400">
                Main HQ Control
              </span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-300 truncate">
                Operating terminal for{' '}
                <strong className="text-white">{currentTenant.name}</strong> ({currentTenant.branchCode})
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {tenants.map((branch) => {
                const isSelected = branch.id === currentTenant.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setCurrentTenantId(branch.id)}
                    className={`px-2 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                    }`}
                  >
                    {branch.branchCode}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  switchToHqOverview();
                  setActiveRole('owner');
                }}
                className="ml-1 px-2.5 py-1 rounded-md bg-white text-neutral-900 font-bold text-[11px] hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                All Branches Overview
              </button>
            </div>
          </div>
        )}

        <ViewErrorBoundary
          resetKey={`${workspaceKey}:${activeRole}`}
          onResetToDashboard={() => setActiveRole('owner')}
        >
          <main key={workspaceKey} className="flex-1 min-w-0 animate-in fade-in duration-150">
            {activeRole === 'owner' && <OwnerDashboardView />}
            {activeRole === 'cashier' && <PosView />}
            {activeRole === 'waiter' && <WaiterView />}
            {activeRole === 'kitchen' && <KitchenView />}
            {activeRole === 'customer' && <CustomerPortalView />}
            {activeRole === 'manager' && <InventoryRecipesView />}
            {activeRole === 'reception' && <HrPayrollView />}
          </main>
        </ViewErrorBoundary>
      </div>
    </div>
  );
};

class ViewErrorBoundary extends React.Component<
  { resetKey: string; onResetToDashboard: () => void; children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { resetKey: string; onResetToDashboard: () => void; children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 sm:p-10 max-w-xl mx-auto">
          <div className="bg-white rounded-2xl border border-rose-200 p-6 space-y-4 shadow-xs">
            <div className="text-sm font-extrabold text-rose-900">
              Unable to load this workspace section
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {this.state.error.message || 'An unexpected rendering issue occurred.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold cursor-pointer"
              >
                Retry Section
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: null });
                  this.props.onResetToDashboard();
                }}
                className="px-4 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs font-bold cursor-pointer"
              >
                Return to Main Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <RestaurantProvider>
      <AppContent />
    </RestaurantProvider>
  );
}
