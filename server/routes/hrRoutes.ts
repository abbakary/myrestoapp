import { Router } from 'express';
import type { Employee } from '../../src/types/restaurant.ts';
import {
  asRecord,
  asyncHandler,
  optionalBoolean,
  optionalEnum,
  optionalString,
  requireArray,
  requireEnum,
  requireNumber,
  requireString,
} from '../core/http.ts';
import { hrService } from '../services/hrService.ts';

export const hrRoutes = Router();

hrRoutes.get(
  '/branches/:branchId/hr',
  asyncHandler(async (req, res) => {
    res.json(hrService.listHrOverview(String(req.params.branchId)));
  })
);

hrRoutes.post(
  '/branches/:branchId/employees',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const created = hrService.addEmployee(
      String(req.params.branchId),
      body as Omit<Employee, 'id' | 'employeeNumber' | 'advances'> & { id?: string; waiterId?: string }
    );
    res.status(201).json(created);
  })
);

hrRoutes.patch(
  '/branches/:branchId/employees/:employeeId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      hrService.updateEmployee(
        String(req.params.branchId),
        String(req.params.employeeId),
        body as Partial<Employee>
      )
    );
  })
);

hrRoutes.post(
  '/branches/:branchId/waiters/:waiterId/toggle-active',
  asyncHandler(async (req, res) => {
    res.json(
      hrService.toggleWaiterActive(String(req.params.branchId), String(req.params.waiterId))
    );
  })
);

hrRoutes.get(
  '/branches/:branchId/waiters/:waiterId/stats',
  asyncHandler(async (req, res) => {
    res.json(
      hrService.getWaiterStats(String(req.params.branchId), String(req.params.waiterId))
    );
  })
);

hrRoutes.post(
  '/branches/:branchId/waiters/:waiterId/settle-commission',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.status(201).json(
      hrService.settleWaiterCommission(
        String(req.params.branchId),
        String(req.params.waiterId),
        body.amount !== undefined ? requireNumber(body, 'amount', { min: 0 }) : undefined,
        {
          method: optionalEnum(body, 'method', ['cash', 'mpesa', 'bank_transfer']),
          reference: optionalString(body, 'reference'),
          settledBy: optionalString(body, 'settledBy'),
        }
      )
    );
  })
);

hrRoutes.post(
  '/branches/:branchId/employees/:employeeId/advances',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const adv = hrService.addAdvanceRequest(
      String(req.params.branchId),
      String(req.params.employeeId),
      requireNumber(body, 'amount', { min: 1 }),
      optionalString(body, 'reason') || 'Salary advance',
      {
        id: optionalString(body, 'id'),
        autoApprove: optionalBoolean(body, 'autoApprove'),
        repaymentMonth: optionalString(body, 'repaymentMonth'),
        approvedBy: optionalString(body, 'approvedBy'),
      }
    );
    res.status(201).json(adv);
  })
);

hrRoutes.post(
  '/branches/:branchId/employees/:employeeId/advances/:advanceId/approve',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      hrService.approveAdvance(
        String(req.params.branchId),
        String(req.params.employeeId),
        String(req.params.advanceId),
        optionalString(body, 'approvedBy')
      )
    );
  })
);

hrRoutes.post(
  '/branches/:branchId/employees/:employeeId/advances/:advanceId/reject',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      hrService.rejectAdvance(
        String(req.params.branchId),
        String(req.params.employeeId),
        String(req.params.advanceId),
        optionalString(body, 'reason')
      )
    );
  })
);

hrRoutes.post(
  '/branches/:branchId/employees/:employeeId/advances/:advanceId/repay',
  asyncHandler(async (req, res) => {
    res.json(
      hrService.markAdvanceRepaid(
        String(req.params.branchId),
        String(req.params.employeeId),
        String(req.params.advanceId)
      )
    );
  })
);

hrRoutes.patch(
  '/branches/:branchId/employees/:employeeId/advances/:advanceId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      hrService.updateAdvance(
        String(req.params.branchId),
        String(req.params.employeeId),
        String(req.params.advanceId),
        requireNumber(body, 'amount', { min: 1 }),
        requireString(body, 'reason')
      )
    );
  })
);

hrRoutes.get(
  '/branches/:branchId/payroll/calculate',
  asyncHandler(async (req, res) => {
    const period = typeof req.query.period === 'string' ? req.query.period : '2026-11';
    res.json(hrService.calculatePayroll(String(req.params.branchId), period));
  })
);

hrRoutes.post(
  '/branches/:branchId/payroll/pay',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const records = hrService.recordPayrollPayment(String(req.params.branchId), {
      period: requireString(body, 'period'),
      employeeIds: requireArray<string>(body, 'employeeIds'),
      method: requireEnum(body, 'method', ['bank_transfer', 'mpesa', 'cash']),
      referencePrefix: optionalString(body, 'referencePrefix'),
      paidBy: optionalString(body, 'paidBy'),
    });
    res.status(201).json(records);
  })
);
