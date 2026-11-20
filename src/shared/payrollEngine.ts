import type {
  CommissionMode,
  Employee,
  Order,
  PayrollPaymentRecord,
  Waiter,
} from '../types/restaurant.ts';

export function computeTraPaye(taxablePay: number): number {
  if (taxablePay <= 270000) return 0;
  if (taxablePay <= 520000) return Math.round((taxablePay - 270000) * 0.08);
  if (taxablePay <= 760000) return Math.round(20000 + (taxablePay - 520000) * 0.2);
  if (taxablePay <= 1000000) return Math.round(68000 + (taxablePay - 760000) * 0.25);
  return Math.round(128000 + (taxablePay - 1000000) * 0.3);
}

export function getOrderCommissionPure(
  order: Order,
  waiters: Waiter[],
  defaultCommissionMode: CommissionMode,
  defaultCommissionValue: number,
  waiterId?: string
): {
  mode: CommissionMode;
  value: number;
  amount: number;
  isPaidEligible: boolean;
  configuredBy: string;
} {
  const waiter = waiterId ? waiters.find((w) => w.id === waiterId) : undefined;
  const mode: CommissionMode = order.commissionMode ?? defaultCommissionMode;
  const fallbackVal =
    mode === 'percent' && waiter
      ? Math.round((waiter.commissionRate || 0.05) * 10000) / 100
      : defaultCommissionValue;
  const value = order.commissionValue !== undefined ? order.commissionValue : fallbackVal;
  const netSales = Math.max(0, order.subtotal - (order.discount || 0));
  const computed =
    order.commissionAmount !== undefined && order.commissionMode !== undefined
      ? order.commissionAmount
      : mode === 'percent'
      ? Math.round(netSales * (Math.max(0, Math.min(100, value)) / 100))
      : Math.max(0, Math.round(value));
  const isPaidEligible = order.paymentStatus === 'paid' && order.status !== 'cancelled';

  return {
    mode,
    value,
    amount: computed,
    isPaidEligible,
    configuredBy: order.commissionConfiguredBy || 'Auto Rule',
  };
}

export function calculateWaiterStatsPure(
  waiterId: string,
  orders: Order[],
  waiters: Waiter[],
  defaultCommissionMode: CommissionMode,
  defaultCommissionValue: number,
  settledCommissionByWaiter: Record<string, number>
) {
  const myOrders = orders.filter(
    (o) => o.referralWaiterId === waiterId || o.servingWaiterId === waiterId
  );

  const paidOrders = myOrders.filter(
    (o) => o.paymentStatus === 'paid' && o.status !== 'cancelled'
  );
  const unpaidOrders = myOrders.filter(
    (o) => o.paymentStatus !== 'paid' && o.status !== 'cancelled'
  );

  const todaySales = paidOrders.reduce(
    (sum, o) => sum + Math.max(0, o.subtotal - (o.discount || 0)),
    0
  );

  const pendingOrdersCount = myOrders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  ).length;

  const completedOrdersCount = paidOrders.length;
  const earnedCommission = paidOrders.reduce(
    (sum, o) => sum + getOrderCommissionPure(o, waiters, defaultCommissionMode, defaultCommissionValue, waiterId).amount,
    0
  );
  const unpaidProjectedCommission = unpaidOrders.reduce(
    (sum, o) => sum + getOrderCommissionPure(o, waiters, defaultCommissionMode, defaultCommissionValue, waiterId).amount,
    0
  );
  const paidCommission = settledCommissionByWaiter[waiterId] || 0;
  const pendingCommission = Math.max(0, earnedCommission - paidCommission);

  return {
    myOrders,
    todaySales,
    pendingOrdersCount,
    completedOrdersCount,
    unpaidOrdersCount: unpaidOrders.length,
    unpaidProjectedCommission,
    earnedCommission,
    pendingCommission,
    paidCommission,
  };
}

export function calculateEmployeePayrollPure(
  employeeId: string,
  period: string,
  employees: Employee[],
  waiters: Waiter[],
  orders: Order[],
  defaultCommissionMode: CommissionMode,
  defaultCommissionValue: number,
  settledCommissionByWaiter: Record<string, number>,
  payrollPayments: PayrollPaymentRecord[]
): {
  basicSalary: number;
  allowances: number;
  commission: number;
  grossPay: number;
  nssfDeduction: number;
  payeTax: number;
  approvedAdvances: number;
  netPayable: number;
  isPaidForPeriod: boolean;
  paymentRecord?: PayrollPaymentRecord;
} {
  const emp = employees.find((e) => e.id === employeeId);
  const paymentRecord = payrollPayments.find(
    (p) => p.employeeId === employeeId && p.period === period
  );
  if (!emp) {
    return {
      basicSalary: 0,
      allowances: 0,
      commission: 0,
      grossPay: 0,
      nssfDeduction: 0,
      payeTax: 0,
      approvedAdvances: 0,
      netPayable: 0,
      isPaidForPeriod: false,
    };
  }

  if (paymentRecord) {
    return {
      basicSalary: paymentRecord.basicSalary,
      allowances: paymentRecord.allowances,
      commission: paymentRecord.commission,
      grossPay: paymentRecord.grossPay,
      nssfDeduction: paymentRecord.nssfDeduction,
      payeTax: paymentRecord.payeTax,
      approvedAdvances: paymentRecord.advanceDeducted,
      netPayable: paymentRecord.netPaid,
      isPaidForPeriod: true,
      paymentRecord,
    };
  }

  const waiterMatch = waiters.find((w) => w.name === emp.name);
  const commission = waiterMatch
    ? calculateWaiterStatsPure(
        waiterMatch.id,
        orders,
        waiters,
        defaultCommissionMode,
        defaultCommissionValue,
        settledCommissionByWaiter
      ).earnedCommission
    : 0;
  const basicSalary = emp.baseSalary;
  const allowances = emp.allowances || 0;
  const grossPay = basicSalary + allowances + commission;
  const nssfDeduction = Math.round(grossPay * 0.1);
  const taxablePay = Math.max(0, grossPay - nssfDeduction);
  const payeTax = computeTraPaye(taxablePay);
  const approvedAdvances = emp.advances
    .filter((a) => {
      const st = a.status || (a.approved ? 'approved' : 'pending');
      return st === 'approved';
    })
    .reduce((sum, a) => sum + a.amount, 0);
  const netPayable = Math.max(0, grossPay - nssfDeduction - payeTax - approvedAdvances);

  return {
    basicSalary,
    allowances,
    commission,
    grossPay,
    nssfDeduction,
    payeTax,
    approvedAdvances,
    netPayable,
    isPaidForPeriod: false,
  };
}
