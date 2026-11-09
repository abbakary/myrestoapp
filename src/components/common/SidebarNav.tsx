import React, { useState } from 'react';
import {
  LayoutGrid,
  Receipt,
  Users,
  ChefHat,
  Smartphone,
  Boxes,
  ShieldCheck,
  ChevronRight,
  UtensilsCrossed,
  Bell,
  LogOut,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Role } from '../../types/restaurant';

export const SidebarNav: React.FC = () => {
  const { activeRole, setActiveRole, orders, currentTenant } = useRestaurant();
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null);

  const pendingKitchenCount = orders.filter(
    (o) => o.status === 'sent_to_kitchen' || o.status === 'preparing'
  ).length;

  const navItems: {
    role: Role;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      role: 'owner',
      label: 'Executive BI',
      description: 'Analytics, revenue & P&L',
      icon: LayoutGrid, // Matching the orange 4-tile icon in image_c2d80d86.png
    },
    {
      role: 'cashier',
      label: 'Cashier POS',
      description: 'Billing, registers & receipts',
      icon: Receipt,
    },
    {
      role: 'waiter',
      label: 'Waiter App',
      description: 'Personal link & 5% commission',
      icon: Users,
    },
    {
      role: 'kitchen',
      label: 'Kitchen KDS',
      description: 'Live order stations & tickets',
      icon: ChefHat,
    },
    {
      role: 'customer',
      label: 'Customer Portal',
      description: 'White-label web & mobile orders',
      icon: Smartphone,
    },
    {
      role: 'manager',
      label: 'Inventory & BOM',
      description: 'Recipe costing & stock',
      icon: Boxes,
    },
    {
      role: 'reception',
      label: 'Staff & Payroll',
      description: 'HR, advances & settlements',
      icon: ShieldCheck,
    },
  ];

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="flex flex-col items-center justify-between w-16 sm:w-20 lg:w-[84px] bg-white border-r border-neutral-200/90 py-4 sm:py-5 shrink-0 select-none z-30 sticky top-0 h-screen"
    >
      {/* Top Brand Logo matching screenshot circular GT EATS style */}
      <div className="flex flex-col items-center gap-4 w-full">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveRole('owner');
          }}
          className="relative group p-2 rounded-2xl hover:bg-neutral-50 transition-transform hover:scale-105"
          title="RestaurantOS"
        >
          {/* Circular Ring Logo (Inspired by GT EATS) */}
          <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center p-1.5 relative overflow-hidden">
            <div className="absolute inset-1 rounded-xl border-2 border-dashed border-orange-500/70 animate-spin-slow pointer-events-none" />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
          </div>
        </a>

        {/* Vertical Track Container (Curved rounded capsule track as in screenshot) */}
        <div className="w-14 bg-neutral-100/80 rounded-full py-2.5 px-1.5 flex flex-col items-center gap-2 border border-neutral-200/60 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeRole === item.role;

            return (
              <div
                key={item.role}
                className="relative flex items-center justify-center"
                onMouseEnter={() => setHoveredRole(item.role)}
                onMouseLeave={() => setHoveredRole(null)}
              >
                <button
                  onClick={() => setActiveRole(item.role)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 relative group cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/80'
                  }`}
                  aria-label={item.label}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 text-white' : 'text-neutral-600 group-hover:text-neutral-900'}`} />

                  {/* Pending Badge on Kitchen icon */}
                  {item.role === 'kitchen' && pendingKitchenCount > 0 && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs font-mono">
                      {pendingKitchenCount}
                    </span>
                  )}
                </button>

                {/* Hover Flyout Tooltip Card */}
                {hoveredRole === item.role && (
                  <div className="absolute left-14 ml-2 z-50 pointer-events-none bg-neutral-900 text-white rounded-xl py-2 px-3 shadow-xl border border-neutral-800 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-150">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{item.label}</span>
                      {isActive && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-500/30 text-orange-300 font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {item.description}
                    </div>
                    {/* Tooltip little arrow */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-neutral-900 rotate-45 border-l border-b border-neutral-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Profile / Quick User Avatar (Matching Tony Danza in Screenshot 2) */}
      <div className="flex flex-col items-center gap-3 w-full">
        <div
          className="relative group cursor-pointer"
          onClick={() => setActiveRole('owner')}
          title="Tony Danza · Restaurant Owner & Admin"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500/50 shadow-sm bg-neutral-200">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Tony Danza"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback avatar
                (e.target as HTMLImageElement).src = '/src/assets/images/hero_restaurant_dining_1794223268333.jpg';
              }}
            />
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
      </div>
    </aside>
  );
};
