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

const AppContent: React.FC = () => {
  const { activeRole } = useRestaurant();

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex font-sans selection:bg-orange-500 selection:text-white">
      {/* Sleek Vertical Sidebar Navigation matching image_c2d80d86.png */}
      <SidebarNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1">
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
