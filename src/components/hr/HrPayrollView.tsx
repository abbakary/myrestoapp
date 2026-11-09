import React, { useState } from 'react';
import {
  Users,
  Award,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Receipt,
  Check,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Employee } from '../../types/restaurant';

export const HrPayrollView: React.FC = () => {
  const {
    employees,
    waiters,
    calculateWaiterStats,
    formatMoney,
    addAdvanceRequest,
    approveAdvance,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'payroll' | 'commissions' | 'advances'>('payroll');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(employees[1].id); // John Mwamba
  const [advanceAmount, setAdvanceAmount] = useState(50000);
  const [advanceReason, setAdvanceReason] = useState('Urgent family domestic medical expense');
  const [commissionApproved, setCommissionApproved] = useState(false);

  const handleCreateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    addAdvanceRequest(selectedEmpId, Number(advanceAmount), advanceReason);
    setIsAdvanceModalOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-neutral-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900">Staff HR, Advances & Waiter Commissions</h1>
            <p className="text-xs text-neutral-500">
              Integrated payroll engine with automatic commission transfer and advance deductions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdvanceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Salary Advance</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'payroll'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Consolidated Payroll Summary
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'commissions'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Waiter Commission Audit & Settlement
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'advances'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          Advances Ledger
        </button>
      </div>

      {/* Tab 1: Consolidated Payroll Summary */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">November 2026 Payroll Run</h3>
              <p className="text-xs text-neutral-500">Basic salary + eligible sales commission minus advances</p>
            </div>
            <button
              onClick={() => alert('Payroll run exported to Excel & TRA tax formats.')}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100"
            >
              Export TRA Tax Format
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Position & Branch</th>
                  <th className="py-2.5 px-3">Basic Salary</th>
                  <th className="py-2.5 px-3">Sales Commission</th>
                  <th className="py-2.5 px-3">Salary Advances</th>
                  <th className="py-2.5 px-3 text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {employees.map((emp) => {
                  const waiterMatch = waiters.find((w) => w.name === emp.name);
                  const commission = waiterMatch
                    ? calculateWaiterStats(waiterMatch.id).earnedCommission
                    : 0;

                  const totalAdvances = emp.advances
                    .filter((a) => a.approved)
                    .reduce((sum, a) => sum + a.amount, 0);

                  const grossEarnings = emp.baseSalary + commission;
                  const netPayable = Math.max(0, grossEarnings - totalAdvances);

                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50/50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-900">{emp.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{emp.employeeNumber}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-neutral-800">{emp.position}</div>
                        <div className="text-[10px] text-neutral-400">{emp.branch}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-neutral-800">
                        {formatMoney(emp.baseSalary)}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                        {commission > 0 ? `+${formatMoney(commission)}` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-red-600 font-semibold">
                        {totalAdvances > 0 ? `-${formatMoney(totalAdvances)}` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-neutral-900 text-sm">
                        {formatMoney(netPayable)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Waiter Commission Audit & Settlement */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Waiter Sales Attribution & 5% Net Rule</h3>
              <p className="text-xs text-neutral-500">
                Calculated strictly from completed and sufficiently paid customer orders
              </p>
            </div>

            <button
              onClick={() => setCommissionApproved(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs ${
                commissionApproved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              {commissionApproved ? <Check className="w-4 h-4" /> : <Award className="w-4 h-4" />}
              <span>{commissionApproved ? 'Period Approved by Manager' : 'Approve Commission Period'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {waiters.map((waiter) => {
              const stats = calculateWaiterStats(waiter.id);
              return (
                <div key={waiter.id} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900">{waiter.name}</h4>
                      <span className="text-[10px] font-mono text-neutral-400">{waiter.referralCode}</span>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                      5% Commission
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Total Attributed Sales:</span>
                      <span className="font-mono font-semibold">{formatMoney(stats.todaySales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Completed Orders:</span>
                      <span className="font-mono">{stats.completedOrdersCount} orders</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-neutral-200">
                      <span className="text-neutral-700 font-semibold">Earned Commission:</span>
                      <span className="font-mono font-bold text-emerald-700">{formatMoney(stats.earnedCommission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Previously Settled:</span>
                      <span className="font-mono text-neutral-500">-{formatMoney(stats.paidCommission)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-neutral-200 font-bold text-neutral-900">
                      <span>Net Outstanding:</span>
                      <span className="font-mono text-blue-700">{formatMoney(stats.pendingCommission)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Advances Ledger */}
      {activeTab === 'advances' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900">Recorded Salary Advances (Ledger)</h3>
          <p className="text-xs text-neutral-500">
            Advances are kept separate from operating expenses to prevent double-counting in P&L profitability
          </p>

          <div className="space-y-2">
            {employees.flatMap((emp) =>
              emp.advances.map((adv) => (
                <div
                  key={adv.id}
                  className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-neutral-900">{emp.name}</span>
                    <span className="text-neutral-400 ml-2">({emp.position})</span>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Reason: {adv.reason} · Date: {adv.date}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-red-600 text-sm">
                      -{formatMoney(adv.amount)}
                    </span>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                      ✓ Approved & Queued for Payroll
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Record Advance Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateAdvance}
            className="bg-white rounded-2xl p-6 max-w-sm w-full border border-neutral-200 shadow-xl space-y-4"
          >
            <h3 className="font-bold text-sm text-neutral-900">Approve Employee Salary Advance</h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Select Employee:</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full p-2 text-xs border border-neutral-200 rounded-lg"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Advance Amount (TZS):</label>
              <input
                type="number"
                required
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="w-full p-2 text-xs border border-neutral-200 rounded-lg font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-600">Reason / Justification:</label>
              <textarea
                required
                rows={2}
                value={advanceReason}
                onChange={(e) => setAdvanceReason(e.target.value)}
                className="w-full p-2 text-xs border border-neutral-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
              >
                Approve & Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
