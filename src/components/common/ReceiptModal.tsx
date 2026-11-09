import React, { useRef } from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { Order } from '../../types/restaurant';
import { useRestaurant } from '../../context/RestaurantContext';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, isOpen, onClose }) => {
  const { currentTenant, formatMoney, waiters } = useRestaurant();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const servingWaiter = waiters.find((w) => w.id === order.servingWaiterId);
  const referralWaiter = waiters.find((w) => w.id === order.referralWaiterId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Official Tax Receipt
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-neutral-800 bg-neutral-50/30">
          <div
            ref={printRef}
            className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs flex flex-col"
          >
            {/* Store Header */}
            <div className="text-center pb-4 border-b border-dashed border-neutral-300">
              <h2 className="font-bold text-sm text-neutral-900">{currentTenant.name}</h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">{currentTenant.address}</p>
              <p className="text-[11px] text-neutral-500">Tel: {currentTenant.phone}</p>
              <p className="text-[10px] text-neutral-400 mt-1">TIN: 139-408-221 · VRN: 40019283-Z</p>
            </div>

            {/* Order Meta */}
            <div className="py-3 border-b border-dashed border-neutral-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-500">Receipt Ref:</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date & Time:</span>
                <span>{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Service Mode:</span>
                <span className="capitalize font-semibold">{order.type.replace('_', ' ')}</span>
              </div>
              {order.tableNumber && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Seating:</span>
                  <span className="font-bold text-neutral-900">{order.tableNumber}</span>
                </div>
              )}
              {servingWaiter && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Attendant:</span>
                  <span>{servingWaiter.name}</span>
                </div>
              )}
              {referralWaiter && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Waiter Ref:</span>
                  <span className="font-semibold text-emerald-700">{referralWaiter.referralCode}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-3 border-b border-dashed border-neutral-300 space-y-2">
              {order.items.map((it, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="flex justify-between font-semibold">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span className="tabular-nums">{formatMoney(it.price * it.quantity)}</span>
                  </div>
                  {it.portion && (
                    <div className="text-[10px] text-neutral-500 pl-4">Size: {it.portion}</div>
                  )}
                  {it.selectedModifiers.map((mod) => (
                    <div key={mod.id} className="text-[10px] text-neutral-500 pl-4 flex justify-between">
                      <span>+ {mod.name}</span>
                      <span className="tabular-nums">+{formatMoney(mod.price * it.quantity)}</span>
                    </div>
                  ))}
                  {it.customerNotes && (
                    <div className="text-[10px] text-amber-700 italic pl-4">Note: {it.customerNotes}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-3 border-b border-dashed border-neutral-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-neutral-600">
                <span>Gross Subtotal:</span>
                <span className="tabular-nums">{formatMoney(order.subtotal)}</span>
              </div>

              {/* Discount line if present */}
              {order.discount > 0 ? (
                <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50/60 px-1.5 py-0.5 rounded">
                  <span>
                    Discount {order.discountType === 'percent' ? `(${order.discountValue}%)` : ''}
                    {order.discountReason ? ` [${order.discountReason}]` : ''}:
                  </span>
                  <span className="tabular-nums font-mono">-{formatMoney(order.discount)}</span>
                </div>
              ) : null}

              {/* Net Subtotal after discount if discount was applied */}
              {order.discount > 0 && (
                <div className="flex justify-between text-neutral-500 text-[10px]">
                  <span>Net Amount:</span>
                  <span className="tabular-nums font-mono">{formatMoney(Math.max(0, order.subtotal - order.discount))}</span>
                </div>
              )}

              {/* Tax line with exemption or zero status */}
              <div className="flex justify-between text-neutral-600">
                <span>
                  {order.isTaxExempt || order.tax === 0 ? (
                    <span className="text-amber-800 font-semibold">VAT: EXEMPT / REMOVED (0%)</span>
                  ) : (
                    <span>VAT (18% Incl.):</span>
                  )}
                </span>
                <span className="tabular-nums">
                  {order.isTaxExempt || order.tax === 0 ? '0' : formatMoney(order.tax)}
                </span>
              </div>

              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery Charge:</span>
                  <span className="tabular-nums font-mono">{formatMoney(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-200">
                <span>TOTAL PAID:</span>
                <span className="tabular-nums text-emerald-700 font-mono">{formatMoney(order.total)}</span>
              </div>
            </div>

            {/* Payment & Footer */}
            <div className="pt-3 text-center space-y-1.5 text-[10px] text-neutral-500">
              <p className="font-semibold text-neutral-700 uppercase">
                Payment: {order.paymentMethod?.toUpperCase() || 'CASH'} · STATUS: {order.paymentStatus.toUpperCase()}
              </p>
              <p>TRA Electronic Fiscal Receipt System</p>
              <p className="italic">Asante kwa kututembelea! Karibu tena.</p>
              <p className="text-[9px] text-neutral-400">Powered by RestaurantOS SaaS</p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-white border-t border-neutral-100 flex gap-2">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
