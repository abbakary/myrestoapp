import React, { useState } from 'react';
import {
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  LogOut,
  MapPin,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table } from '../../types/restaurant';

export const TableManagementView: React.FC = () => {
  const {
    tables,
    orders,
    waiters,
    addTable,
    updateTableStatus,
    deleteTable,
    releaseTable,
    setActiveRole,
  } = useRestaurant();

  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);

  // Blocked table notification state
  const [blockedNotification, setBlockedNotification] = useState<{
    tableNumber: string;
    status: string;
    orderNumber?: string;
    waiterName?: string;
  } | null>(null);

  // New Table Form
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);
  const [newTableZone, setNewTableZone] = useState<'Main Dining' | 'Terrace & Patio' | 'VIP Lounge' | 'Bar Area'>('Main Dining');

  const zones = ['All', 'Main Dining', 'Terrace & Patio', 'VIP Lounge', 'Bar Area'];

  const filteredTables = tables.filter((t) => {
    const matchesZone = selectedZone === 'All' || t.zone === selectedZone;
    const matchesStatus =
      selectedStatusFilter === 'All'
        ? true
        : selectedStatusFilter === 'available'
        ? t.status === 'available'
        : t.status !== 'available';
    return matchesZone && matchesStatus;
  });

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const billingCount = tables.filter((t) => t.status === 'billing').length;
  const occupancyRate = Math.round(((tables.length - availableCount) / tables.length) * 100);

  const handleTableClick = (table: Table) => {
    if (table.status !== 'available') {
      // Find linked order and waiter
      const linkedOrder = orders.find(
        (o) => o.tableNumber?.toLowerCase() === table.number.toLowerCase() && o.status !== 'completed'
      );
      const waiter = waiters.find((w) => w.id === table.assignedWaiterId);

      setBlockedNotification({
        tableNumber: table.number,
        status: table.status,
        orderNumber: linkedOrder?.orderNumber || '#F0027',
        waiterName: waiter?.name || 'Assigned Staff',
      });
    } else {
      setBlockedNotification(null);
    }
  };

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;

    addTable({
      number: newTableNumber.startsWith('Table') ? newTableNumber : `Table ${newTableNumber}`,
      capacity: Number(newTableCapacity),
      zone: newTableZone,
      status: 'available',
    });

    setNewTableNumber('');
    setIsCreateTableModalOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-100/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-neutral-900 tracking-tight">
              Table & Floor Seating Management
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
              {availableCount} Available / {tables.length} Total
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time status tracking with strict selection enforcement for in-use tables
          </p>
        </div>

        <button
          onClick={() => setIsCreateTableModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Table</span>
        </button>
      </div>

      {/* Prominent In-Use Warning Banner (When user clicks an occupied/billing table) */}
      {blockedNotification && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-md animate-in slide-in-from-top-2 duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-wide text-amber-900">
                  {blockedNotification.tableNumber} is Currently In Use ({blockedNotification.status.toUpperCase()})
                </span>
                <span className="text-[10px] font-mono bg-amber-200/80 px-2 py-0.5 rounded font-bold">
                  Order {blockedNotification.orderNumber}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                This table cannot be assigned to new guests until the current dining session is settled and released.
                Assigned Attendant: <strong>{blockedNotification.waiterName}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => {
                const tbl = tables.find((t) => t.number === blockedNotification.tableNumber);
                if (tbl) releaseTable(tbl.id);
                setBlockedNotification(null);
              }}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
            >
              Force Release Table
            </button>
            <button
              onClick={() => setBlockedNotification(null)}
              className="p-2 text-amber-700 hover:text-amber-900 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Seating KPIs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Total Dining Capacity
          </span>
          <div className="text-xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
            {tables.reduce((sum, t) => sum + t.capacity, 0)} Seats
          </div>
          <span className="text-[10px] text-neutral-400">{tables.length} physical tables</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Available for Guests
          </span>
          <div className="text-xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
            {availableCount} Tables
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Ready to seat walk-ins</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Occupied / In Use
          </span>
          <div className="text-xl font-extrabold font-mono text-amber-600 mt-1 tabular-nums">
            {occupiedCount + billingCount} Tables
          </div>
          <span className="text-[10px] text-neutral-400">Actively dining or billing</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Floor Occupancy
          </span>
          <div className="text-xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
            {occupancyRate}%
          </div>
          <span className="text-[10px] text-neutral-400">Current table turnover</span>
        </div>
      </div>

      {/* Zone & Status Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Zone Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setSelectedZone(z)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
                selectedZone === z
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              {z}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Filter Status:</span>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-neutral-200 rounded-xl px-3 py-1.5"
          >
            <option value="All">All Tables</option>
            <option value="available">Available Only</option>
            <option value="occupied">In Use / Occupied</option>
          </select>
        </div>
      </div>

      {/* Floor Plan Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {filteredTables.map((table) => {
          const isAvailable = table.status === 'available';
          const isOccupied = table.status === 'occupied';
          const isBilling = table.status === 'billing';
          const isReserved = table.status === 'reserved';

          let statusBg = 'bg-emerald-50/80 border-emerald-300 text-emerald-950';
          let badgeColor = 'bg-emerald-500 text-white';
          if (isOccupied) {
            statusBg = 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs';
            badgeColor = 'bg-amber-500 text-white';
          } else if (isBilling) {
            statusBg = 'bg-blue-50/90 border-blue-300 text-blue-950 shadow-xs';
            badgeColor = 'bg-blue-600 text-white';
          } else if (isReserved) {
            statusBg = 'bg-purple-50/90 border-purple-300 text-purple-950';
            badgeColor = 'bg-purple-600 text-white';
          }

          const waiter = waiters.find((w) => w.id === table.assignedWaiterId);

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between h-40 ${statusBg} ${
                !isAvailable ? 'hover:ring-2 hover:ring-amber-400' : 'hover:border-emerald-500 hover:shadow-md'
              }`}
            >
              {/* Top row: Table Number + Capacity */}
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm tracking-tight">{table.number}</span>
                <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded-full">
                  {table.capacity} Seats
                </span>
              </div>

              {/* Middle row: Zone and Assigned Staff */}
              <div className="space-y-0.5 py-1">
                <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="truncate">{table.zone || 'Main Dining'}</span>
                </div>
                {waiter && (
                  <div className="text-[10px] font-medium text-neutral-700 truncate">
                    Staff: {waiter.name.split(' ')[0]}
                  </div>
                )}
              </div>

              {/* Bottom row: Status Badge & In-Use Warning lock */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
                <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeColor}`}>
                  {table.status}
                </span>

                {!isAvailable && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded" title="Locked - Table in use">
                    In Use 🔒
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE TABLE MODAL */}
      {isCreateTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateTable}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-neutral-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-neutral-900">Add Dining Table</h3>
              <button
                type="button"
                onClick={() => setIsCreateTableModalOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Table Number / Label:</label>
              <input
                type="text"
                required
                placeholder="e.g. Table 13 or VIP Booth 02"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Seating Capacity (Guests):</label>
              <input
                type="number"
                min="1"
                max="24"
                required
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Seating Zone / Area:</label>
              <select
                value={newTableZone}
                onChange={(e) => setNewTableZone(e.target.value as any)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
              >
                <option value="Main Dining">Main Dining Room</option>
                <option value="Terrace & Patio">Terrace & Patio</option>
                <option value="VIP Lounge">VIP Lounge</option>
                <option value="Bar Area">Bar Area</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateTableModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors shadow-xs"
              >
                Create Table
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
