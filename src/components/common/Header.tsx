import React from 'react';
import {
  Search,
  Bell,
  Mail,
  Coins,
  ChevronDown,
  Store,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Role } from '../../types/restaurant';

export const Header: React.FC = () => {
  const {
    tenants,
    currentTenant,
    setCurrentTenantId,
    activeRole,
    setActiveRole,
    currency,
    toggleCurrency,
    soundAlertTriggered,
    dismissSoundAlert,
    orders,
  } = useRestaurant();

  const roleTitles: Record<Role, { title: string; subtitle: string }> = {
    owner: { title: 'Executive BI Dashboard', subtitle: 'Overview & Profitability' },
    cashier: { title: 'Cashier POS Terminal', subtitle: 'Live Counter & Orders' },
    waiter: { title: 'Waiter Management & QR', subtitle: 'Sales & Commissions' },
    kitchen: { title: 'Kitchen Display System (KDS)', subtitle: 'Real-time Line & Station Orders' },
    customer: { title: 'Customer Ordering Portal', subtitle: 'White-Label Online Dining' },
    manager: { title: 'Inventory, Recipes & BOM', subtitle: 'Food Costing & Purchasing' },
    reception: { title: 'Staff, Advances & Payroll', subtitle: 'HR & Commission Settlements' },
  };

  const currentInfo = roleTitles[activeRole];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200/80">
      {/* Sound / Live Order Alert Bar */}
      {soundAlertTriggered && (
        <div className="bg-orange-500 text-white text-xs py-1.5 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span className="font-semibold">New Order Received!</span>
            <span>Real-time ticket dispatched to Kitchen Display and Waiter ledger.</span>
          </div>
          <button
            onClick={dismissSoundAlert}
            className="text-xs bg-orange-700 hover:bg-orange-800 text-white px-2 py-0.5 rounded text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Top Header Strip matching screenshot 2 layout */}
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Branch Switcher & Breadcrumb */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200/70 rounded-xl transition-colors">
              <span className="text-base">{currentTenant.logo}</span>
              <span className="max-w-[150px] sm:max-w-[180px] truncate">{currentTenant.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Dropdown menu */}
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 p-1.5 hidden group-hover:block z-50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                Switch Restaurant / Branch
              </div>
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTenantId(t.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    t.id === currentTenant.id
                      ? 'bg-orange-50 text-orange-950 font-semibold'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span>{t.logo}</span>
                      <span>{t.name}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 pl-5">{t.operatingModel.replace(/_/g, ' ')}</div>
                  </div>
                  {t.id === currentTenant.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:block text-xs text-neutral-400">/</div>

          <div className="hidden sm:block">
            <div className="text-xs font-bold text-neutral-900 leading-none">{currentInfo.title}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">{currentInfo.subtitle}</div>
          </div>
        </div>

        {/* Center: Search input (Matching Screenshot 2: rounded pill search input with magnifying glass) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Search dishes, bills, orders, waiter links..."
              className="w-full bg-neutral-100/80 border border-neutral-200/80 text-xs text-neutral-800 placeholder-neutral-400 rounded-full py-2 pl-4 pr-10 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Currency Toggle, Notifications, Profile (Matching Screenshot 2) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Currency Toggle */}
          <button
            onClick={toggleCurrency}
            className="flex items-center gap-1 py-1.5 px-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            title="Toggle Currency between Tanzanian Shillings (TZS) and USD"
          >
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-mono font-bold">{currency}</span>
          </button>

          {/* Quick Notification Bell */}
          <button
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
          </button>

          {/* Mail icon */}
          <button
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors hidden sm:flex"
            title="Messages"
          >
            <Mail className="w-4 h-4" />
          </button>

          {/* Tony Danza Profile Chip matching Screenshot 2 */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-neutral-200">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Tony Danza"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/src/assets/images/hero_restaurant_dining_1794223268333.jpg';
                }}
              />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-neutral-900 leading-tight">Tony Danza</div>
              <div className="text-[10px] text-neutral-400 font-mono">tonydanza23@gmail.com</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
