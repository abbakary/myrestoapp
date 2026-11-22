import type {
  CommissionPayoutLog,
  Employee,
  PayrollPaymentRecord,
  Role,
  Waiter,
} from '../../src/types/restaurant.ts';
import {
  calculateEmployeePayrollPure,
  calculateWaiterStatsPure,
} from '../../src/shared/payrollEngine.ts';
import { createId, formatTzs, todayDateStr } from '../../src/shared/helpers.ts';
import { HttpError } from '../core/http.ts';
import { storeRepo } from '../core/store.ts';

export const hrService = {
  listHrOverview(branchId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return {
      employees: store.employees,
      waiters: store.waiters,
      payrollPayments: store.payrollPayments,
      commissionPayouts: store.commissionPayouts,
      settledCommissionByWaiter: store.settledCommissionByWaiter,
    };
  },

  addEmployee(
    branchId: string,
    emp: Omit<Employee, 'id' | 'employeeNumber' | 'advances'> & { id?: string; waiterId?: string }
  ): { employee: Employee; waiter?: Waiter } {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const nextNum = store.employees.length + 1;
    const empNumber = `EMP-${String(nextNum).padStart(3, '0')}`;
    const newEmp: Employee = {
      ...emp,
      id: emp.id || createId('emp'),
      employeeNumber: empNumber,
      advances: [],
    };
    store.employees.push(newEmp);

    let newWaiter: Waiter | undefined;
    if (emp.role === 'waiter') {
      const codeBase =
        emp.name
          .trim()
          .split(/\s+/)[0]
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '') || 'STAFF';
      const branch = storeRepo.getBranchOrThrow(branchId);
      const emailDomain = branch.email?.split('@')[1] || 'restaurant.local';
      newWaiter = {
        id: emp.waiterId || createId('waiter'),
        name: emp.name,
        phone: emp.phone,
        email: emp.email || `${codeBase.toLowerCase()}@${emailDomain}`,
        referralCode: `WAITER_${codeBase}_${nextNum}`,
        active: emp.status === 'active',
        commissionRate: store.defaultCommissionMode === 'percent' ? store.defaultCommissionValue / 100 : 0.05,
      };
      store.waiters.push(newWaiter);
    }

    store.auditLogs.unshift({
      id: createId('aud'),
      actor: 'HR / Manager',
      actorRole: 'manager',
      action: 'EMPLOYEE_ONBOARDED',
      details: `Added ${newEmp.name} (${newEmp.employeeNumber} · ${newEmp.position}) at ${formatTzs(newEmp.baseSalary)}`,
      timestamp: new Date().toISOString(),
    });
    storeRepo.commit();
    return { employee: newEmp, waiter: newWaiter };
  },

  updateEmployee(branchId: string, employeeId: string, updates: Partial<Employee>) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const idx = store.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) throw new HttpError(404, `Employee "${employeeId}" not found.`, 'EMPLOYEE_NOT_FOUND');

    const prevTarget = store.employees[idx];
    const updated = { ...prevTarget, ...updates, id: prevTarget.id };
    store.employees[idx] = updated;

    if (updates.status) {
      store.waiters.forEach((w) => {
        if (w.name === prevTarget.name) {
          w.active = updates.status === 'active';
        }
      });
    }

    store.auditLogs.unshift({
      id: createId('aud'),
      actor: 'HR / Manager',
      actorRole: 'manager',
      action: 'EMPLOYEE_UPDATED',
      details: `Updated staff profile for ${updates.name || prevTarget.name}`,
      timestamp: new Date().toISOString(),
    });
    storeRepo.commit();
    return updated;
  },

  toggleWaiterActive(branchId: string, waiterId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const w = store.waiters.find((item) => item.id === waiterId);
    if (!w) throw new HttpError(404, `Waiter "${waiterId}" not found.`, 'WAITER_NOT_FOUND');
    w.active = !w.active;
    storeRepo.commit();
    return w;
  },

  getWaiterStats(branchId: string, waiterId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const w = store.waiters.find((item) => item.id === waiterId);
    if (!w) throw new HttpError(404, `Waiter "${waiterId}" not found.`, 'WAITER_NOT_FOUND');
    return calculateWaiterStatsPure(
      waiterId,
      store.orders,
      store.waiters,
      store.defaultCommissionMode,
      store.defaultCommissionValue,
      store.settledCommissionByWaiter
    );
  },

  settleWaiterCommission(
    branchId: string,
    waiterId: string,
    amount?: number,
    options?: { method?: 'cash' | 'mpesa' | 'bank_transfer'; reference?: string; settledBy?: string }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const waiter = store.waiters.find((w) => w.id === waiterId);
    if (!waiter) throw new HttpError(404, `Waiter "${waiterId}" not found.`, 'WAITER_NOT_FOUND');

    const stats = calculateWaiterStatsPure(
      waiterId,
      store.orders,
      store.waiters,
      store.defaultCommissionMode,
      store.defaultCommissionValue,
      store.settledCommissionByWaiter
    );
    const rawAmt = amount !== undefined ? Math.max(0, amount) : stats.pendingCommission;
    const settleAmt = Math.min(stats.pendingCommission, Math.round(rawAmt));
    if (settleAmt <= 0) {
      throw new HttpError(409, 'No pending commission balance available to settle.', 'NO_COMMISSION_DUE');
    }

    const method = options?.method || 'cash';
    const ref = options?.reference?.trim() || `COMM-${Date.now().toString().slice(-5)}`;
    const settledBy = options?.settledBy || 'Branch Manager';

    store.settledCommissionByWaiter[waiterId] = (store.settledCommissionByWaiter[waiterId] || 0) + settleAmt;
    const payout: CommissionPayoutLog = {
      id: createId('cp'),
      waiterId,
      waiterName: waiter.name,
      amount: settleAmt,
      method,
      reference: ref,
      settledAt: new Date().toISOString(),
      settledBy,
    };
    store.commissionPayouts.unshift(payout);

    store.notifications.unshift({
      id: createId('notif'),
      title: `Commission Settled (${waiter.name})`,
      message: `Paid ${formatTzs(settleAmt)} via ${method.replace('_', ' ').toUpperCase()} (Ref: ${ref}).`,
      type: 'payroll',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Settlements',
    });

    store.auditLogs.unshift({
      id: createId('aud'),
      actor: settledBy,
      actorRole: 'manager',
      action: 'COMMISSION_SETTLED',
      details: `Settled ${formatTzs(settleAmt)} waiter commission to ${waiter.name} via ${method} (${ref})`,
      timestamp: new Date().toISOString(),
    });

    storeRepo.commit();
    return payout;
  },

  addAdvanceRequest(
    branchId: string,
    employeeId: string,
    amount: number,
    reason: string,
    options?: { id?: string; autoApprove?: boolean; repaymentMonth?: string; approvedBy?: string; actorRole?: Role }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const emp = store.employees.find((e) => e.id === employeeId);
    if (!emp) throw new HttpError(404, `Employee "${employeeId}" not found.`, 'EMPLOYEE_NOT_FOUND');

    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (cleanAmount <= 0) throw new HttpError(422, 'Advance amount must be > 0.', 'VALIDATION_ERROR');

    const isAuto = options?.autoApprove !== false;
    const newAdv = {
      id: options?.id || createId('adv'),
      amount: cleanAmount,
      date: todayDateStr(),
      approved: isAuto,
      status: isAuto ? ('approved' as const) : ('pending' as const),
      reason: reason.trim() || 'Staff salary advance',
      approvedBy: isAuto ? options?.approvedBy || 'Manager' : undefined,
      repaymentMonth: options?.repaymentMonth || new Date().toISOString().slice(0, 7),
    };
    emp.advances.push(newAdv);

    store.auditLogs.unshift({
      id: createId('aud'),
      actor: options?.approvedBy || 'HR / Reception',
      actorRole: options?.actorRole || 'manager',
      action: isAuto ? 'SALARY_ADVANCE_APPROVED' : 'SALARY_ADVANCE_REQUESTED',
      details: `${emp.name}: ${formatTzs(cleanAmount)} (${newAdv.reason})`,
      timestamp: new Date().toISOString(),
    });
    storeRepo.commit();
    return newAdv;
  },

  approveAdvance(branchId: string, employeeId: string, advanceId: string, approvedBy = 'Manager') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const emp = store.employees.find((e) => e.id === employeeId);
    if (!emp) throw new HttpError(404, `Employee "${employeeId}" not found.`, 'EMPLOYEE_NOT_FOUND');
    const adv = emp.advances.find((a) => a.id === advanceId);
    if (!adv) throw new HttpError(404, `Advance "${advanceId}" not found.`, 'ADVANCE_NOT_FOUND');

    adv.approved = true;
    adv.status = 'approved';
    adv.approvedBy = approvedBy;
    store.auditLogs.unshift({
      id: createId('aud'),
      actor: approvedBy,
      actorRole: 'manager',
      action: 'SALARY_ADVANCE_APPROVED',
      details: `Approved ${formatTzs(adv.amount)} advance for ${emp.name}`,
      timestamp: new Date().toISOString(),
    });
    storeRepo.commit();
    return adv;
  },

  rejectAdvance(branchId: string, employeeId: string, advanceId: string, reason?: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const emp = store.employees.find((e) => e.id === employeeId);
    if (!emp) throw new HttpError(404, `Employee "${employeeId}" not found.`, 'EMPLOYEE_NOT_FOUND');
    const adv = emp.advances.find((a) => a.id === advanceId);
    if (!adv) throw new HttpError(404, `Advance "${advanceId}" not found.`, 'ADVANCE_NOT_FOUND');

    adv.approved = false;
    adv.status = 'rejected';
    if (reason) adv.reason = `${adv.reason} [Rejected: ${reason}]`;
    store.auditLogs.unshift({
      id: createId('aud'),
      actor: 'Manager',
      actorRole: 'manager',
      action: 'SALARY_ADVANCE_REJECTED',
      details: `Rejected ${formatTzs(adv.amount)} advance for ${emp.name}${reason ? ` (${reason})` : ''}`,
      timestamp: new Date().toISOString(),
    });
    storeRepo.commit();
    return adv;
  },

  markAdvanceRepaid(branchId: string, employeeId: string, advanceId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const emp = store.employees.find((e) => e.id === employeeId);
    if (!emp) throw new HttpError(404, `Employee "${employeeId}" not found.`, 'EMPLOYEE_NOT_FOUND');
    const adv = emp.advances.find((a) => a.id === advanceId);
    if (!adv) throw new HttpError(404, `Advance "${advanceId}" not found.`, 'ADVANCE_NOT_FOUND');

    adv.approved = false;
    adv.status = 'repaid';
    store.auditLogs.unshift({
      id: createId('aud'),
      actor: 'Cashier / HR',
      actorRole: 'cashier',
      action: 'SALARY_ADVANCE_REPAID',
      details: `${emp.name} repaid ${formatTzs(adv.amount)} advance in cash`,
      timestamp: new Date().toISOString(),
    });
    storeRepo.commit();
    return adv;
  },

  updateAdvance(branchId: string, employeeId: string, advanceId: string, amount: number, reason: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const emp = store.employees.find((e) => e.id === employeeId);
    if (!emp) throw new HttpError(404, `Employee "${employeeId}" not found.`, 'EMPLOYEE_NOT_FOUND');
    const adv = emp.advances.find((a) => a.id === advanceId);
    if (!adv) throw new HttpError(404, `Advance "${advanceId}" not found.`, 'ADVANCE_NOT_FOUND');

    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (cleanAmount <= 0) throw new HttpError(422, 'Amount must be > 0.', 'VALIDATION_ERROR');
    adv.amount = cleanAmount;
    adv.reason = reason.trim() || adv.reason;
    storeRepo.commit();
    return adv;
  },

  calculatePayroll(branchId: string, period = '2026-11') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return store.employees.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      employeeNumber: emp.employeeNumber,
      position: emp.position,
      ...calculateEmployeePayrollPure(
        emp.id,
        period,
        store.employees,
        store.waiters,
        store.orders,
        store.defaultCommissionMode,
        store.defaultCommissionValue,
        store.settledCommissionByWaiter,
        store.payrollPayments
      ),
    }));
  },

  recordPayrollPayment(
    branchId: string,
    params: {
      period: string;
      employeeIds: string[];
      method: 'bank_transfer' | 'mpesa' | 'cash';
      referencePrefix?: string;
      paidBy?: string;
    }
  ): PayrollPaymentRecord[] {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const nowIso = new Date().toISOString();
    const payer = params.paidBy || 'Branch Manager';
    const createdRecords: PayrollPaymentRecord[] = [];
    const settledEmpIds = new Set<string>();

    params.employeeIds.forEach((empId, idx) => {
      const emp = store.employees.find((e) => e.id === empId);
      if (!emp) return;
      const calc = calculateEmployeePayrollPure(
        empId,
        params.period,
        store.employees,
        store.waiters,
        store.orders,
        store.defaultCommissionMode,
        store.defaultCommissionValue,
        store.settledCommissionByWaiter,
        store.payrollPayments
      );
      if (calc.isPaidForPeriod) return;

      const rec: PayrollPaymentRecord = {
        id: `pay-${Date.now()}-${idx}`,
        period: params.period,
        employeeId: emp.id,
        employeeName: emp.name,
        basicSalary: calc.basicSalary,
        allowances: calc.allowances,
        commission: calc.commission,
        grossPay: calc.grossPay,
        nssfDeduction: calc.nssfDeduction,
        payeTax: calc.payeTax,
        advanceDeducted: calc.approvedAdvances,
        netPaid: calc.netPayable,
        method: params.method,
        reference: `${params.referencePrefix || 'PAY'}-${params.period}-${emp.employeeNumber}`,
        paidAt: nowIso,
        paidBy: payer,
      };
      createdRecords.push(rec);
      settledEmpIds.add(emp.id);
    });

    if (createdRecords.length > 0) {
      store.payrollPayments = [...createdRecords, ...store.payrollPayments];
      store.employees.forEach((emp) => {
        if (!settledEmpIds.has(emp.id)) return;
        const payRec = createdRecords.find((r) => r.employeeId === emp.id);
        emp.advances.forEach((adv) => {
          const st = adv.status || (adv.approved ? 'approved' : 'pending');
          if (st === 'approved') {
            adv.status = 'deducted';
            adv.deductedInPayrollId = payRec?.id;
          }
        });
      });

      const totalNet = createdRecords.reduce((s, r) => s + r.netPaid, 0);
      store.notifications.unshift({
        id: createId('notif'),
        title: `Payroll Settled (${params.period})`,
        message: `${createdRecords.length} staff payslips paid (${formatTzs(totalNet)}) via ${params.method
          .replace('_', ' ')
          .toUpperCase()}.`,
        type: 'payroll',
        timestamp: nowIso,
        read: false,
        actionRole: 'manager',
        actionLabel: 'View Payroll',
      });
      store.auditLogs.unshift({
        id: createId('aud'),
        actor: payer,
        actorRole: 'manager',
        action: 'PAYROLL_DISBURSED',
        details: `Settled ${createdRecords.length} payslips for ${params.period} totaling ${formatTzs(totalNet)} via ${params.method}`,
        timestamp: nowIso,
      });
      storeRepo.commit();
    }

    return createdRecords;
  },
};
