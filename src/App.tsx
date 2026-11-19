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
import { useMobileEnvironment } from './utils/mobileEnvironment';

const AppContent: React.FC = () => {
  const { activeRole, isStandalonePortal } = useRestaurant();
  const { isMobileViewport, isStandalonePortal: envStandalone } = useMobileEnvironment();

  const isDedicatedMobilePortal = activeRole === 'customer' || activeRole === 'waiter';
  const lockedStandalone = isStandalonePortal || envStandalone;

  // Hide ERP sidebar completely on mobile viewports or standalone mobile app shells for Customer/Waiter
  const showSidebar = !isDedicatedMobilePortal || (!isMobileViewport && !lockedStandalone);
  // Customer and Waiter portals have their own focused AppBars instead of the ERP back-office Header
  const showErpHeader = !isDedicatedMobilePortal;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex font-sans selection:bg-orange-500 selection:text-white">
      {showSidebar && (
        <div className={isDedicatedMobilePortal ? 'hidden md:flex' : 'flex'}>
          <SidebarNav />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {showErpHeader && <Header />}

        <main className="flex-1 min-w-0">
          {activeRole === 'owner' && <OwnerDashboardView />}
          {activeRole === 'cashier' && <PosView />}
          {activeRole === 'waiter' && <WaiterView />}
          {activeRole === 'kitchen' && <KitchenView />}
          {activeRole === 'customer' && <CustomerPortalView />}
          {activeRole === 'manager' && <InventoryRecipesView />}
          {activeRole === 'reception' && <HrPayrollView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <RestaurantProvider>
      <AppContent />
    </RestaurantProvider>
  );
}
