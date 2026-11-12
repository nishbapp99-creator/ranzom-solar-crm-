
const API_URL = "/odoo-api";

async function odooRequest(model, method, args = [], kwargs = {}) {
  const response = await fetch(`${API_URL}/web/dataset/call_kw/${model}/${method}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        model,
        method,
        args,
        kwargs,
      },
      id: Date.now(),
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.error.data?.message || "Odoo API request failed"
    );
  }

  return data.result;
}

export async function getEnquiries() {
  return odooRequest(
    "crm.lead",
    "search_read",
    [[]],
    {
      fields: [
        "id",
        "name",
        "contact_name",
        "phone",
        "email_from",
        "enquiry_source",
        "solar_customer_type",
        "solar_system_type",
        "solar_capacity",
        "solar_location",
        "monthly_electricity_bill",
        "solar_subsidy_required",
        "stage_id",
        "expected_revenue",
        "create_date",
      ],
      order: "create_date desc",
      limit: 100,
    }
  );
}

export async function createEnquiry(values) {
  return odooRequest(
    "crm.lead",
    "create",
    [values]
  );
}

export async function getFollowups() {
  return odooRequest(
    "ranzom.solar.followup",
    "search_read",
    [[]],
    {
      fields: [
        "id",
        "name",
        "lead_id",
        "followup_date",
        "assigned_to",
        "followup_type",
        "notes",
        "status",
        "next_followup_date",
      ],
      order: "followup_date desc",
      limit: 100,
    }
  );
}

export async function createFollowup(values) {
  return odooRequest(
    "ranzom.solar.followup",
    "create",
    [values]
  );
}
export async function getFollowupUsers() {
  return odooRequest(
    "res.users",
    "search_read",
    [[["active", "=", true]]],
    {
      fields: ["id", "name"],
      order: "name asc",
      limit: 100,
    }
  );
}

export async function updateFollowup(id, values) {
  return odooRequest(
    "ranzom.solar.followup",
    "write",
    [[id], values]
  );
}



// GET QUOTATIONS
export async function getQuotations() {
  return odooRequest(
    "sale.order",
    "search_read",
    [[]],
    {
      fields: [
        "id",
        "name",
        "partner_id",
        "state",
        "amount_total",
        "amount_untaxed",
        "order_line",
        "create_date",
      ],
      order: "create_date desc",
      limit: 100,
    }
  );
}

// GET CUSTOMERS
export async function getQuotationCustomers() {
  return odooRequest(
    "res.partner",
    "search_read",
    [[]],
    {
      fields: ["id", "name", "phone"],
      order: "name asc",
      limit: 200,
    }
  );
}

// GET PRODUCTS
export async function getQuotationProducts() {
  return odooRequest(
    "product.product",
    "search_read",
    [[["sale_ok", "=", true]]],
    {
      fields: ["id", "name", "list_price", "uom_id"],
      limit: 100,
    }
  );
}

// GET QUOTATION LINES
export async function getQuotationLines(orderIds) {
  if (!orderIds.length) return [];

  return odooRequest(
    "sale.order.line",
    "search_read",
    [[["order_id", "in", orderIds]]],
    {
      fields: [
        "id",
        "order_id",
        "name",
        "product_id",
        "price_unit",
        "discount",
        "display_type",
      ],
      limit: 500,
    }
  );
}

// CREATE QUOTATION
export async function createQuotation(values) {
  return odooRequest(
    "sale.order",
    "create",
    [values]
  );
}


export async function getCustomers() {
  return odooRequest(
    "res.partner",
    "search_read",
    [[]],
    {
      fields: [
        "id",
        "name",
        "phone",
        "street",
        "city",
        "email",
        "is_company",
        "company_type",
        "customer_rank",
        "comment",
      ],
      order: "name asc",
      limit: 200,
    }
  );
}

export async function createCustomer(values) {
  return odooRequest(
    "res.partner",
    "create",
    [values]
  );
}

// ================================
// INVENTORY
// ================================

// GET INVENTORY PRODUCTS WITH STOCK
export async function getInventoryProducts() {
  return odooRequest(
    "product.product",
    "search_read",
    [[]],
    {
      fields: [
        "id",
        "name",
        "default_code",
        "uom_id",
        "categ_id",
        "qty_available",
        "virtual_available",
        "incoming_qty",
        "outgoing_qty",
        "list_price",
        "active",
      ],
      order: "name asc",
      limit: 500,
    }
  );
}

// GET WAREHOUSES
export async function getWarehouses() {
  return odooRequest(
    "stock.warehouse",
    "search_read",
    [[]],
    {
      fields: [
        "id",
        "name",
        "code",
        "view_location_id",
      ],
      order: "name asc",
    }
  );
}

// GET STOCK LOCATIONS
export async function getStockLocations() {
  return odooRequest(
    "stock.location",
    "search_read",
    [[["usage", "=", "internal"]]],
    {
      fields: [
        "id",
        "name",
        "complete_name",
        "location_id",
        "warehouse_id",
      ],
      order: "complete_name asc",
      limit: 500,
    }
  );
}

// GET STOCK QUANTITIES
export async function getStockQuants() {
  return odooRequest(
    "stock.quant",
    "search_read",
    [[["location_id.usage", "=", "internal"]]],
    {
      fields: [
        "id",
        "product_id",
        "location_id",
        "quantity",
        "reserved_quantity",
        "available_quantity",
      ],
      limit: 1000,
    }
  );
}


// ========================================
// PURCHASE MANAGEMENT
// ========================================

// GET SUPPLIERS
export async function getSuppliers() {
  return odooRequest(
    "res.partner",
    "search_read",
    [[["supplier_rank", ">", 0]]],
    {
      fields: ["id", "name", "phone", "email", "street", "city"],
      order: "name asc",
      limit: 200,
    }
  );
}

// CREATE SUPPLIER

export async function createSupplier(values) {
  return odooRequest(
    "res.partner",
    "create",
    [{
      name: values.name,
      supplier_rank: 1,
      company_type: "company",
      phone: values.phone || false,
      email: values.email || false,
      street: values.street || false,
      city: values.city || false,
      is_company: true,
    }]
  );
}

// GET PURCHASE PRODUCTS
export async function getPurchaseProducts() {
  return odooRequest(
    "product.product",
    "search_read",
    [[["purchase_ok", "=", true]]],
    {
      fields: ["id", "name", "default_code", "uom_id", "list_price"],
      order: "name asc",
      limit: 200,
    }
  );
}

// GET PURCHASE ORDERS
export async function getPurchaseOrders() {
  return odooRequest(
    "purchase.order",
    "search_read",
    [[]],
    {
      fields: [
        "id", "name", "partner_id", "date_order",
        "state", "amount_total", "invoice_status",
        "order_line",
      ],
      order: "date_order desc",
      limit: 200,
    }
  );
}

// CREATE PURCHASE ORDER
export async function createPurchaseOrder(values) {
  return odooRequest("purchase.order", "create", [values]);
}

// CONFIRM PURCHASE ORDER
export async function confirmPurchaseOrder(id) {
  return odooRequest("purchase.order", "button_confirm", [[id]]);
}

// GET VENDOR BILLS
export async function getVendorBills() {
  return odooRequest(
    "account.move",
    "search_read",
    [[["move_type", "=", "in_invoice"]]],
    {
      fields: [
        "id", "name", "partner_id", "invoice_date",
        "invoice_date_due", "amount_total",
        "amount_residual", "state", "payment_state",
      ],
      order: "invoice_date desc",
      limit: 200,
    }
  );
}

// CREATE VENDOR BILL
export async function createVendorBill(values) {
  return odooRequest(
    "account.move",
    "create",
    [{
      move_type: "in_invoice",
      partner_id: Number(values.partner_id),
      invoice_date: values.invoice_date,
      invoice_date_due: values.invoice_date_due || false,
      ref: values.ref || false,

      invoice_line_ids: [
        [
          0,
          0,
          {
            product_id: Number(values.product_id),
            name: values.description || values.product_name,
            quantity: Number(values.quantity),
            price_unit: Number(values.price),
          },
        ],
      ],
    }]
  );
}

// POST VENDOR BILL
export async function postVendorBill(id) {
  return odooRequest(
    "account.move",
    "action_post",
    [[id]]
  );
}

// REGISTER VENDOR PAYMENT
export async function registerVendorPayment(id) {
  return odooRequest(
    "account.move",
    "action_register_payment",
    [[id]]
  );
}


// ========================================
// EMPLOYEE MANAGEMENT
// ========================================

// GET EMPLOYEES
export async function getEmployees() {
  return odooRequest(
    "hr.employee",
    "search_read",
    [[]],
    {
      fields: [
        "id", "name", "work_email", "work_phone",
        "department_id", "job_id", "active",
      ],
      order: "name asc",
      limit: 200,
    }
  );
}

// CREATE EMPLOYEE
export async function createEmployee(values) {
  return odooRequest("hr.employee", "create", [values]);
}

// GET DEPARTMENTS
export async function getDepartments() {
  return odooRequest(
    "hr.department",
    "search_read",
    [[]],
    {
      fields: ["id", "name", "parent_id", "manager_id"],
      order: "name asc",
      limit: 100,
    }
  );
}

// ========================================
// ATTENDANCE MANAGEMENT
// ========================================

// GET ATTENDANCE HISTORY
export async function getAttendance() {
  return odooRequest(
    "hr.attendance",
    "search_read",
    [[]],
    {
      fields: [
        "id", "employee_id", "check_in",
        "check_out", "worked_hours",
      ],
      order: "check_in desc",
      limit: 300,
    }
  );
}

// EMPLOYEE CHECK-IN
export async function employeeCheckIn(employeeId) {
  return odooRequest(
    "hr.attendance",
    "create",
    [{
      employee_id: employeeId,
      check_in: new Date().toISOString().slice(0, 19).replace("T", " "),
    }]
  );
}

// EMPLOYEE CHECK-OUT
export async function employeeCheckOut(attendanceId) {
  return odooRequest(
    "hr.attendance",
    "write",
    [[attendanceId], {
      check_out: new Date().toISOString().slice(0, 19).replace("T", " "),
    }]
  );
}


// Dashboard data: larger, dedicated reads so dashboard KPIs are not limited
// to the smaller page-level lists.
export async function getDashboardData() {
  const [enquiries, followups, quotations, invoices] = await Promise.all([
    odooRequest("crm.lead", "search_read", [[]], {
      fields: [
        "id", "name", "contact_name", "partner_name", "solar_location",
        "solar_customer_type", "solar_capacity", "stage_id",
        "expected_revenue", "create_date", "date_closed", "type",
      ],
      order: "create_date desc",
      limit: 2000,
    }),
    odooRequest("ranzom.solar.followup", "search_read", [[]], {
      fields: [
        "id", "name", "lead_id", "followup_date", "followup_type",
        "status", "next_followup_date",
      ],
      order: "followup_date desc",
      limit: 2000,
    }),
    odooRequest("sale.order", "search_read", [[]], {
      fields: ["id", "name", "partner_id", "state", "amount_total", "create_date"],
      order: "create_date desc",
      limit: 2000,
    }),
    odooRequest("account.move", "search_read", [[
      ["move_type", "=", "out_invoice"],
    ]], {
      fields: [
        "id", "name", "partner_id", "state", "payment_state",
        "amount_total", "amount_residual", "invoice_date", "create_date",
      ],
      order: "invoice_date desc",
      limit: 2000,
    }),
  ]);

  return { enquiries, followups, quotations, invoices };
}


// -----------------------------
// HR, CUSTOMER INVOICES & PAYMENTS
// -----------------------------
export async function getModelFields(model) {
  return odooRequest(model, "fields_get", [], {
    attributes: ["string", "type", "required", "readonly", "relation", "selection"],
  });
}

export async function getEmployeesSafe() {
  const meta = await getModelFields("hr.employee");
  const candidates = [
    "id", "name", "work_email", "work_phone", "department_id",
    "job_id", "job_title", "active", "first_contract_date", "work_contact_id",
  ];
  const fields = candidates.filter((field) => meta[field]);
  return odooRequest("hr.employee", "search_read", [[]], {
    fields, order: "name asc", limit: 500,
  });
}

export async function getDepartmentsSafe() {
  const meta = await getModelFields("hr.department");
  const fields = ["id", "name"].filter((field) => meta[field]);
  return odooRequest("hr.department", "search_read", [[]], {
    fields, order: "name asc", limit: 200,
  });
}

export async function getAttendanceSafe() {
  const meta = await getModelFields("hr.attendance");
  const fields = ["id", "employee_id", "check_in", "check_out", "worked_hours"]
    .filter((field) => meta[field]);
  return odooRequest("hr.attendance", "search_read", [[]], {
    fields, order: "check_in desc", limit: 500,
  });
}

export async function getCustomerInvoices() {
  const meta = await getModelFields("account.move");
  const candidates = [
    "id", "name", "ref", "partner_id", "state", "payment_state",
    "amount_total", "amount_residual", "invoice_date", "invoice_date_due",
    "currency_id", "move_type",
  ];
  const fields = candidates.filter((field) => meta[field]);
  return odooRequest("account.move", "search_read", [[["move_type", "=", "out_invoice"]]], {
    fields, order: "invoice_date desc, id desc", limit: 500,
  });
}

export async function getInvoiceCustomers() {
  return odooRequest("res.partner", "search_read", [[["customer_rank", ">", 0]]], {
    fields: ["id", "name", "email", "phone"], order: "name asc", limit: 500,
  });
}

export async function createCustomerInvoice({ partnerId, invoiceDate, dueDate, lines, narration }) {
  const invoiceLines = lines.map((line) => [0, 0, {
    name: line.name,
    product_id: Number(line.product_id),
    quantity: Number(line.quantity || 1),
    price_unit: Number(line.price_unit || 0),
  }]);
  return odooRequest("account.move", "create", [{
    move_type: "out_invoice",
    partner_id: Number(partnerId),
    invoice_date: invoiceDate,
    invoice_date_due: dueDate || invoiceDate,
    invoice_line_ids: invoiceLines,
    ...(narration ? { narration } : {}),
  }]);
}

export async function postCustomerInvoice(id) {
  return odooRequest("account.move", "action_post", [[Number(id)]]);
}

export async function getPaymentRecords() {
  const meta = await getModelFields("account.payment");
  const candidates = [
    "id", "name", "date", "amount", "partner_id", "payment_type",
    "partner_type", "state", "ref", "journal_id", "currency_id",
  ];
  const fields = candidates.filter((field) => meta[field]);
  return odooRequest("account.payment", "search_read", [[]], {
    fields, order: "date desc, id desc", limit: 500,
  });
}

export async function getPaymentJournals() {
  return odooRequest("account.journal", "search_read", [[["type", "in", ["bank", "cash"]], ["active", "=", true]]], {
    fields: ["id", "name", "type", "currency_id"], order: "name asc", limit: 100,
  });
}

export async function createPaymentRecord({ partnerId, amount, date, journalId, paymentType, partnerType, ref }) {
  const meta = await getModelFields("account.payment");
  const values = {
    payment_type: paymentType,
    partner_type: partnerType,
    partner_id: Number(partnerId),
    amount: Number(amount),
    date,
    journal_id: Number(journalId),
    ...(ref ? { ref } : {}),
  };
  const allowed = Object.keys(values).filter((field) => meta[field]);
  const missing = Object.keys(values).filter((field) => !meta[field]);
  if (missing.length) throw new Error(`Your Odoo payment model does not expose: ${missing.join(", ")}`);
  const id = await odooRequest("account.payment", "create", [Object.fromEntries(allowed.map((field) => [field, values[field]]))]);
  await odooRequest("account.payment", "action_post", [[id]]);
  return id;
}

export async function getPayrollOverview() {
  const models = ["hr.payslip", "hr.payroll.structure", "hr.salary.rule", "hr.version"];
  const metadata = {};
  await Promise.all(models.map(async (model) => {
    try { metadata[model] = await getModelFields(model); }
    catch (error) { metadata[model] = { __error: error.message }; }
  }));
  const payslipFields = metadata["hr.payslip"] || {};
  let payslips = [];
  let structures = [];
  let salaryRules = [];
  const structureMeta = metadata["hr.payroll.structure"] || {};
  const ruleMeta = metadata["hr.salary.rule"] || {};
  if (!structureMeta.__error) {
    const structureReadFields = ["id", "name", "code"].filter((field) => structureMeta[field]);
    if (structureReadFields.includes("id")) {
      structures = await odooRequest("hr.payroll.structure", "search_read", [[]], {
        fields: structureReadFields, order: "name asc", limit: 100,
      });
    }
  }
  if (!ruleMeta.__error) {
    const ruleReadFields = ["id", "name", "code", "sequence", "category_id", "active"].filter((field) => ruleMeta[field]);
    if (ruleReadFields.includes("id")) {
      salaryRules = await odooRequest("hr.salary.rule", "search_read", [[]], {
        fields: ruleReadFields, order: "sequence asc, name asc", limit: 200,
      });
    }
  }
  if (!payslipFields.__error) {
    const candidates = [
      "id", "name", "number", "employee_id", "date_from", "date_to",
      "state", "struct_id", "version_id", "net_wage", "total_net",
      "total", "company_id",
    ];
    const fields = candidates.filter((field) => payslipFields[field]);
    if (fields.includes("id")) {
      payslips = await odooRequest("hr.payslip", "search_read", [[]], {
        fields, order: "date_from desc, id desc", limit: 300,
      });
    }
  }
  return { metadata, payslips, structures, salaryRules };
}
