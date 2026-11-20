export function getOpenApiSpec(serverUrl = '') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'RestaurantOS Multi-Tenant SaaS ERP API',
      version: '1.0.0',
      description:
        'Schema-validated modular REST API powering RestaurantOS: System Provider Governance, Multi-Tenant HQ Control, Cashier POS & KDS, QR Customer/Waiter Portals, Inventory & Recursive BOM Production, Catering, Daily Variance Reconciliation, and TRA-Compliant HR & Payroll.',
    },
    servers: serverUrl ? [{ url: `${serverUrl}/api/v1` }] : [{ url: '/api/v1' }],
    tags: [
      { name: 'System', description: 'Health, bootstrap hydration, and seed reset' },
      { name: 'Auth & Public', description: 'Authentication, tenant self-registration, public plans, and sales leads' },
      { name: 'Provider Control', description: 'SaaS provider tenant governance, plans catalog, user accounts, and leads' },
      { name: 'HQ & Branches', description: 'Multi-branch management, HQ overview analytics, inter-branch transfers, and email workspace' },
      { name: 'POS & Orders', description: 'Order lifecycle, KDS, split payments/refunds, commissions, approvals, tables, and alerts' },
      { name: 'Menu', description: 'Branch menu catalog CRUD and item availability toggles' },
      { name: 'Inventory & BOM', description: 'Ingredients, stock lots (FEFO), store-kitchen transfers, recipes, and BOM scaling' },
      { name: 'Production & Catering', description: 'Batch cooking, production orders, purchase requests, catering, and daily reconciliation' },
      { name: 'HR & Payroll', description: 'Employee onboarding, waiter commissions, salary advances, and TRA PAYE/NSSF payroll' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'API health check',
          responses: { '200': { description: 'Service healthy with tenant/branch counts' } },
        },
      },
      '/bootstrap': {
        get: {
          tags: ['System'],
          summary: 'Fetch full initial multi-tenant platform state for client hydration',
          responses: { '200': { description: 'Complete PlatformState payload' } },
        },
      },
      '/reset': {
        post: {
          tags: ['System'],
          summary: 'Reset persisted server state back to initial SaaS seed dataset',
          responses: { '200': { description: 'Reset confirmation and fresh state' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth & Public'],
          summary: 'Authenticate SaaS account by email & password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Authenticated account + surface routing context' },
            '401': { description: 'Invalid credentials' },
            '403': { description: 'Pending/suspended account or suspended tenant' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth & Public'],
          summary: 'Self-service restaurant organization onboarding & trial provisioning',
          responses: { '201': { description: 'Created organization, HQ branch, starter store, and owner account' } },
        },
      },
      '/auth/quick-launch': {
        post: {
          tags: ['Auth & Public'],
          summary: 'Demo preset login (provider, savanna_hq, kona_hq, cashier_pos)',
          responses: { '200': { description: 'Preset session details' } },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth & Public'],
          summary: 'Sign out current session',
          responses: { '200': { description: 'Signed out' } },
        },
      },
      '/public/plans': {
        get: {
          tags: ['Auth & Public'],
          summary: 'List active public SaaS pricing plans',
          responses: { '200': { description: 'Array of SaasPlanDefinition' } },
        },
      },
      '/public/leads': {
        post: {
          tags: ['Auth & Public'],
          summary: 'Submit public sales/demo inquiry lead',
          responses: { '201': { description: 'Created PlatformLeadInquiry' } },
        },
      },
      '/provider/overview': {
        get: {
          tags: ['Provider Control'],
          summary: 'Get provider KPIs, tenant summaries, plans, accounts, leads, and audit log',
          responses: { '200': { description: 'Provider overview payload' } },
        },
      },
      '/provider/tenants': {
        post: {
          tags: ['Provider Control'],
          summary: 'Provision a new restaurant tenant organization',
          responses: { '201': { description: 'Provisioned org, branch, and owner account' } },
        },
      },
      '/provider/tenants/{orgId}/status': {
        patch: {
          tags: ['Provider Control'],
          summary: 'Update tenant status (active, trial, suspended)',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated organization' } },
        },
      },
      '/provider/tenants/{orgId}/plan': {
        patch: {
          tags: ['Provider Control'],
          summary: 'Upgrade or downgrade tenant subscription plan',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated organization' } },
        },
      },
      '/provider/tenants/{orgId}/billing-paid': {
        post: {
          tags: ['Provider Control'],
          summary: 'Record monthly billing payment for tenant',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated billing & active status' } },
        },
      },
      '/provider/tenants/{orgId}/inspect': {
        post: {
          tags: ['Provider Control'],
          summary: 'Log provider inspection session on tenant workspace',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Target organization and audit entry' } },
        },
      },
      '/provider/plans': {
        post: {
          tags: ['Provider Control'],
          summary: 'Create new SaaS subscription plan',
          responses: { '201': { description: 'Created plan' } },
        },
      },
      '/provider/plans/{planId}': {
        patch: {
          tags: ['Provider Control'],
          summary: 'Update plan quotas, fees, or features',
          parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated plan' } },
        },
      },
      '/provider/plans/{planId}/visibility': {
        post: {
          tags: ['Provider Control'],
          summary: 'Toggle public landing page visibility for plan',
          parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated plan' } },
        },
      },
      '/provider/plans/{planId}/status': {
        post: {
          tags: ['Provider Control'],
          summary: 'Toggle active/archived status for plan',
          parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated plan' } },
        },
      },
      '/provider/accounts': {
        post: {
          tags: ['Provider Control'],
          summary: 'Create platform or tenant user account',
          responses: { '201': { description: 'Created account' } },
        },
      },
      '/provider/accounts/{accountId}/status': {
        patch: {
          tags: ['Provider Control'],
          summary: 'Approve, suspend, or reactivate user account',
          parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated account' } },
        },
      },
      '/provider/accounts/{accountId}/role': {
        patch: {
          tags: ['Provider Control'],
          summary: 'Change user account role',
          parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated account' } },
        },
      },
      '/provider/accounts/{accountId}/password': {
        patch: {
          tags: ['Provider Control'],
          summary: 'Reset user account password',
          parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated account' } },
        },
      },
      '/provider/leads/{leadId}/convert': {
        post: {
          tags: ['Provider Control'],
          summary: 'Convert qualified sales lead into a provisioned trial tenant',
          parameters: [{ name: 'leadId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Conversion result' } },
        },
      },
      '/orgs/{orgId}/branches': {
        get: {
          tags: ['HQ & Branches'],
          summary: 'List branches and quota status for organization',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Branches and quota summary' } },
        },
        post: {
          tags: ['HQ & Branches'],
          summary: 'Create a new branch within organization plan quota',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created RestaurantTenant branch' } },
        },
      },
      '/orgs/{orgId}/branches/{branchId}/toggle-status': {
        post: {
          tags: ['HQ & Branches'],
          summary: 'Toggle branch active/paused operational status',
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated branch' } },
        },
      },
      '/orgs/{orgId}/hq/overview': {
        get: {
          tags: ['HQ & Branches'],
          summary: 'Get consolidated multi-branch HQ metrics, orders, approvals, and procurement',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'HQ overview payload' } },
        },
      },
      '/orgs/{orgId}/hq/approvals/{branchId}/{requestId}/review': {
        post: {
          tags: ['HQ & Branches'],
          summary: 'HQ approve or reject a branch manager approval request',
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated approval decision' } },
        },
      },
      '/orgs/{orgId}/hq/transfers': {
        post: {
          tags: ['HQ & Branches'],
          summary: 'Dispatch immediate inter-branch ingredient stock transfer',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Transfer confirmation' } },
        },
      },
      '/orgs/{orgId}/hq/purchase-requests/{branchId}/{requestId}': {
        patch: {
          tags: ['HQ & Branches'],
          summary: 'Update procurement purchase request status from HQ',
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated purchase request' } },
        },
      },
      '/orgs/{orgId}/emails': {
        get: {
          tags: ['HQ & Branches'],
          summary: 'List organization or branch-scoped internal/external emails',
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'branchId', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Email messages' } },
        },
        post: {
          tags: ['HQ & Branches'],
          summary: 'Send email or broadcast HQ directive to all branches',
          parameters: [{ name: 'orgId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created sent EmailMessage' } },
        },
      },
      '/orgs/{orgId}/emails/{branchId}/{emailId}/read': {
        patch: {
          tags: ['HQ & Branches'],
          summary: 'Mark email as read/unread',
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'emailId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated email' } },
        },
      },
      '/orgs/{orgId}/emails/{branchId}/{emailId}/star': {
        post: {
          tags: ['HQ & Branches'],
          summary: 'Toggle star flag on email',
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'emailId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated email' } },
        },
      },
      '/orgs/{orgId}/emails/{branchId}/{emailId}': {
        delete: {
          tags: ['HQ & Branches'],
          summary: 'Delete email from branch mailbox',
          parameters: [
            { name: 'orgId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'emailId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Deletion confirmation' } },
        },
      },
      '/branches/{branchId}/orders': {
        get: {
          tags: ['POS & Orders'],
          summary: 'List all orders for branch',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Orders list' } },
        },
        post: {
          tags: ['POS & Orders'],
          summary: 'Create POS / Waiter / Customer order or save as draft (triggers BOM policy & table occupancy)',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created or updated Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/dispatch': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Send draft order to kitchen display system',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Dispatched Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/status': {
        patch: {
          tags: ['POS & Orders'],
          summary: 'Advance order KDS/service status (deducts BOM stock on kitchen start)',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/fast-forward': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Waiter fast-forward active order directly to served',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Fast-forward result' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/items/{itemIndex}/status': {
        patch: {
          tags: ['POS & Orders'],
          summary: 'Update individual order line status in KDS',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'itemIndex', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'Updated Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/items/{itemIndex}/reject': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Reject individual order item from kitchen and adjust order total',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'itemIndex', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'Updated Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/payments': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Record payment or refund against an order (updates cashier shift & releases paid dine-in table)',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Order and cashier shift state' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/commission': {
        patch: {
          tags: ['POS & Orders'],
          summary: 'Override waiter commission rule on specific order',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/waiter': {
        patch: {
          tags: ['POS & Orders'],
          summary: 'Assign or reassign serving waiter on order',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/cancel': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Controlled order cancellation with reason and audit trail',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Cancelled Order' } },
        },
      },
      '/branches/{branchId}/orders/{orderId}/items/{itemIndex}/promote': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Promote custom POS line item into permanent branch MenuItem catalog',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'itemIndex', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: { '201': { description: 'Promoted MenuItem' } },
        },
      },
      '/branches/{branchId}/approvals': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Submit manager approval request (discount, void, cancel, refund)',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created ApprovalRequest' } },
        },
      },
      '/branches/{branchId}/approvals/{requestId}/review': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Approve or reject sensitive POS request',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Reviewed ApprovalRequest' } },
        },
      },
      '/branches/{branchId}/discrepancies': {
        get: {
          tags: ['POS & Orders'],
          summary: 'Compute live operational discrepancy alerts for branch',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'List of DiscrepancyAlert' } },
        },
      },
      '/branches/{branchId}/cart': {
        put: {
          tags: ['POS & Orders'],
          summary: 'Sync active terminal shopping cart',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated cart' } },
        },
      },
      '/branches/{branchId}/settings': {
        patch: {
          tags: ['POS & Orders'],
          summary: 'Update branch tax, commission policy, and BOM deduction policy settings',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated settings' } },
        },
      },
      '/branches/{branchId}/tables': {
        get: {
          tags: ['POS & Orders'],
          summary: 'List branch dining tables',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Tables list' } },
        },
        post: {
          tags: ['POS & Orders'],
          summary: 'Add new dining table to floor plan',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created Table' } },
        },
      },
      '/branches/{branchId}/tables/{tableId}': {
        patch: {
          tags: ['POS & Orders'],
          summary: 'Update table capacity, zone, status, or assigned waiter',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'tableId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Table' } },
        },
        delete: {
          tags: ['POS & Orders'],
          summary: 'Remove dining table',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'tableId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Deletion confirmation' } },
        },
      },
      '/branches/{branchId}/tables/{tableId}/release': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Release table back to available status',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'tableId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Released Table' } },
        },
      },
      '/branches/{branchId}/notifications': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Create branch notification alert',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created notification' } },
        },
      },
      '/branches/{branchId}/notifications/{notificationId}/read': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Mark notification read',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'notificationId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated notification' } },
        },
      },
      '/branches/{branchId}/notifications/read-all': {
        post: {
          tags: ['POS & Orders'],
          summary: 'Mark all branch notifications read',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Success' } },
        },
      },
      '/branches/{branchId}/notifications/{notificationId}': {
        delete: {
          tags: ['POS & Orders'],
          summary: 'Clear single notification',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'notificationId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Success' } },
        },
      },
      '/branches/{branchId}/menu': {
        get: {
          tags: ['Menu'],
          summary: 'List branch menu catalog',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Menu items list' } },
        },
        post: {
          tags: ['Menu'],
          summary: 'Create menu item',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created MenuItem' } },
        },
      },
      '/branches/{branchId}/menu/{itemId}': {
        patch: {
          tags: ['Menu'],
          summary: 'Update menu item details, pricing, portions, or modifiers',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated MenuItem' } },
        },
        delete: {
          tags: ['Menu'],
          summary: 'Delete menu item',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Success' } },
        },
      },
      '/branches/{branchId}/menu/{itemId}/toggle-availability': {
        post: {
          tags: ['Menu'],
          summary: 'Toggle menu item availability flag',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated MenuItem' } },
        },
      },
      '/branches/{branchId}/inventory': {
        get: {
          tags: ['Inventory & BOM'],
          summary: 'Get complete branch inventory, lots, recipes, production, catering, and reconciliation state',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Inventory overview' } },
        },
      },
      '/branches/{branchId}/ingredients': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Add new ingredient master item',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created Ingredient' } },
        },
      },
      '/branches/{branchId}/ingredients/{ingredientId}/stock': {
        patch: {
          tags: ['Inventory & BOM'],
          summary: 'Manual stock delta adjustment',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'ingredientId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Ingredient' } },
        },
      },
      '/branches/{branchId}/ingredients/{ingredientId}/intake': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Record supplier stock intake with weighted-average costing and FEFO batch lot',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'ingredientId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '201': { description: 'Updated Ingredient, lot, and movement' } },
        },
      },
      '/branches/{branchId}/ingredients/{ingredientId}/wastage': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Record kitchen or main store spoilage/wastage',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'ingredientId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '201': { description: 'Updated Ingredient and wastage movement' } },
        },
      },
      '/branches/{branchId}/ingredients/{ingredientId}/direct-consumption': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Record non-BOM direct consumption (e.g., packaged drinks)',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'ingredientId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '201': { description: 'Consumption recorded' } },
        },
      },
      '/branches/{branchId}/transfers': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Transfer stock between Main Store and Kitchen Line',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Transfer movement recorded' } },
        },
      },
      '/branches/{branchId}/transfers/{movementId}/confirm': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Chef confirms receipt of in-transit store transfer',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'movementId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Confirmed' } },
        },
      },
      '/branches/{branchId}/transfers/{movementId}/reject': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Reject in-transit transfer and return stock to Main Store',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'movementId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Rejected' } },
        },
      },
      '/branches/{branchId}/transfers/return-all-kitchen': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Return all remaining kitchen line balances back to Main Store at end of day',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'EOD return completed' } },
        },
      },
      '/branches/{branchId}/recipes': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Create or version-update BOM Recipe',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Saved Recipe' } },
        },
      },
      '/branches/{branchId}/recipes/{recipeId}': {
        delete: {
          tags: ['Inventory & BOM'],
          summary: 'Delete BOM Recipe',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'recipeId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Deleted' } },
        },
      },
      '/branches/{branchId}/recipes/{recipeId}/status': {
        patch: {
          tags: ['Inventory & BOM'],
          summary: 'Update recipe governance lifecycle status (draft -> approved -> archived)',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'recipeId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Recipe' } },
        },
      },
      '/branches/{branchId}/bom/cost/{recipeId}': {
        get: {
          tags: ['Inventory & BOM'],
          summary: 'Compute live recursive batch and per-plate BOM cost',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'recipeId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Cost breakdown' } },
        },
      },
      '/branches/{branchId}/bom/scale': {
        post: {
          tags: ['Inventory & BOM'],
          summary: 'Calculate scaled multi-dish ingredient & sub-recipe requirements',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'ScaledRequirementsResult' } },
        },
      },
      '/branches/{branchId}/production/validate': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Validate kitchen stock readiness for batch production',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Validation summary with missing items' } },
        },
      },
      '/branches/{branchId}/production/cook': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Execute batch cooking (deducts kitchen stock/sub-recipes & credits prepared plates pool)',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Production result and log' } },
        },
      },
      '/branches/{branchId}/production/{logId}/reverse': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Reverse a batch production log and restore deducted stock',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'logId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Reversal result' } },
        },
      },
      '/branches/{branchId}/production/leftovers': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Handle leftover prepared plates (carry over or record waste)',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated pool' } },
        },
      },
      '/branches/{branchId}/production/blocked-attempts': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Log blocked batch cooking attempt due to insufficient stock',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Logged attempt' } },
        },
      },
      '/branches/{branchId}/production/requisition-missing': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Auto-issue missing ingredients from Main Store to Kitchen Line',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Requisition confirmation' } },
        },
      },
      '/branches/{branchId}/production-orders': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Schedule production order',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created ProductionOrder' } },
        },
      },
      '/branches/{branchId}/production-orders/{orderId}/stage': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Advance production order workflow stage',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Stage transition result' } },
        },
      },
      '/branches/{branchId}/production-orders/{orderId}/cancel': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Cancel production order and release reservations',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Cancelled ProductionOrder' } },
        },
      },
      '/branches/{branchId}/purchase-requests': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Create procurement purchase request for shortage',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created PurchaseRequest' } },
        },
      },
      '/branches/{branchId}/purchase-requests/{requestId}': {
        patch: {
          tags: ['Production & Catering'],
          summary: 'Update purchase request status',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated PurchaseRequest' } },
        },
      },
      '/branches/{branchId}/branch-transfers': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Request inter-branch stock transfer for shortage',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created BranchTransferRequest' } },
        },
      },
      '/branches/{branchId}/branch-transfers/{transferId}/receive': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Receive inter-branch stock transfer into Main Store',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'transferId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Received transfer' } },
        },
      },
      '/branches/{branchId}/catering-orders': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Create corporate/wedding/event catering order',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created CateringOrder' } },
        },
      },
      '/branches/{branchId}/catering-orders/{orderId}/reserve': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Reserve scaled ingredients for catering event',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Reservation result' } },
        },
      },
      '/branches/{branchId}/catering-orders/{orderId}/production-plan': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Generate linked production orders for catering order items',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '201': { description: 'Created ProductionOrders' } },
        },
      },
      '/branches/{branchId}/catering-orders/{orderId}/fulfillment': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Record catering fulfillment quantities and status',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated CateringOrder' } },
        },
      },
      '/branches/{branchId}/catering-orders/{orderId}/amend': {
        patch: {
          tags: ['Production & Catering'],
          summary: 'Amend catering headcount/items with audit history',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Amended CateringOrder' } },
        },
      },
      '/branches/{branchId}/catering-orders/{orderId}/invoice': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Generate final catering invoice number',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Invoice number and updated order' } },
        },
      },
      '/branches/{branchId}/reconciliation/recompute': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Recompute expected closing balances and variance across ingredients',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Reconciliations list' } },
        },
      },
      '/branches/{branchId}/reconciliation/{ingredientId}': {
        patch: {
          tags: ['Production & Catering'],
          summary: 'Record physical closing stock count for ingredient',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'ingredientId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated reconciliation row' } },
        },
      },
      '/branches/{branchId}/reconciliation/commit': {
        post: {
          tags: ['Production & Catering'],
          summary: 'Commit daily variance audit to stock ledger',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Total variance cost committed' } },
        },
      },
      '/branches/{branchId}/hr': {
        get: {
          tags: ['HR & Payroll'],
          summary: 'Get employees, waiters, commission payouts, and payroll payments',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'HR overview payload' } },
        },
      },
      '/branches/{branchId}/employees': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Onboard new employee (auto-links Waiter profile when role is waiter)',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created Employee' } },
        },
      },
      '/branches/{branchId}/employees/{employeeId}': {
        patch: {
          tags: ['HR & Payroll'],
          summary: 'Update employee profile, salary, or status',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Employee' } },
        },
      },
      '/branches/{branchId}/waiters/{waiterId}/toggle-active': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Toggle waiter shift active availability',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'waiterId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated Waiter' } },
        },
      },
      '/branches/{branchId}/waiters/{waiterId}/stats': {
        get: {
          tags: ['HR & Payroll'],
          summary: 'Compute waiter sales, pending commission, and payout stats',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'waiterId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Waiter stats' } },
        },
      },
      '/branches/{branchId}/waiters/{waiterId}/settle-commission': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Disburse earned waiter commission payout',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'waiterId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '201': { description: 'Commission payout record' } },
        },
      },
      '/branches/{branchId}/employees/{employeeId}/advances': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Create salary advance request',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '201': { description: 'Created advance request' } },
        },
      },
      '/branches/{branchId}/employees/{employeeId}/advances/{advanceId}/approve': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Approve salary advance request',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'advanceId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Approved advance' } },
        },
      },
      '/branches/{branchId}/employees/{employeeId}/advances/{advanceId}/reject': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Reject salary advance request',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'advanceId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Rejected advance' } },
        },
      },
      '/branches/{branchId}/employees/{employeeId}/advances/{advanceId}/repay': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Mark salary advance as repaid',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'advanceId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Repaid advance' } },
        },
      },
      '/branches/{branchId}/employees/{employeeId}/advances/{advanceId}': {
        patch: {
          tags: ['HR & Payroll'],
          summary: 'Edit pending/approved salary advance amount or reason',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'employeeId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'advanceId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated advance' } },
        },
      },
      '/branches/{branchId}/payroll/calculate': {
        get: {
          tags: ['HR & Payroll'],
          summary: 'Compute monthly gross pay, 10% NSSF, TRA PAYE brackets, and net payable for all branch staff',
          parameters: [
            { name: 'branchId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'period', in: 'query', required: false, schema: { type: 'string', default: '2026-11' } },
          ],
          responses: { '200': { description: 'Payroll breakdown per employee' } },
        },
      },
      '/branches/{branchId}/payroll/pay': {
        post: {
          tags: ['HR & Payroll'],
          summary: 'Disburse payroll batch and settle covered advances',
          parameters: [{ name: 'branchId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '201': { description: 'Created PayrollPaymentRecord list' } },
        },
      },
    },
  };
}

export function renderSwaggerDocsHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RestaurantOS API Docs — OpenAPI / Swagger</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; font-family: system-ui, -apple-system, sans-serif; }
      .topbar { display: none !important; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: 1,
        });
      };
    </script>
  </body>
</html>`;
}
