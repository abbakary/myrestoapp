import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Role, AppNotification } from '../../types/restaurant';

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
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
  } = useRestaurant();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'order' | 'transfer_stock' | 'kitchen'>('all');
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

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

  // Format relative time helper
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

      {/* Main Top Header Strip */}
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

        {/* Center: Search input */}
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

        {/* Right Side: Currency Toggle, Interactive Notifications, Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Currency Toggle */}
          <button
            onClick={toggleCurrency}
            className="flex items-center gap-1 py-1.5 px-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            title="Toggle Currency between Tanzanian Shillings (TZS) and USD"
          >
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-mono font-bold">{currency}</span>
          </button>

          {/* Interactive Notification Bell with Dropdown */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className={`p-2 rounded-full transition-all relative ${
                isNotifOpen
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              title="Activity & Alert Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />

              {/* Live Badge Counter */}
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-orange-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md font-mono border-2 border-white animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Dropdown Popover */}
            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="p-3.5 bg-neutral-50/90 border-b border-neutral-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-900">Notifications</span>
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
                      onClick={markAllNotificationsAsRead}
                      className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-semibold"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="px-3 py-2 border-b border-neutral-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'transfer_stock', label: 'Stock & Transfers' },
                    { id: 'order', label: 'Orders' },
                    { id: 'kitchen', label: 'Kitchen' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setNotifFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                        notifFilter === tab.id
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Notifications List */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 transition-colors relative flex items-start gap-3 group ${
                          !notif.read ? 'bg-orange-50/30 hover:bg-orange-50/60' : 'hover:bg-neutral-50/70'
                        }`}
                      >
                        {/* Type Icon Badge */}
                        <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200/60 mt-0.5">
                          {getNotifIcon(notif.type)}
                        </div>

                        {/* Content */}
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
                                onClick={() => {
                                  markNotificationAsRead(notif.id);
                                  setActiveRole(notif.actionRole!);
                                  setIsNotifOpen(false);
                                }}
                                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
                              >
                                <span>{notif.actionLabel || 'View Details'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dismiss Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-700 rounded transition-opacity"
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
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        New orders, transfers, and stock alerts will appear here
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-neutral-50/90 border-t border-neutral-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-mono">
                    {notifications.length} total alerts
                  </span>
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="text-neutral-600 hover:text-neutral-900 font-semibold px-2 py-0.5"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

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
