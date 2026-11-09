import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ChefHat,
  Filter,
  Flame,
  Coffee,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { KitchenStation, OrderStatus } from '../../types/restaurant';

export const KitchenView: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    updateOrderItemStatus,
    soundAlertTriggered,
    dismissSoundAlert,
    waiters,
  } = useRestaurant();

  const [selectedStation, setSelectedStation] = useState<KitchenStation | 'all'>('all');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Filter orders relevant to kitchen
  const kitchenOrders = orders.filter(
    (o) =>
      o.status === 'sent_to_kitchen' ||
      o.status === 'preparing' ||
      o.status === 'ready'
  );

  // Station definitions
  const stations: { id: KitchenStation | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Kitchen Stations', icon: ChefHat },
    { id: 'grill', label: 'Grill & Charcoal', icon: Flame },
    { id: 'hot_kitchen', label: 'Hot Kitchen & Fryer', icon: Flame },
    { id: 'drinks', label: 'Bar & Beverages', icon: Coffee },
    { id: 'dessert', label: 'Pastry & Dessert', icon: Sparkles },
  ];

  const getElapsedTimeMinutes = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diffMs / (60 * 1000));
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-neutral-900 text-neutral-100 p-4 sm:p-6 space-y-5">
      {/* KDS Header & Station Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Kitchen Display System (KDS)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                Live Sync
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Real-time ticket routing with station separation & partial preparation checklists
            </p>
          </div>
        </div>

        {/* Station Filter Pills & Sound Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {stations.map((st) => {
            const Icon = st.icon;
            const isSelected = selectedStation === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{st.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title={audioEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3 Columns Kanban: New Incoming -> Preparing -> Ready */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: New / Sent to Kitchen */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Incoming New Orders
              </h2>
            </div>
            <span className="text-xs font-mono font-bold bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
              {kitchenOrders.filter((o) => o.status === 'sent_to_kitchen').length}
            </span>
          </div>

          <div className="space-y-3">
            {kitchenOrders
              .filter((o) => o.status === 'sent_to_kitchen')
              .map((order) => {
                const elapsed = getElapsedTimeMinutes(order.createdAt);
                const isLate = elapsed > 15;
                const servingWaiter = waiters.find((w) => w.id === order.servingWaiterId || w.id === order.referralWaiterId);

                // Filter items if specific station selected
                const filteredItems = selectedStation === 'all'
                  ? order.items
                  : order.items.filter((it) => it.station === selectedStation);

                if (filteredItems.length === 0) return null;

                return (
                  <div
                    key={order.id}
                    className={`bg-neutral-800/90 rounded-xl border p-4 shadow-sm transition-all ${
                      isLate
                        ? 'border-red-500/80 bg-red-950/20'
                        : 'border-neutral-700/80'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-700">
                      <div>
                        <span className="text-sm font-extrabold font-mono text-white">
                          {order.orderNumber}
                        </span>
                        <div className="text-[11px] font-semibold text-amber-400">
                          {order.tableNumber || (order.type === 'delivery' ? 'Delivery' : 'Takeaway')}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`flex items-center gap-1 text-xs font-mono font-bold ${isLate ? 'text-red-400 animate-pulse' : 'text-neutral-400'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{elapsed}m ago</span>
                        </div>
                        {servingWaiter && (
                          <div className="text-[10px] text-neutral-400 truncate max-w-[100px]">
                            Waiter: {servingWaiter.name.split(' ')[0]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items Checklist */}
                    <div className="py-3 space-y-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-start justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">
                              {it.quantity}x {it.name}
                            </span>
                            {it.portion && (
                              <span className="text-[10px] text-neutral-400 ml-1.5">({it.portion})</span>
                            )}
                            {it.selectedModifiers.map((m) => (
                              <div key={m.id} className="text-[10px] text-amber-300 pl-3">
                                + {m.name}
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300">
                            {it.station}
                          </span>
                        </div>
                      ))}

                      {order.notes && (
                        <div className="p-2 rounded bg-neutral-900 border border-neutral-700 text-[11px] text-amber-300 italic">
                          "{order.notes}"
                        </div>
                      )}
                    </div>

                    {/* CTA: Start Cooking */}
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Start Cooking (Move to Preparing)</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Column 2: In Preparation (Supports Partial Item Completion!) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-spin"></span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Currently Cooking / Preparing
              </h2>
            </div>
            <span className="text-xs font-mono font-bold bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
              {kitchenOrders.filter((o) => o.status === 'preparing').length}
            </span>
          </div>

          <div className="space-y-3">
            {kitchenOrders
              .filter((o) => o.status === 'preparing')
              .map((order) => {
                const elapsed = getElapsedTimeMinutes(order.createdAt);
                const isLate = elapsed > 20;
                const allItemsReady = order.items.every((it) => it.status === 'ready');

                return (
                  <div
                    key={order.id}
                    className={`bg-neutral-800/90 rounded-xl border p-4 shadow-sm space-y-3 ${
                      isLate ? 'border-red-500 bg-red-950/20' : 'border-neutral-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-700">
                      <div>
                        <span className="text-sm font-extrabold font-mono text-white">
                          {order.orderNumber}
                        </span>
                        <div className="text-[11px] font-semibold text-blue-400">
                          {order.tableNumber || (order.type === 'delivery' ? 'Delivery' : 'Takeaway')}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`flex items-center gap-1 text-xs font-mono font-bold ${isLate ? 'text-red-400 animate-pulse' : 'text-neutral-400'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{elapsed}m cooking</span>
                        </div>
                      </div>
                    </div>

                    {/* Partial Preparation Checklist */}
                    <div className="space-y-2 py-1">
                      <div className="text-[10px] uppercase font-bold text-neutral-400">
                        Item Readiness Checklist:
                      </div>
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            const nextStatus = it.status === 'ready' ? 'preparing' : 'ready';
                            updateOrderItemStatus(order.id, idx, nextStatus);
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                            it.status === 'ready'
                              ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
                              : 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:border-neutral-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                it.status === 'ready'
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : 'border-neutral-600 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                            <span className="text-xs font-semibold">
                              {it.quantity}x {it.name}
                            </span>
                          </div>

                          <span className="text-[10px] uppercase font-mono font-bold">
                            {it.status === 'ready' ? 'Ready' : 'In Pan'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Complete All to Ready */}
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className={`w-full py-2 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                        allItemsReady
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{allItemsReady ? 'All Dishes Ready! Notify Waiter' : 'Force Mark Entire Order Ready'}</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Column 3: Ready for Service / Collection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Ready for Server / Collection
              </h2>
            </div>
            <span className="text-xs font-mono font-bold bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
              {kitchenOrders.filter((o) => o.status === 'ready').length}
            </span>
          </div>

          <div className="space-y-3">
            {kitchenOrders
              .filter((o) => o.status === 'ready')
              .map((order) => (
                <div
                  key={order.id}
                  className="bg-neutral-800/90 rounded-xl border border-emerald-500/50 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-700">
                    <div>
                      <span className="text-sm font-extrabold font-mono text-emerald-400">
                        {order.orderNumber}
                      </span>
                      <div className="text-[11px] font-semibold text-neutral-300">
                        {order.tableNumber || (order.type === 'delivery' ? 'Delivery' : 'Takeaway')}
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Dispatched to Pass
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-neutral-300">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.quantity}x {it.name}</span>
                        <span className="text-emerald-400 font-mono text-[10px]">✓ Prepared</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => updateOrderStatus(order.id, 'served')}
                    className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Confirm Handed to Waiter / Guest
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
