import React, { useMemo, useState } from 'react';
import {
  Users,
  Award,
  CheckCircle2,
  Plus,
  Check,
  Search,
  Ticket,
  Clock,
  Banknote,
  Smartphone,
  Printer,
  Download,
  Edit3,
  FileText,
  X,
  ShieldAlert,
  SlidersHorizontal,
  CreditCard,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  CommissionMode,
  Employee,
  Order,
  OrderType,
  PaymentMethod,
  Role,
} from '../../types/restaurant';
import { ReceiptModal } from '../common/ReceiptModal';

type HrTab = 'coupons' | 'payroll' | 'commissions' | 'advances';

export const HrPayrollView: React.FC = () => {
  const {
    currentTenant,
    activeRole,
    employees,
    waiters,
    tables,
    menuItems,
    orders,
    calculateWaiterStats,
    formatMoney,
    addAdvanceRequest,
    approveAdvance,
    rejectAdvance,
    markAdvanceRepaid,
    updateAdvance,
    addEmployee,
    updateEmployee,
    payrollPayments,
    calculateEmployeePayroll,
    recordPayrollPayment,
    processPayment,
    updateOrderStatus,
    submitOrder,
    requestApproval,
    cancelOrderControlled,
    assignOrderWaiter,
    defaultCommissionMode,
    defaultCommissionValue,
    setDefaultCommissionPolicy,
    updateOrderCommission,
    getOrderCommission,
    settleWaiterCommission,
    commissionPayouts,
    toggleWaiterActive,
    taxEnabled,
    taxRatePct,
    activeOperator,
  } = useRestaurant();

  const managerActor = activeOperator.name || 'Branch Manager';
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const availablePeriods = useMemo(() => {
    const base = Array.from(new Set([currentMonthStr, '2026-11', '2026-12', '2026-10']));
    return base;
  }, [currentMonthStr]);

  const [activeTab, setActiveTab] = useState<HrTab>('coupons');
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setActionBanner({ type, text });
    setTimeout(() => {
      setActionBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // ================= SUB-MODULE 1: RECEPTION & SERVICE COUPONS =================
  const [couponSearch, setCouponSearch] = useState('');
  const [couponFilter, setCouponFilter] = useState<'all' | 'unpaid' | 'ready' | 'active' | 'completed'>('all');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Reception Settlement Modal
  const [settleOrderTarget, setSettleOrderTarget] = useState<Order | null>(null);
  const [settleMethod, setSettleMethod] = useState<Exclude<PaymentMethod, 'split'>>('cash');
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleRef, setSettleRef] = useState<string>('');
  const [settleCompleteService, setSettleCompleteService] = useState<boolean>(true);

  // Reception Cancel / Void inline confirmation
  const [cancelCouponId, setCancelCouponId] = useState<string | null>(null);
  const [cancelCouponReason, setCancelCouponReason] = useState<string>('');

  // Reception Quick Walk-In Order Modal
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState<boolean>(false);
  const [walkInType, setWalkInType] = useState<OrderType>('dine_in');
  const [walkInTable, setWalkInTable] = useState<string>(tables[0]?.number || 'Table 01');
  const [walkInGuest, setWalkInGuest] = useState<string>('Walk-in Guest');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInWaiterId, setWalkInWaiterId] = useState<string>(waiters[0]?.id || '');
  const [walkInMenuItemId, setWalkInMenuItemId] = useState<string>(menuItems[0]?.id || '');
  const [walkInQty, setWalkInQty] = useState<number>(1);
  const [walkInNote, setWalkInNote] = useState<string>('');

  const filteredReceptionOrders = useMemo(() => {
    const q = couponSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (couponFilter === 'unpaid' && (o.paymentStatus === 'paid' || o.status === 'cancelled')) return false;
      if (couponFilter === 'ready' && o.status !== 'ready') return false;
      if (couponFilter === 'active' && (o.status === 'completed' || o.status === 'cancelled')) return false;
      if (couponFilter === 'completed' && o.status !== 'completed') return false;
      if (!q) return true;
      const coupon = (o.serviceCouponCode || `SV-${o.orderNumber.replace('#', '')}`).toLowerCase();
      return (
        coupon.includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.tableNumber || '').toLowerCase().includes(q)
      );
    });
  }, [orders, couponSearch, couponFilter]);

  const receptionSummary = useMemo(() => {
    const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
    const unpaidBalance = nonCancelled.reduce(
      (s, o) => s + Math.max(0, o.total - (o.paidAmount || 0)),
      0
    );
    const unpaidCount = nonCancelled.filter((o) => o.paymentStatus !== 'paid').length;
    const readyCount = nonCancelled.filter((o) => o.status === 'ready').length;
    const settledTotal = nonCancelled
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.total, 0);
    return { unpaidBalance, unpaidCount, readyCount, settledTotal };
  }, [orders]);

  const openSettleModal = (order: Order) => {
    const balance = Math.max(0, order.total - (order.paidAmount || 0));
    setSettleOrderTarget(order);
    setSettleAmount(balance);
    setSettleMethod('cash');
    setSettleRef('');
    setSettleCompleteService(true);
  };

  const handleConfirmReceptionSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleOrderTarget) return;
    const balance = Math.max(0, settleOrderTarget.total - (settleOrderTarget.paidAmount || 0));
    const amt = Math.min(balance, Math.max(1, Math.round(settleAmount)));
    processPayment(settleOrderTarget.id, settleMethod, amt, {
      collectedBy: 'Reception Desk',
      transactionRef: settleRef.trim() || undefined,
      completeService: settleCompleteService,
    });
    showBanner(
      'success',
      `Settled ${formatMoney(amt)} via ${settleMethod.toUpperCase()} for ${
        settleOrderTarget.serviceCouponCode || settleOrderTarget.orderNumber
      }.`
    );
    setSettleOrderTarget(null);
  };

  const handleCreateWalkInCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const item = menuItems.find((m) => m.id === walkInMenuItemId) || menuItems[0];
    if (!item) return;
    const qty = Math.max(1, Math.round(walkInQty));
    const subtotal = item.price * qty;
    const tax = taxEnabled ? Math.round(subtotal * (taxRatePct / 100)) : 0;

    const created = submitOrder({
      type: walkInType,
      tableNumber: walkInType === 'dine_in' ? walkInTable : undefined,
      customerName: walkInGuest.trim() || 'Walk-in Guest',
      customerPhone: walkInPhone.trim() || undefined,
      servingWaiterId: walkInWaiterId || undefined,
      notes: walkInNote.trim() || 'Created at Reception Desk',
      tax,
      taxRate: taxEnabled ? taxRatePct / 100 : 0,
      isTaxExempt: !taxEnabled,
      actorName: 'Reception Desk',
      actorRole: 'reception',
      customItems: [
        {
          menuItem: item,
          quantity: qty,
          selectedModifiers: [],
          customerNotes: walkInNote.trim() || undefined,
        },
      ],
    });

    setIsWalkInModalOpen(false);
    setWalkInGuest('Walk-in Guest');
    setWalkInPhone('');
    setWalkInQty(1);
    setWalkInNote('');
    showBanner(
      'success',
      `Issued Coupon ${created.serviceCouponCode} (${created.orderNumber}) & dispatched to Kitchen.`
    );
  };

  // ================= SUB-MODULE 2: CONSOLIDATED PAYROLL SUMMARY =================
  const [payrollPeriod, setPayrollPeriod] = useState<string>('2026-11');
  const [payrollSearch, setPayrollSearch] = useState<string>('');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<'all' | 'active' | 'paid' | 'unpaid'>('all');

  // Add / Edit Employee Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState<string>('');
  const [empPhone, setEmpPhone] = useState<string>('+255 7');
  const [empEmail, setEmpEmail] = useState<string>('');
  const [empRole, setEmpRole] = useState<Role>('waiter');
  const [empPosition, setEmpPosition] = useState<string>('Floor Waiter');
  const [empBranch, setEmpBranch] = useState<string>(currentTenant.name);
  const [empSalaryType, setEmpSalaryType] = useState<'monthly' | 'daily' | 'hourly'>('monthly');
  const [empBaseSalary, setEmpBaseSalary] = useState<number>(350000);
  const [empAllowances, setEmpAllowances] = useState<number>(0);
  const [empPayMethod, setEmpPayMethod] = useState<'bank_transfer' | 'mpesa' | 'cash'>('bank_transfer');
  const [empBankAcct, setEmpBankAcct] = useState<string>('');
  const [empTin, setEmpTin] = useState<string>('');
  const [empNssf, setEmpNssf] = useState<string>('');
  const [empStatus, setEmpStatus] = useState<'active' | 'on_leave' | 'inactive'>('active');

  // Payroll Disbursement Modal
  const [isPayrollRunOpen, setIsPayrollRunOpen] = useState<boolean>(false);
  const [runEmployeeIds, setRunEmployeeIds] = useState<string[]>([]);
  const [runMethod, setRunMethod] = useState<'bank_transfer' | 'mpesa' | 'cash'>('bank_transfer');
  const [runRefPrefix, setRunRefPrefix] = useState<string>('SAL');

  // Itemized Payslip Modal
  const [payslipEmployee, setPayslipEmployee] = useState<Employee | null>(null);

  const openAddEmployeeModal = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpPhone('+255 7');
    setEmpEmail('');
    setEmpRole('waiter');
    setEmpPosition('Floor Waiter');
    setEmpBranch(currentTenant.name);
    setEmpSalaryType('monthly');
    setEmpBaseSalary(350000);
    setEmpAllowances(0);
    setEmpPayMethod('bank_transfer');
    setEmpBankAcct('');
    setEmpTin('');
    setEmpNssf('');
    setEmpStatus('active');
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpPhone(emp.phone);
    setEmpEmail(emp.email || '');
    setEmpRole(emp.role);
    setEmpPosition(emp.position);
    setEmpBranch(emp.branch);
    setEmpSalaryType(emp.salaryType);
    setEmpBaseSalary(emp.baseSalary);
    setEmpAllowances(emp.allowances || 0);
    setEmpPayMethod(emp.paymentMethod || 'bank_transfer');
    setEmpBankAcct(emp.bankAccount || '');
    setEmpTin(emp.tinNumber || '');
    setEmpNssf(emp.nssfNumber || '');
    setEmpStatus(emp.status);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: empName.trim(),
        phone: empPhone.trim(),
        email: empEmail.trim() || undefined,
        role: empRole,
        position: empPosition.trim(),
        branch: empBranch.trim(),
        salaryType: empSalaryType,
        baseSalary: Math.max(0, Math.round(empBaseSalary)),
        allowances: Math.max(0, Math.round(empAllowances)),
        paymentMethod: empPayMethod,
        bankAccount: empBankAcct.trim() || undefined,
        tinNumber: empTin.trim() || undefined,
        nssfNumber: empNssf.trim() || undefined,
        status: empStatus,
      });
      showBanner('success', `Updated staff profile & compensation for ${empName.trim()}.`);
    } else {
      const created = addEmployee({
        name: empName.trim(),
        phone: empPhone.trim(),
        email: empEmail.trim() || undefined,
        role: empRole,
        position: empPosition.trim(),
        branch: empBranch.trim() || currentTenant.name,
        salaryType: empSalaryType,
        baseSalary: Math.max(0, Math.round(empBaseSalary)),
        allowances: Math.max(0, Math.round(empAllowances)),
        paymentMethod: empPayMethod,
        bankAccount: empBankAcct.trim() || undefined,
        tinNumber: empTin.trim() || undefined,
        nssfNumber: empNssf.trim() || undefined,
        joinedDate: new Date().toISOString().split('T')[0],
        status: empStatus,
      });
      showBanner('success', `Onboarded ${created.name} (${created.employeeNumber}).`);
    }
    setIsEmployeeModalOpen(false);
  };

  const payrollRows = useMemo(() => {
    const q = payrollSearch.trim().toLowerCase();
    return employees
      .map((emp) => ({
        emp,
        calc: calculateEmployeePayroll(emp.id, payrollPeriod),
      }))
      .filter(({ emp, calc }) => {
        if (payrollStatusFilter === 'active' && emp.status !== 'active') return false;
        if (payrollStatusFilter === 'paid' && !calc.isPaidForPeriod) return false;
        if (payrollStatusFilter === 'unpaid' && calc.isPaidForPeriod) return false;
        if (!q) return true;
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.employeeNumber.toLowerCase().includes(q) ||
          emp.position.toLowerCase().includes(q)
        );
      });
  }, [employees, payrollPeriod, payrollSearch, payrollStatusFilter, calculateEmployeePayroll]);

  const payrollTotals = useMemo(() => {
    return payrollRows.reduce(
      (acc, { calc }) => ({
        gross: acc.gross + calc.grossPay,
        nssf: acc.nssf + calc.nssfDeduction,
        paye: acc.paye + calc.payeTax,
        advances: acc.advances + calc.approvedAdvances,
        net: acc.net + calc.netPayable,
        unpaidCount: acc.unpaidCount + (calc.isPaidForPeriod ? 0 : 1),
      }),
      { gross: 0, nssf: 0, paye: 0, advances: 0, net: 0, unpaidCount: 0 }
    );
  }, [payrollRows]);

  const handleExportTraCsv = () => {
    const headers = [
      'Employee Number',
      'Full Name',
      'Role',
      'Position',
      'TIN',
      'NSSF Number',
      'Basic Salary (TZS)',
      'Allowances (TZS)',
      'Commission (TZS)',
      'Gross Pay (TZS)',
      'NSSF 10% (TZS)',
      'PAYE Tax (TZS)',
      'Advances Deducted (TZS)',
      'Net Payable (TZS)',
      'Status',
    ];
    const lines = payrollRows.map(({ emp, calc }) => [
      emp.employeeNumber,
      `"${emp.name.replace(/"/g, '""')}"`,
      emp.role,
      `"${emp.position.replace(/"/g, '""')}"`,
      emp.tinNumber || 'PENDING',
      emp.nssfNumber || 'PENDING',
      calc.basicSalary,
      calc.allowances,
      calc.commission,
      calc.grossPay,
      calc.nssfDeduction,
      calc.payeTax,
      calc.approvedAdvances,
      calc.netPayable,
      calc.isPaidForPeriod ? 'PAID' : 'PENDING',
    ]);
    const csv = [headers.join(','), ...lines.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRA_Payroll_${payrollPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner('success', `Exported TRA statutory payroll CSV (TRA_Payroll_${payrollPeriod}.csv).`);
  };

  const openPayrollDisbursement = (specificIds?: string[]) => {
    const unpaidActiveIds =
      specificIds ||
      payrollRows
        .filter(({ emp, calc }) => !calc.isPaidForPeriod && emp.status === 'active')
        .map(({ emp }) => emp.id);
    if (unpaidActiveIds.length === 0) {
      showBanner('error', `All active staff for ${payrollPeriod} are already settled.`);
      return;
    }
    setRunEmployeeIds(unpaidActiveIds);
    setRunMethod('bank_transfer');
    setRunRefPrefix('SAL');
    setIsPayrollRunOpen(true);
  };

  const handleConfirmPayrollRun = (e: React.FormEvent) => {
    e.preventDefault();
    const created = recordPayrollPayment({
      period: payrollPeriod,
      employeeIds: runEmployeeIds,
      method: runMethod,
      referencePrefix: runRefPrefix.trim() || 'SAL',
      paidBy: managerActor,
    });
    setIsPayrollRunOpen(false);
    if (created.length > 0) {
      const total = created.reduce((s, r) => s + r.netPaid, 0);
      showBanner(
        'success',
        `Disbursed ${created.length} payslip(s) totaling ${formatMoney(total)}. Approved advances marked deducted.`
      );
    }
  };

  // ================= SUB-MODULE 3: WAITER COMMISSION AUDIT & SETTLEMENT =================
  const [commissionApproved, setCommissionApproved] = useState(false);
  const [policyModeDraft, setPolicyModeDraft] = useState<CommissionMode>(defaultCommissionMode);
  const [policyValDraft, setPolicyValDraft] = useState<number>(defaultCommissionValue);

  // Per-waiter Audit Orders Modal
  const [auditWaiterId, setAuditWaiterId] = useState<string | null>(null);
  const [editingCommOrderId, setEditingCommOrderId] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<CommissionMode>('percent');
  const [overrideValue, setOverrideValue] = useState<number>(5);

  // Settle Commission Payout Modal
  const [payoutWaiterId, setPayoutWaiterId] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'cash' | 'mpesa' | 'bank_transfer'>('mpesa');
  const [payoutRef, setPayoutRef] = useState<string>('');

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setDefaultCommissionPolicy(policyModeDraft, policyValDraft);
    showBanner(
      'success',
      policyModeDraft === 'percent'
        ? `Updated global commission policy to ${policyValDraft}% of paid net sales.`
        : `Updated global commission policy to ${formatMoney(policyValDraft)} fixed per paid order.`
    );
  };

  const openCommissionPayoutModal = (waiterId: string) => {
    const stats = calculateWaiterStats(waiterId);
    setPayoutWaiterId(waiterId);
    setPayoutAmount(stats.pendingCommission);
    setPayoutMethod('mpesa');
    setPayoutRef(`COM-${Date.now().toString().slice(-4)}`);
  };

  const handleConfirmCommissionPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutWaiterId) return;
    const waiter = waiters.find((w) => w.id === payoutWaiterId);
    settleWaiterCommission(payoutWaiterId, payoutAmount, {
      method: payoutMethod,
      reference: payoutRef.trim() || undefined,
      settledBy: managerActor,
    });
    showBanner(
      'success',
      `Settled ${formatMoney(payoutAmount)} commission to ${waiter?.name || 'Waiter'} via ${payoutMethod.toUpperCase()}.`
    );
    setPayoutWaiterId(null);
  };

  // ================= SUB-MODULE 4: ADVANCES LEDGER & APPROVALS =================
  const [advanceFilter, setAdvanceFilter] = useState<'all' | 'pending' | 'approved' | 'deducted' | 'repaid' | 'rejected'>('all');
  const [advanceSearch, setAdvanceSearch] = useState<string>('');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState<boolean>(false);
  const [editingAdvanceRef, setEditingAdvanceRef] = useState<{ employeeId: string; advanceId: string } | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[1]?.id || employees[0]?.id || '');
  const [advanceAmount, setAdvanceAmount] = useState<number>(50000);
  const [advanceReason, setAdvanceReason] = useState<string>('');
  const [advanceRepaymentMonth, setAdvanceRepaymentMonth] = useState<string>('2026-11');
  const [advanceAutoApprove, setAdvanceAutoApprove] = useState<boolean>(false);
  const [rejectingAdvanceKey, setRejectingAdvanceKey] = useState<string | null>(null);
  const [rejectAdvanceNote, setRejectAdvanceNote] = useState<string>('');

  const allAdvances = useMemo(() => {
    return employees.flatMap((emp) =>
      emp.advances.map((adv) => {
        const status = adv.status || (adv.approved ? 'approved' : 'pending');
        return { emp, adv, status };
      })
    );
  }, [employees]);

  const advanceSummary = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let clearedAmount = 0;
    allAdvances.forEach(({ adv, status }) => {
      if (status === 'pending') {
        pendingCount += 1;
        pendingAmount += adv.amount;
      } else if (status === 'approved') {
        approvedAmount += adv.amount;
      } else if (status === 'deducted' || status === 'repaid') {
        clearedAmount += adv.amount;
      }
    });
    return { pendingCount, pendingAmount, approvedAmount, clearedAmount };
  }, [allAdvances]);

  const filteredAdvances = useMemo(() => {
    const q = advanceSearch.trim().toLowerCase();
    return allAdvances.filter(({ emp, adv, status }) => {
      if (advanceFilter !== 'all' && status !== advanceFilter) return false;
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNumber.toLowerCase().includes(q) ||
        adv.reason.toLowerCase().includes(q)
      );
    });
  }, [allAdvances, advanceFilter, advanceSearch]);

  const openNewAdvanceModal = () => {
    setEditingAdvanceRef(null);
    setSelectedEmpId(employees[1]?.id || employees[0]?.id || '');
    setAdvanceAmount(50000);
    setAdvanceReason('');
    setAdvanceRepaymentMonth(payrollPeriod);
    setAdvanceAutoApprove(activeRole === 'owner' || activeRole === 'manager');
    setIsAdvanceModalOpen(true);
  };

  const openEditAdvanceModal = (empId: string, advId: string, amount: number, reason: string) => {
    setEditingAdvanceRef({ employeeId: empId, advanceId: advId });
    setSelectedEmpId(empId);
    setAdvanceAmount(amount);
    setAdvanceReason(reason);
    setIsAdvanceModalOpen(true);
  };

  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (advanceAmount <= 0 || !advanceReason.trim()) return;
    if (editingAdvanceRef) {
      updateAdvance(
        editingAdvanceRef.employeeId,
        editingAdvanceRef.advanceId,
        Number(advanceAmount),
        advanceReason
      );
      showBanner('success', `Updated advance record to ${formatMoney(Number(advanceAmount))}.`);
    } else {
      addAdvanceRequest(selectedEmpId, Number(advanceAmount), advanceReason, {
        autoApprove: advanceAutoApprove,
        repaymentMonth: advanceRepaymentMonth,
        approvedBy: advanceAutoApprove ? managerActor : undefined,
      });
      const emp = employees.find((e2) => e2.id === selectedEmpId);
      showBanner(
        'success',
        advanceAutoApprove
          ? `Approved ${formatMoney(Number(advanceAmount))} salary advance for ${emp?.name}.`
          : `Submitted ${formatMoney(Number(advanceAmount))} advance request for ${emp?.name} (Pending approval).`
      );
    }
    setIsAdvanceModalOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-neutral-100 p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Top Operational Header */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-neutral-900 tracking-tight">
              Reception Desk, Staff &amp; Payroll Operations
            </h1>
            <p className="text-xs text-neutral-500">
              Service coupon settlement · Consolidated statutory payroll · Waiter commission audits · Staff advances
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('coupons');
              setIsWalkInModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>New Walk-In Coupon</span>
          </button>

          <button
            type="button"
            onClick={openAddEmployeeModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff</span>
          </button>

          <button
            type="button"
            onClick={openNewAdvanceModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Advance</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {actionBanner && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            actionBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{actionBanner.text}</span>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-neutral-500 hover:text-neutral-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-module Tabs */}
      <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('coupons')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'coupons'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-200/70'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Reception · Service Coupons ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'payroll'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-200/70'
          }`}
        >
          Consolidated Payroll Summary ({employees.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('commissions')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'commissions'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-200/70'
          }`}
        >
          Waiter Commission Audit &amp; Settlement
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advances')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'advances'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-200/70'
          }`}
        >
          Advances ({allAdvances.length})
        </button>
      </div>

      {/* ================= TAB 1: RECEPTION · SERVICE COUPONS ================= */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          {/* Reception KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <div className="text-[11px] font-medium text-neutral-500">Open Unpaid Coupons</div>
              <div className="text-lg font-extrabold font-mono text-rose-700 mt-0.5 tabular-nums">
                {receptionSummary.unpaidCount} · {formatMoney(receptionSummary.unpaidBalance)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <div className="text-[11px] font-medium text-neutral-500">Ready on Kitchen Pass</div>
              <div className="text-lg font-extrabold font-mono text-blue-700 mt-0.5 tabular-nums">
                {receptionSummary.readyCount} tickets
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <div className="text-[11px] font-medium text-neutral-500">Settled &amp; Paid Today</div>
              <div className="text-lg font-extrabold font-mono text-emerald-700 mt-0.5 tabular-nums">
                {formatMoney(receptionSummary.settledTotal)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-neutral-200 flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-medium text-neutral-500">Front Desk Walk-In</div>
                <div className="text-xs font-bold text-neutral-900 mt-0.5">Issue Service Coupon</div>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Issue
              </button>
            </div>
          </div>

          {/* Reception Coupons Container */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  Front Desk Service Coupon Verification &amp; Settlement
                </h2>
                <p className="text-xs text-neutral-500">
                  Match a coupon code (e.g. SV-4827), verify waiter attribution, settle full or partial tenders, print receipts, or release service
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={couponSearch}
                    onChange={(e) => setCouponSearch(e.target.value)}
                    placeholder="Coupon code, order #, table..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-[11px] font-bold">
                  {(['all', 'unpaid', 'ready', 'active', 'completed'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCouponFilter(f)}
                      className={`px-2.5 py-1 rounded-md capitalize transition-colors whitespace-nowrap cursor-pointer ${
                        couponFilter === f
                          ? 'bg-white text-neutral-900 shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredReceptionOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-xl space-y-2">
                <div>No service coupons matched "{couponSearch || couponFilter}".</div>
                <button
                  type="button"
                  onClick={() => {
                    setCouponSearch('');
                    setCouponFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredReceptionOrders.map((order) => {
                  const couponCode =
                    order.serviceCouponCode || `SV-${order.orderNumber.replace('#', '')}`;
                  const balanceDue = Math.max(0, order.total - (order.paidAmount || 0));
                  const isPaid = order.paymentStatus === 'paid';
                  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';
                  const attributedWaiterId = order.servingWaiterId || order.referralWaiterId || '';

                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        {/* Header row: Coupon Code & Unboxed Status */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                          <div className="inline-flex items-center gap-1.5 font-mono font-extrabold text-xs text-neutral-900 tracking-wider">
                            <Ticket className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{couponCode}</span>
                            <span className="text-neutral-300">·</span>
                            <span className="text-neutral-600 font-semibold">{order.orderNumber}</span>
                          </div>

                          <span
                            className={`text-[11px] font-bold uppercase ${
                              order.status === 'completed'
                                ? 'text-emerald-700'
                                : order.status === 'ready'
                                ? 'text-blue-700'
                                : isCancelled
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Guest, Table & Waiter Assignment */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 truncate">
                              {order.customerName || 'Walk-in Guest'}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              <span className="capitalize">{order.type.replace('_', ' ')}</span>
                              {order.tableNumber ? ` · ${order.tableNumber}` : ''}
                              {' · '}
                              <span className="font-mono">
                                {new Date(order.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          <select
                            value={attributedWaiterId}
                            onChange={(e) => {
                              assignOrderWaiter(order.id, e.target.value);
                              const wName = waiters.find((w) => w.id === e.target.value)?.name || 'Unassigned';
                              showBanner('success', `Assigned ${couponCode} to ${wName}.`);
                            }}
                            aria-label="Assign serving waiter"
                            className="text-[11px] font-semibold bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-neutral-700 max-w-[130px] cursor-pointer"
                          >
                            <option value="">No Waiter</option>
                            {waiters.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Line items */}
                        <div className="py-2 border-y border-neutral-100 space-y-1 text-[11px]">
                          {order.items.map((item, idx) => (
                            <div key={`${item.menuItemId}-${idx}`} className="flex justify-between text-neutral-700">
                              <span className="truncate pr-2">
                                {item.quantity}× {item.name}
                                {item.portion ? ` (${item.portion})` : ''}
                              </span>
                              <span className="font-mono tabular-nums shrink-0">
                                {formatMoney(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          {order.discount > 0 && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Discount</span>
                              <span className="font-mono tabular-nums">-{formatMoney(order.discount)}</span>
                            </div>
                          )}
                          {order.tax > 0 && (
                            <div className="flex justify-between text-neutral-500">
                              <span>VAT ({Math.round((order.taxRate || 0.18) * 100)}%)</span>
                              <span className="font-mono tabular-nums">{formatMoney(order.tax)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-neutral-900 pt-1">
                            <span>Total / Balance Due</span>
                            <span className="font-mono tabular-nums">
                              {formatMoney(order.total)}
                              {!isPaid && balanceDue < order.total ? ` (Bal ${formatMoney(balanceDue)})` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Inline Cancel / Approval Box */}
                        {cancelCouponId === order.id && (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                            <input
                              type="text"
                              value={cancelCouponReason}
                              onChange={(e) => setCancelCouponReason(e.target.value)}
                              placeholder="Reason for cancellation / void..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg outline-hidden"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelCouponId(null);
                                  setCancelCouponReason('');
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-neutral-600 cursor-pointer"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                disabled={!cancelCouponReason.trim()}
                                onClick={() => {
                                  if (activeRole === 'owner' || activeRole === 'manager') {
                                    cancelOrderControlled(
                                      order.id,
                                      cancelCouponReason.trim(),
                                      'Reception Manager',
                                      'Manager Override'
                                    );
                                    showBanner('success', `Cancelled ${couponCode} and restored stock.`);
                                  } else {
                                    requestApproval({
                                      orderId: order.id,
                                      actionType: 'cancel_order',
                                      requestedBy: 'Reception Desk',
                                      requestedRole: 'reception',
                                      details: `Cancel ${couponCode} (${formatMoney(order.total)})`,
                                      amountImpact: order.total,
                                      reason: cancelCouponReason.trim(),
                                    });
                                    showBanner('success', `Sent cancellation approval for ${couponCode} to Manager.`);
                                  }
                                  setCancelCouponId(null);
                                  setCancelCouponReason('');
                                }}
                                className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg disabled:opacity-40 cursor-pointer"
                              >
                                Confirm Void
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`font-bold ${
                              isPaid
                                ? 'text-emerald-700'
                                : order.paymentStatus === 'partial'
                                ? 'text-blue-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {isPaid
                              ? `PAID · ${(order.paymentMethod || 'cash').toUpperCase()}`
                              : order.paymentStatus === 'partial'
                              ? `PARTIAL · Bal ${formatMoney(balanceDue)}`
                              : `UNPAID · ${formatMoney(balanceDue)}`}
                          </span>

                          <button
                            type="button"
                            onClick={() => setReceiptOrder(order)}
                            className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </div>

                        <div className="flex items-center flex-wrap gap-1.5">
                          {!isPaid && !isCancelled && balanceDue > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  processPayment(order.id, 'cash', balanceDue, {
                                    collectedBy: 'Reception Desk',
                                  });
                                  showBanner('success', `Settled ${couponCode} (${formatMoney(balanceDue)}) via Cash.`);
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                              >
                                <Banknote className="w-3 h-3" />
                                <span>Cash</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  processPayment(order.id, 'mpesa', balanceDue, {
                                    collectedBy: 'Reception Desk',
                                    transactionRef: `MP-${Date.now().toString().slice(-5)}`,
                                  });
                                  showBanner('success', `Settled ${couponCode} (${formatMoney(balanceDue)}) via M-Pesa.`);
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                              >
                                <Smartphone className="w-3 h-3" />
                                <span>M-Pesa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openSettleModal(order)}
                                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 whitespace-nowrap cursor-pointer"
                              >
                                Split / Card
                              </button>
                            </>
                          )}

                          {order.status !== 'completed' && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => {
                                updateOrderStatus(order.id, 'completed', 'Reception Desk', 'Handed over at reception');
                                showBanner('success', `Released & completed service for ${couponCode}.`);
                              }}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Release Service</span>
                            </button>
                          )}

                          {order.status !== 'completed' && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => setCancelCouponId(order.id)}
                              className="px-2 py-1.5 text-[11px] font-semibold rounded-lg text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ml-auto"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>Void</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: CONSOLIDATED PAYROLL SUMMARY ================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  Consolidated Staff Payroll &amp; Statutory Run ({payrollPeriod})
                </h2>
                <p className="text-xs text-neutral-500">
                  Basic salary + allowances + paid-order commissions minus 10% NSSF, TRA PAYE &amp; approved advances
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={payrollPeriod}
                  onChange={(e) => setPayrollPeriod(e.target.value)}
                  aria-label="Payroll period"
                  className="px-2.5 py-1.5 text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg cursor-pointer"
                >
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={openAddEmployeeModal}
                  className="px-3 py-1.5 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportTraCsv}
                  className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export TRA CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => openPayrollDisbursement()}
                  className="px-3.5 py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Run &amp; Settle Payroll ({payrollTotals.unpaidCount})</span>
                </button>
              </div>
            </div>

            {/* Filter & Totals Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={payrollSearch}
                    onChange={(e) => setPayrollSearch(e.target.value)}
                    placeholder="Search staff name, ID..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900"
                  />
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-[11px] font-bold">
                  {(['all', 'active', 'unpaid', 'paid'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPayrollStatusFilter(f)}
                      className={`px-2.5 py-1 rounded-md capitalize cursor-pointer ${
                        payrollStatusFilter === f ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-neutral-500">Gross: </span>
                  <span className="font-mono font-bold tabular-nums">{formatMoney(payrollTotals.gross)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">NSSF+PAYE: </span>
                  <span className="font-mono font-bold text-amber-700 tabular-nums">
                    -{formatMoney(payrollTotals.nssf + payrollTotals.paye)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Advances: </span>
                  <span className="font-mono font-bold text-rose-700 tabular-nums">
                    -{formatMoney(payrollTotals.advances)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Total Net: </span>
                  <span className="font-mono font-extrabold text-neutral-900 tabular-nums">
                    {formatMoney(payrollTotals.net)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Role &amp; Method</th>
                    <th className="py-2.5 px-3 text-right">Basic + Allow.</th>
                    <th className="py-2.5 px-3 text-right">Commission</th>
                    <th className="py-2.5 px-3 text-right">NSSF + PAYE</th>
                    <th className="py-2.5 px-3 text-right">Advances</th>
                    <th className="py-2.5 px-3 text-right">Net Payable</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {payrollRows.map(({ emp, calc }) => (
                    <tr key={emp.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-3">
                        <div className="font-bold text-neutral-900">{emp.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {emp.employeeNumber} · {emp.status.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-neutral-800 font-medium">{emp.position}</div>
                        <div className="text-[10px] text-neutral-500 uppercase">
                          {(emp.paymentMethod || 'bank_transfer').replace('_', ' ')} · {emp.branch}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-neutral-800 tabular-nums">
                        {formatMoney(calc.basicSalary + calc.allowances)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                        {calc.commission > 0 ? `+${formatMoney(calc.commission)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 tabular-nums">
                        -{formatMoney(calc.nssfDeduction + calc.payeTax)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-700 font-semibold tabular-nums">
                        {calc.approvedAdvances > 0 ? `-${formatMoney(calc.approvedAdvances)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-neutral-900 tabular-nums">
                        {formatMoney(calc.netPayable)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[11px] font-bold ${
                            calc.isPaidForPeriod ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {calc.isPaidForPeriod ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditEmployeeModal(emp)}
                            className="px-2 py-1 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="Edit salary, allowances, or staff status"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayslipEmployee(emp)}
                            className="px-2 py-1 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="View & Print itemized payslip"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Payslip</span>
                          </button>
                          {!calc.isPaidForPeriod && emp.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => openPayrollDisbursement([emp.id])}
                              className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Settled Payroll Disbursements Ledger */}
            {payrollPayments.filter((p) => p.period === payrollPeriod).length > 0 && (
              <div className="pt-2 space-y-2">
                <h3 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider">
                  Settled Payslip Disbursements ({payrollPeriod})
                </h3>
                <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-3">Reference</th>
                        <th className="py-2 px-3">Employee</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3 text-right">Advances Deducted</th>
                        <th className="py-2 px-3 text-right">Net Disbursed</th>
                        <th className="py-2 px-3 text-right">Settled By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {payrollPayments
                        .filter((p) => p.period === payrollPeriod)
                        .map((rec) => (
                          <tr key={rec.id}>
                            <td className="py-2 px-3 font-mono font-semibold text-neutral-800">
                              {rec.reference}
                            </td>
                            <td className="py-2 px-3 font-bold text-neutral-900">{rec.employeeName}</td>
                            <td className="py-2 px-3 uppercase text-[11px] text-neutral-600">
                              {rec.method.replace('_', ' ')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-700 tabular-nums">
                              {rec.advanceDeducted > 0 ? `-${formatMoney(rec.advanceDeducted)}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                              {formatMoney(rec.netPaid)}
                            </td>
                            <td className="py-2 px-3 text-right text-neutral-500">{rec.paidBy}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: WAITER COMMISSION AUDIT & SETTLEMENT ================= */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  Waiter Sales Attribution &amp; Commission Policy
                </h2>
                <p className="text-xs text-neutral-500">
                  Active Rule:{' '}
                  <strong className="text-neutral-900">
                    {defaultCommissionMode === 'percent'
                      ? `${defaultCommissionValue}% of Paid Net Sales`
                      : `${formatMoney(defaultCommissionValue)} Fixed / Paid Order`}
                  </strong>{' '}
                  · Earned strictly on paid, non-cancelled orders (supports per-order overrides)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Inline Commission Rule Editor Form */}
                <form
                  onSubmit={handleSavePolicy}
                  className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg p-1"
                >
                  <select
                    value={policyModeDraft}
                    onChange={(e) => setPolicyModeDraft(e.target.value as CommissionMode)}
                    className="px-2 py-1 text-xs font-semibold bg-white border border-neutral-200 rounded-md cursor-pointer"
                    aria-label="Commission rule mode"
                  >
                    <option value="percent">% Net Sales</option>
                    <option value="fixed">Fixed / Order</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={policyModeDraft === 'percent' ? 100 : undefined}
                    step={policyModeDraft === 'percent' ? 0.5 : 500}
                    value={policyValDraft}
                    onChange={(e) => setPolicyValDraft(Number(e.target.value))}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-neutral-200 rounded-md text-right"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Save Rule
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setCommissionApproved((prev) => !prev);
                    showBanner(
                      'success',
                      !commissionApproved
                        ? 'Commission audit period approved by Manager.'
                        : 'Commission period unlocked for review.'
                    );
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    commissionApproved
                      ? 'bg-emerald-600 text-white'
                      : 'border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900'
                  }`}
                >
                  {commissionApproved ? <Check className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}
                  <span>{commissionApproved ? 'Period Approved' : 'Approve Period'}</span>
                </button>
              </div>
            </div>

            {/* Waiter Commission Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {waiters.map((waiter) => {
                const stats = calculateWaiterStats(waiter.id);
                return (
                  <div
                    key={waiter.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-white flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-neutral-100">
                        <div>
                          <div className="font-bold text-sm text-neutral-900">{waiter.name}</div>
                          <div className="text-[11px] font-mono text-neutral-500">
                            {waiter.referralCode} ·{' '}
                            {defaultCommissionMode === 'percent'
                              ? `${defaultCommissionValue}%`
                              : `${formatMoney(defaultCommissionValue)}/ord`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            toggleWaiterActive(waiter.id);
                            showBanner(
                              'success',
                              `${waiter.name} marked ${waiter.active ? 'Paused' : 'Active'} for commission attribution.`
                            );
                          }}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                            waiter.active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-neutral-200 bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {waiter.active ? 'Active' : 'Paused'}
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Paid Net Sales:</span>
                          <span className="font-mono font-semibold tabular-nums">
                            {formatMoney(stats.todaySales)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Orders Credited:</span>
                          <span className="font-mono tabular-nums">
                            {stats.completedOrdersCount} paid · {stats.unpaidOrdersCount} unpaid
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Projected (Unpaid):</span>
                          <span className="font-mono text-amber-700 tabular-nums">
                            {formatMoney(stats.unpaidProjectedCommission)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-neutral-100">
                          <span className="text-neutral-700 font-semibold">Earned Commission:</span>
                          <span className="font-mono font-bold text-emerald-700 tabular-nums">
                            {formatMoney(stats.earnedCommission)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Previously Settled:</span>
                          <span className="font-mono text-neutral-500 tabular-nums">
                            -{formatMoney(stats.paidCommission)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-neutral-200 font-bold text-neutral-900">
                          <span>Net Outstanding:</span>
                          <span className="font-mono text-blue-700 tabular-nums">
                            {formatMoney(stats.pendingCommission)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuditWaiterId(waiter.id);
                          setEditingCommOrderId(null);
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Audit Orders ({stats.myOrders.length})</span>
                      </button>

                      <button
                        type="button"
                        disabled={stats.pendingCommission <= 0}
                        onClick={() => openCommissionPayoutModal(waiter.id)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Settle Payout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Commission Payout History Ledger */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider">
                  Commission Settlement History
                </h3>
                <span className="text-[11px] font-mono text-neutral-500">
                  {commissionPayouts.length} payout(s) recorded
                </span>
              </div>

              {commissionPayouts.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-xl">
                  No waiter commission payouts settled yet this shift. Click "Settle Payout" on any waiter card above to disburse cash, M-Pesa, or bank transfer.
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-3">Date &amp; Time</th>
                        <th className="py-2 px-3">Waiter</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3">Reference</th>
                        <th className="py-2 px-3">Settled By</th>
                        <th className="py-2 px-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {commissionPayouts.map((cp) => (
                        <tr key={cp.id}>
                          <td className="py-2 px-3 font-mono text-neutral-600">
                            {new Date(cp.settledAt).toLocaleDateString()}{' '}
                            {new Date(cp.settledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-3 font-bold text-neutral-900">{cp.waiterName}</td>
                          <td className="py-2 px-3 uppercase text-[11px] text-neutral-700">
                            {cp.method.replace('_', ' ')}
                          </td>
                          <td className="py-2 px-3 font-mono text-neutral-600">{cp.reference}</td>
                          <td className="py-2 px-3 text-neutral-600">{cp.settledBy}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {formatMoney(cp.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: ADVANCES ================= */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          {/* Advances KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <div className="text-[11px] font-medium text-neutral-500">Pending Manager Approval</div>
              <div className="text-lg font-extrabold font-mono text-amber-700 mt-0.5 tabular-nums">
                {advanceSummary.pendingCount} · {formatMoney(advanceSummary.pendingAmount)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <div className="text-[11px] font-medium text-neutral-500">Approved (Queued for Payroll)</div>
              <div className="text-lg font-extrabold font-mono text-rose-700 mt-0.5 tabular-nums">
                {formatMoney(advanceSummary.approvedAmount)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-neutral-200">
              <div className="text-[11px] font-medium text-neutral-500">Deducted / Cash Repaid</div>
              <div className="text-lg font-extrabold font-mono text-emerald-700 mt-0.5 tabular-nums">
                {formatMoney(advanceSummary.clearedAmount)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  Staff Salary Advances &amp; Repayment Ledger
                </h2>
                <p className="text-xs text-neutral-500">
                  Approve, reject, edit, or mark cash repayments. Approved advances auto-deduct in Payroll and lock once settled.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={advanceSearch}
                    onChange={(e) => setAdvanceSearch(e.target.value)}
                    placeholder="Staff name, reason..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900"
                  />
                </div>

                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg text-[11px] font-bold">
                  {(['all', 'pending', 'approved', 'deducted', 'repaid', 'rejected'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAdvanceFilter(f)}
                      className={`px-2 py-1 rounded-md capitalize cursor-pointer ${
                        advanceFilter === f ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={openNewAdvanceModal}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Advance</span>
                </button>
              </div>
            </div>

            {filteredAdvances.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-xl space-y-2">
                <div>No salary advances match the current filter.</div>
                <button
                  type="button"
                  onClick={openNewAdvanceModal}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Record First Advance
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                {filteredAdvances.map(({ emp, adv, status }) => {
                  const rowKey = `${emp.id}-${adv.id}`;
                  return (
                    <div
                      key={adv.id}
                      className="p-3.5 bg-white hover:bg-neutral-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-neutral-900">{emp.name}</span>
                          <span className="text-neutral-400">·</span>
                          <span className="text-neutral-600">{emp.position}</span>
                          <span className="text-neutral-400">·</span>
                          <span className="font-mono text-[11px] text-neutral-500">{adv.date}</span>
                          {adv.repaymentMonth && (
                            <>
                              <span className="text-neutral-400">·</span>
                              <span className="font-mono text-[11px] text-neutral-500">
                                Payroll {adv.repaymentMonth}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-neutral-600">Reason: {adv.reason}</div>

                        {rejectingAdvanceKey === rowKey && (
                          <div className="pt-2 flex items-center gap-2 max-w-md">
                            <input
                              type="text"
                              value={rejectAdvanceNote}
                              onChange={(e) => setRejectAdvanceNote(e.target.value)}
                              placeholder="Rejection note (optional)..."
                              className="flex-1 px-2.5 py-1 text-xs border border-rose-200 rounded-lg bg-rose-50/50 outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                rejectAdvance(emp.id, adv.id, rejectAdvanceNote.trim() || undefined);
                                setRejectingAdvanceKey(null);
                                setRejectAdvanceNote('');
                                showBanner('success', `Rejected advance request for ${emp.name}.`);
                              }}
                              className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Confirm Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingAdvanceKey(null)}
                              className="px-2 py-1 text-[11px] text-neutral-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-extrabold text-sm text-neutral-900 tabular-nums">
                            {formatMoney(adv.amount)}
                          </div>
                          <div
                            className={`text-[11px] font-bold ${
                              status === 'approved'
                                ? 'text-rose-700'
                                : status === 'pending'
                                ? 'text-amber-700'
                                : status === 'deducted' || status === 'repaid'
                                ? 'text-emerald-700'
                                : 'text-neutral-500'
                            }`}
                          >
                            {status === 'pending' && 'Pending Approval'}
                            {status === 'approved' && 'Approved · Queued for Payroll'}
                            {status === 'deducted' && 'Deducted in Payroll'}
                            {status === 'repaid' && 'Repaid in Cash'}
                            {status === 'rejected' && 'Rejected'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  approveAdvance(emp.id, adv.id, managerActor);
                                  showBanner('success', `Approved ${formatMoney(adv.amount)} advance for ${emp.name}.`);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditAdvanceModal(emp.id, adv.id, adv.amount, adv.reason)}
                                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingAdvanceKey(rowKey);
                                  setRejectAdvanceNote('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {status === 'approved' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditAdvanceModal(emp.id, adv.id, adv.amount, adv.reason)}
                                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  markAdvanceRepaid(emp.id, adv.id);
                                  showBanner(
                                    'success',
                                    `Marked ${formatMoney(adv.amount)} advance for ${emp.name} repaid in cash.`
                                  );
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
                              >
                                Mark Repaid
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingAdvanceKey(rowKey);
                                  setRejectAdvanceNote('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 text-[11px] font-semibold cursor-pointer"
                              >
                                Void
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL 1: RECEPTION SPLIT / PARTIAL PAYMENT SETTLEMENT ================= */}
      {settleOrderTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleConfirmReceptionSettle}
            className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
          >
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-neutral-900">
                  Settle Coupon {settleOrderTarget.serviceCouponCode || settleOrderTarget.orderNumber}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Total: {formatMoney(settleOrderTarget.total)} · Balance Due:{' '}
                  <span className="font-mono font-bold text-rose-700">
                    {formatMoney(Math.max(0, settleOrderTarget.total - (settleOrderTarget.paidAmount || 0)))}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettleOrderTarget(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1.5">Tender Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                      { id: 'airtel', label: 'Airtel', icon: Smartphone },
                      { id: 'card', label: 'Card', icon: CreditCard },
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSettleMethod(m.id)}
                        className={`py-2 px-2 rounded-lg border font-bold flex flex-col items-center gap-1 cursor-pointer ${
                          settleMethod === m.id
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Amount (TZS)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={Math.max(1, settleOrderTarget.total - (settleOrderTarget.paidAmount || 0))}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Ref / Slip Code</label>
                  <input
                    type="text"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder={settleMethod === 'cash' ? 'Optional' : 'e.g. MP-88241'}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settleCompleteService}
                  onChange={(e) => setSettleCompleteService(e.target.checked)}
                  className="rounded border-neutral-300"
                />
                <span>Mark service completed &amp; release table upon full settlement</span>
              </label>
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSettleOrderTarget(null)}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer whitespace-nowrap"
              >
                Confirm Payment ({formatMoney(settleAmount)})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 2: RECEPTION WALK-IN COUPON ORDER ================= */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleCreateWalkInCoupon}
            className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
          >
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-extrabold text-neutral-900">
                Issue Walk-In Service Coupon &amp; Send to Kitchen
              </h3>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Service Type</label>
                  <select
                    value={walkInType}
                    onChange={(e) => setWalkInType(e.target.value as OrderType)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                  >
                    <option value="dine_in">Dine-In Table</option>
                    <option value="pickup">Front Desk Takeaway</option>
                  </select>
                </div>
                {walkInType === 'dine_in' && (
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Table</label>
                    <select
                      value={walkInTable}
                      onChange={(e) => setWalkInTable(e.target.value)}
                      className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                    >
                      {tables.map((t) => (
                        <option key={t.id} value={t.number}>
                          {t.number} ({t.capacity}p · {t.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Guest Name</label>
                  <input
                    type="text"
                    required
                    value={walkInGuest}
                    onChange={(e) => setWalkInGuest(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Assigned Waiter</label>
                  <select
                    value={walkInWaiterId}
                    onChange={(e) => setWalkInWaiterId(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                  >
                    <option value="">Reception Self-Service</option>
                    {waiters.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">Dish / Item</label>
                  {menuItems.length === 0 ? (
                    <div className="px-2.5 py-2 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-medium">
                      No menu items catalogued yet — add dishes in Inventory &amp; Menu Builder first.
                    </div>
                  ) : (
                    <select
                      value={walkInMenuItemId}
                      onChange={(e) => setWalkInMenuItemId(e.target.value)}
                      className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                    >
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatMoney(m.price)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={walkInQty}
                    onChange={(e) => setWalkInQty(Number(e.target.value))}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Kitchen / Guest Note</label>
                <input
                  type="text"
                  value={walkInNote}
                  onChange={(e) => setWalkInNote(e.target.value)}
                  placeholder="Optional prep instructions..."
                  className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={menuItems.length === 0}
                className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-lg cursor-pointer whitespace-nowrap"
              >
                Issue Service Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 3: ADD / EDIT EMPLOYEE ================= */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSaveEmployee}
            className="bg-white rounded-2xl max-w-lg w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
          >
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-extrabold text-neutral-900">
                {editingEmployee
                  ? `Edit Staff Profile · ${editingEmployee.employeeNumber}`
                  : 'Onboard New Staff Member'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Neema Charles"
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">System Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as Role)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="cashier">Cashier</option>
                    <option value="reception">Reception</option>
                    <option value="kitchen">Kitchen / Chef</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Position Title</label>
                  <input
                    type="text"
                    required
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Status</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as Employee['status'])}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Pay Cycle</label>
                  <select
                    value={empSalaryType}
                    onChange={(e) => setEmpSalaryType(e.target.value as Employee['salaryType'])}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Basic Salary (TZS)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={empBaseSalary}
                    onChange={(e) => setEmpBaseSalary(Number(e.target.value))}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Allowances (TZS)</label>
                  <input
                    type="number"
                    min={0}
                    value={empAllowances}
                    onChange={(e) => setEmpAllowances(Number(e.target.value))}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Disbursement Channel</label>
                  <select
                    value={empPayMethod}
                    onChange={(e) =>
                      setEmpPayMethod(e.target.value as 'bank_transfer' | 'mpesa' | 'cash')
                    }
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mpesa">M-Pesa Mobile</option>
                    <option value="cash">Cash Envelope</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={empBranch}
                    onChange={(e) => setEmpBranch(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">TIN Number</label>
                  <input
                    type="text"
                    value={empTin}
                    onChange={(e) => setEmpTin(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">NSSF Member #</label>
                  <input
                    type="text"
                    value={empNssf}
                    onChange={(e) => setEmpNssf(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Account / Wallet</label>
                  <input
                    type="text"
                    value={empBankAcct}
                    onChange={(e) => setEmpBankAcct(e.target.value)}
                    placeholder="CRDB / M-Pesa"
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer whitespace-nowrap"
              >
                {editingEmployee ? 'Save Changes' : 'Onboard Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 4: PAYROLL DISBURSEMENT RUN ================= */}
      {isPayrollRunOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleConfirmPayrollRun}
            className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
          >
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-neutral-900">
                  Confirm Payroll Disbursement ({payrollPeriod})
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {runEmployeeIds.length} staff selected · Approved advances will be marked deducted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayrollRunOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
              <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                {runEmployeeIds.map((id) => {
                  const emp = employees.find((e2) => e2.id === id);
                  const calc = calculateEmployeePayroll(id, payrollPeriod);
                  if (!emp) return null;
                  return (
                    <div key={id} className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-neutral-900">{emp.name}</div>
                        <div className="text-[10px] text-neutral-500">
                          Gross {formatMoney(calc.grossPay)} · Deduct -{formatMoney(calc.nssfDeduction + calc.payeTax + calc.approvedAdvances)}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 tabular-nums">
                        {formatMoney(calc.netPayable)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Disbursement Channel</label>
                  <select
                    value={runMethod}
                    onChange={(e) =>
                      setRunMethod(e.target.value as 'bank_transfer' | 'mpesa' | 'cash')
                    }
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg bg-white"
                  >
                    <option value="bank_transfer">Bank Batch Transfer</option>
                    <option value="mpesa">M-Pesa Bulk Disbursement</option>
                    <option value="cash">Cash Payroll</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Batch Ref Prefix</label>
                  <input
                    type="text"
                    value={runRefPrefix}
                    onChange={(e) => setRunRefPrefix(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between font-bold">
                <span>Total Net Disbursement:</span>
                <span className="font-mono text-sm text-emerald-700 tabular-nums">
                  {formatMoney(
                    runEmployeeIds.reduce(
                      (s, id) => s + calculateEmployeePayroll(id, payrollPeriod).netPayable,
                      0
                    )
                  )}
                </span>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPayrollRunOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer whitespace-nowrap"
              >
                Disburse &amp; Settle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 5: ITEMIZED PRINTABLE PAYSLIP ================= */}
      {payslipEmployee && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          {(() => {
            const calc = calculateEmployeePayroll(payslipEmployee.id, payrollPeriod);
            const totalDeductions = calc.nssfDeduction + calc.payeTax + calc.approvedAdvances;
            const employerNssf = calc.nssfDeduction; // 10% employer statutory matching contribution
            const employeeAdvances = payslipEmployee.advances.filter((a) => {
              const st = a.status || (a.approved ? 'approved' : 'pending');
              return st === 'approved' || st === 'deducted';
            });

            const handleDownloadSinglePayslipCsv = () => {
              const rows = [
                ['Payslip Period', payrollPeriod],
                ['Employer', currentTenant.name],
                ['Branch', payslipEmployee.branch],
                ['Employee ID', payslipEmployee.employeeNumber],
                ['Employee Name', payslipEmployee.name],
                ['Role / Position', payslipEmployee.position],
                ['TIN Number', payslipEmployee.tinNumber || 'On File'],
                ['NSSF Member #', payslipEmployee.nssfNumber || 'On File'],
                ['Basic Salary (TZS)', String(calc.basicSalary)],
                ['Allowances (TZS)', String(calc.allowances)],
                ['Paid Sales Commission (TZS)', String(calc.commission)],
                ['Gross Pay (TZS)', String(calc.grossPay)],
                ['Employee NSSF 10% (TZS)', String(calc.nssfDeduction)],
                ['TRA PAYE Income Tax (TZS)', String(calc.payeTax)],
                ['Salary Advances Deducted (TZS)', String(calc.approvedAdvances)],
                ['Total Deductions (TZS)', String(totalDeductions)],
                ['Net Payable (TZS)', String(calc.netPayable)],
                ['Employer NSSF 10% Memo (TZS)', String(employerNssf)],
                [
                  'Disbursement Status',
                  calc.isPaidForPeriod ? `PAID (${calc.paymentRecord?.reference})` : 'PENDING DISBURSEMENT',
                ],
              ];
              const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Payslip_${payslipEmployee.employeeNumber}_${payrollPeriod}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              showBanner('success', `Downloaded payslip CSV for ${payslipEmployee.name}.`);
            };

            return (
              <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
                {/* Modal Header */}
                <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-neutral-900">
                        Employee Payslip · {payrollPeriod}
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        {payslipEmployee.employeeNumber} · {payslipEmployee.name} ({payslipEmployee.position})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        calc.isPaidForPeriod
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {calc.isPaidForPeriod ? 'Paid' : 'Pending Disbursement'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPayslipEmployee(null)}
                      aria-label="Close payslip"
                      className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Payslip Body */}
                <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
                  {/* Employer & Employee Statutory Header */}
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-neutral-200">
                      <div>
                        <div className="font-extrabold text-sm text-neutral-900">{currentTenant.name}</div>
                        <div className="text-neutral-500">
                          {payslipEmployee.branch} · {currentTenant.address}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-neutral-900">{payslipEmployee.employeeNumber}</div>
                        <div className="text-[11px] text-neutral-500">
                          Pay Period: {payrollPeriod} · Cycle: {payslipEmployee.salaryType.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Employee</div>
                        <div className="font-bold text-neutral-900">{payslipEmployee.name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Role / Title</div>
                        <div className="font-semibold text-neutral-800">{payslipEmployee.position}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Disbursement Channel</div>
                        <div className="font-semibold text-neutral-800 uppercase">
                          {(payslipEmployee.paymentMethod || 'bank_transfer').replace('_', ' ')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">TRA TIN</div>
                        <div className="font-mono text-neutral-800">{payslipEmployee.tinNumber || 'On File'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">NSSF Member #</div>
                        <div className="font-mono text-neutral-800">{payslipEmployee.nssfNumber || 'On File'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Account / Phone</div>
                        <div className="font-mono text-neutral-800">
                          {payslipEmployee.bankAccount || payslipEmployee.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Breakdown: Earnings vs Deductions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Earnings Column */}
                    <div className="border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
                      <div className="px-3.5 py-2 bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                        Earnings &amp; Commissions
                      </div>
                      <div className="divide-y divide-neutral-100 flex-1">
                        <div className="px-3.5 py-2.5 flex justify-between items-center">
                          <span className="text-neutral-600">Basic Salary</span>
                          <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                            {formatMoney(calc.basicSalary)}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex justify-between items-center">
                          <span className="text-neutral-600">Allowances</span>
                          <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                            {formatMoney(calc.allowances)}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex justify-between items-center">
                          <span className="text-neutral-600">Paid Sales Commission</span>
                          <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                            +{formatMoney(calc.commission)}
                          </span>
                        </div>
                      </div>
                      <div className="px-3.5 py-2.5 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center font-bold text-neutral-900">
                        <span>Gross Pay</span>
                        <span className="font-mono tabular-nums">{formatMoney(calc.grossPay)}</span>
                      </div>
                    </div>

                    {/* Deductions Column */}
                    <div className="border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
                      <div className="px-3.5 py-2 bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-800 uppercase tracking-wider text-[11px]">
                        Statutory &amp; Advance Deductions
                      </div>
                      <div className="divide-y divide-neutral-100 flex-1">
                        <div className="px-3.5 py-2.5 flex justify-between items-center text-amber-800">
                          <span>NSSF Contribution (10%)</span>
                          <span className="font-mono font-semibold tabular-nums">
                            -{formatMoney(calc.nssfDeduction)}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex justify-between items-center text-amber-800">
                          <span>TRA PAYE Income Tax</span>
                          <span className="font-mono font-semibold tabular-nums">
                            -{formatMoney(calc.payeTax)}
                          </span>
                        </div>
                        <div className="px-3.5 py-2.5 flex justify-between items-center text-rose-700">
                          <span>Salary Advances Deducted</span>
                          <span className="font-mono font-semibold tabular-nums">
                            -{formatMoney(calc.approvedAdvances)}
                          </span>
                        </div>
                      </div>
                      <div className="px-3.5 py-2.5 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center font-bold text-neutral-900">
                        <span>Total Deductions</span>
                        <span className="font-mono text-rose-700 tabular-nums">
                          -{formatMoney(totalDeductions)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Advance Breakdown Note (when advances exist) */}
                  {employeeAdvances.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 px-3.5 py-2.5 bg-white">
                      <div className="text-[11px] font-bold text-neutral-700 mb-1.5">
                        Itemized Salary Advances ({employeeAdvances.length})
                      </div>
                      <div className="space-y-1">
                        {employeeAdvances.map((adv) => {
                          const st = adv.status || (adv.approved ? 'approved' : 'pending');
                          return (
                            <div key={adv.id} className="flex items-center justify-between text-[11px]">
                              <span className="text-neutral-600">
                                {adv.date} · {adv.reason}{' '}
                                <span className="uppercase font-semibold text-neutral-400">({st})</span>
                              </span>
                              <span className="font-mono font-semibold text-rose-700 tabular-nums">
                                -{formatMoney(adv.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Net Payable Banner + Employer Statutory Memo */}
                  <div className="rounded-xl bg-neutral-900 text-white px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                        Net Payable Take-Home ({payrollPeriod})
                      </div>
                      <div className="text-lg font-extrabold font-mono tabular-nums">
                        {formatMoney(calc.netPayable)}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-neutral-300 space-y-0.5">
                      <div>
                        Employer NSSF Match (10%):{' '}
                        <span className="font-mono font-semibold text-white tabular-nums">
                          {formatMoney(employerNssf)}
                        </span>
                      </div>
                      <div>
                        Status:{' '}
                        <span
                          className={`font-bold ${
                            calc.isPaidForPeriod ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {calc.isPaidForPeriod
                            ? `PAID · ${calc.paymentRecord?.reference}`
                            : 'PENDING DISBURSEMENT'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSinglePayslipCsv}
                      className="px-3 py-2 text-xs font-bold border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 text-xs font-bold border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Payslip</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {!calc.isPaidForPeriod && payslipEmployee.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = payslipEmployee.id;
                          setPayslipEmployee(null);
                          openPayrollDisbursement([targetId]);
                        }}
                        className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Disburse Pay Now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPayslipEmployee(null)}
                      className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= MODAL 6: WAITER ORDER COMMISSION AUDIT & OVERRIDE ================= */}
      {auditWaiterId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          {(() => {
            const waiter = waiters.find((w) => w.id === auditWaiterId);
            const stats = calculateWaiterStats(auditWaiterId);
            return (
              <div className="bg-white rounded-2xl max-w-3xl w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
                <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-sm font-extrabold text-neutral-900">
                      Commission Order Audit · {waiter?.name}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {stats.completedOrdersCount} paid orders · {stats.unpaidOrdersCount} unpaid (projected) · Override individual order % or fixed commission
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuditWaiterId(null)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-3">
                  {stats.myOrders.length === 0 ? (
                    <div className="py-10 text-center text-xs text-neutral-500">
                      No orders currently attributed to {waiter?.name}.
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left border border-neutral-200 rounded-xl overflow-hidden">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                        <tr>
                          <th className="py-2 px-3">Order &amp; Coupon</th>
                          <th className="py-2 px-3">Payment Status</th>
                          <th className="py-2 px-3 text-right">Net Sales</th>
                          <th className="py-2 px-3">Rule</th>
                          <th className="py-2 px-3 text-right">Commission</th>
                          <th className="py-2 px-3 text-right">Override</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {stats.myOrders.map((ord) => {
                          const comm = getOrderCommission(ord, auditWaiterId);
                          const isEditingThis = editingCommOrderId === ord.id;
                          return (
                            <tr key={ord.id}>
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-neutral-900">
                                  {ord.orderNumber} · {ord.serviceCouponCode || '—'}
                                </div>
                                <div className="text-[10px] text-neutral-500">{ord.customerName}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`font-bold text-[11px] ${
                                    comm.isPaidEligible ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  {comm.isPaidEligible ? 'Paid (Credited)' : `${ord.paymentStatus} (Projected)`}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {formatMoney(Math.max(0, ord.subtotal - (ord.discount || 0)))}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-neutral-600">
                                {isEditingThis ? (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={overrideMode}
                                      onChange={(e) => setOverrideMode(e.target.value as CommissionMode)}
                                      className="px-1.5 py-1 border border-neutral-300 rounded text-[11px]"
                                    >
                                      <option value="percent">%</option>
                                      <option value="fixed">Fixed</option>
                                    </select>
                                    <input
                                      type="number"
                                      min={0}
                                      value={overrideValue}
                                      onChange={(e) => setOverrideValue(Number(e.target.value))}
                                      className="w-16 px-1.5 py-1 border border-neutral-300 rounded font-mono text-[11px]"
                                    />
                                  </div>
                                ) : (
                                  <span>
                                    {comm.mode === 'percent' ? `${comm.value}%` : formatMoney(comm.value)} ·{' '}
                                    {comm.configuredBy}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 tabular-nums">
                                {formatMoney(comm.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {isEditingThis ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateOrderCommission(
                                          ord.id,
                                          overrideMode,
                                          overrideValue,
                                          'Manager Audit',
                                          auditWaiterId
                                        );
                                        setEditingCommOrderId(null);
                                        showBanner('success', `Updated commission override on ${ord.orderNumber}.`);
                                      }}
                                      className="px-2 py-1 rounded bg-neutral-900 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCommOrderId(null)}
                                      className="px-1.5 py-1 text-[10px] text-neutral-500 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommOrderId(ord.id);
                                      setOverrideMode(comm.mode);
                                      setOverrideValue(comm.value);
                                    }}
                                    className="px-2 py-1 rounded border border-neutral-200 hover:bg-neutral-100 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Override
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= MODAL 7: SETTLE WAITER COMMISSION PAYOUT ================= */}
      {payoutWaiterId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          {(() => {
            const waiter = waiters.find((w) => w.id === payoutWaiterId);
            const stats = calculateWaiterStats(payoutWaiterId);
            return (
              <form
                onSubmit={handleConfirmCommissionPayout}
                className="bg-white rounded-2xl max-w-sm w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
              >
                <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-sm font-extrabold text-neutral-900">
                      Settle Commission · {waiter?.name}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Outstanding balance: <span className="font-mono font-bold">{formatMoney(stats.pendingCommission)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayoutWaiterId(null)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Payout Amount (TZS)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={Math.max(1, stats.pendingCommission)}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Disbursement Method</label>
                    <select
                      value={payoutMethod}
                      onChange={(e) =>
                        setPayoutMethod(e.target.value as 'cash' | 'mpesa' | 'bank_transfer')
                      }
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-white"
                    >
                      <option value="mpesa">M-Pesa Transfer</option>
                      <option value="cash">Cash Drawer Payout</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Payment Reference</label>
                    <input
                      type="text"
                      value={payoutRef}
                      onChange={(e) => setPayoutRef(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPayoutWaiterId(null)}
                    className="px-3 py-2 text-xs font-semibold text-neutral-600 cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Confirm Payout ({formatMoney(payoutAmount)})
                  </button>
                </div>
              </form>
            );
          })()}
        </div>
      )}

      {/* ================= MODAL 8: RECORD / EDIT SALARY ADVANCE ================= */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSaveAdvance}
            className="bg-white rounded-2xl max-w-sm w-full border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
          >
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-extrabold text-neutral-900">
                {editingAdvanceRef ? 'Edit Salary Advance' : 'Record / Request Salary Advance'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Employee</label>
                <select
                  value={selectedEmpId}
                  disabled={Boolean(editingAdvanceRef)}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-white disabled:bg-neutral-100"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Amount (TZS)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg font-mono font-bold"
                  />
                </div>
                {!editingAdvanceRef && (
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Payroll Month</label>
                    <select
                      value={advanceRepaymentMonth}
                      onChange={(e) => setAdvanceRepaymentMonth(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-white font-mono"
                    >
                      {availablePeriods.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Reason / Justification</label>
                <textarea
                  required
                  rows={2}
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="e.g. Medical emergency, transport, school fees..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                />
              </div>

              {!editingAdvanceRef && (
                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={advanceAutoApprove}
                    onChange={(e) => setAdvanceAutoApprove(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span>Approve immediately for payroll deduction (otherwise queue as Pending)</span>
                </label>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-neutral-600 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer whitespace-nowrap"
              >
                {editingAdvanceRef
                  ? 'Save Changes'
                  : advanceAutoApprove
                  ? 'Approve & Record'
                  : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt Modal for Reception Service Coupons */}
      <ReceiptModal
        order={receiptOrder}
        isOpen={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};
