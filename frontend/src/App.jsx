import {
  getEnquiries,
  createEnquiry,
  getFollowups,
  createFollowup,
  getFollowupUsers,
  updateFollowup,
  getQuotations,
  getQuotationCustomers,
  getQuotationProducts,
  getQuotationLines,
  createQuotation,
  getCustomers,
  createCustomer,
  getInventoryProducts,
  getWarehouses,
  getSuppliers,
  createSupplier,
  getPurchaseProducts,
  getPurchaseOrders,
  createPurchaseOrder,
  confirmPurchaseOrder,
  getVendorBills,
  createVendorBill,
  getEmployeesSafe,
  getDepartmentsSafe,
  getAttendanceSafe,
  employeeCheckIn,
  employeeCheckOut,
  createEmployee,
  getModelFields,
  getCustomerInvoices,
  getInvoiceCustomers,
  createCustomerInvoice,
  postCustomerInvoice,
  getPaymentRecords,
  getPaymentJournals,
  createPaymentRecord,
  getPayrollOverview,
  getDashboardData,
  updateOdooRecord,
  deleteOdooRecord,
} from "./odooApi";
import Login from "./Login";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import "./App.css";

const navigation = [
  { title: "OVERVIEW", items: ["Dashboard"] },
  {
    title: "SALES MANAGEMENT",
    items: ["Enquiries", "Follow-ups", "Sales", "Quotations", "Customers"],
  },
  {
    title: "OPERATIONS",
    items: ["Projects", "Site Visits", "Installations", "Products", "Inventory"],
  },
  {
    title: "PROCUREMENT",
    items: ["Suppliers", "Purchase Orders", "Vendor Bills"],
  },
  {
    title: "HUMAN RESOURCES",
    items: ["Employees", "Attendance", "Payroll"],
  },
  { title: "FINANCE", items: ["Invoices", "Payments", "Reports"] },
];

const navigationIcons = {
  Dashboard: "▦", Enquiries: "⌕", "Follow-ups": "◷", Sales: "↗", Products: "▣", Customers: "♙",
  Quotations: "▤", Projects: "▥", "Site Visits": "⌖", Installations: "⌂",
  Inventory: "▦", Suppliers: "♧", "Purchase Orders": "🛒", "Vendor Bills": "▧",
  Employees: "♟", Attendance: "◷", Payroll: "₹", Invoices: "▨", Payments: "↗", Reports: "▥",
};

function RecordActions({ model, record, fields = [], onRefresh, allowDelete = false, archive = false, disabled = false, disabledReason = "This record is locked by its current workflow status." }) {
  const [mode, setMode] = useState("");
  const [form, setForm] = useState({});
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startEdit = () => {
    const initial = {};
    fields.forEach((field) => {
      const raw = record?.[field.name];
      if (field.type === "date" && raw) initial[field.name] = String(raw).slice(0, 10);
      else if (field.type === "datetime-local" && raw) {
        const utcDate = new Date(`${String(raw).replace(" ", "T")}Z`);
        initial[field.name] = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      else initial[field.name] = raw === false || raw === null || raw === undefined ? "" : raw;
    });
    setForm(initial);
    setError("");
    setMode("edit");
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = {};
      fields.forEach((field) => {
        const value = form[field.name];
        if (field.type === "number") values[field.name] = value === "" ? 0 : Number(value);
        else if (field.type === "datetime-local") values[field.name] = value ? new Date(value).toISOString().slice(0, 19).replace("T", " ") : false;
        else if (field.type === "date") values[field.name] = value || false;
        else values[field.name] = value;
      });
      await updateOdooRecord(model, record.id, values);
      await onRefresh?.();
      setMode("");
    } catch (err) {
      setError(err.message || "Unable to update this record.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (event) => {
    event.preventDefault();
    if (!password) {
      setError("Enter your Odoo password to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteOdooRecord(model, record.id, password);
      setPassword("");
      setMode("");
      await onRefresh?.();
    } catch (err) {
      setError(err.message || "Unable to delete this record.");
    } finally {
      setBusy(false);
    }
  };

  const archiveRecord = async () => {
    if (!window.confirm(`Archive ${record?.name || "this record"}? It will be hidden from active lists but can be reactivated in Odoo.`)) return;
    setBusy(true);
    setError("");
    try {
      await updateOdooRecord(model, record.id, { active: false });
      await onRefresh?.();
    } catch (err) {
      setError(err.message || "Unable to archive this record.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="record-actions">
      {fields.length > 0 && <button type="button" className="table-action-button" disabled={busy || disabled} title={disabled ? disabledReason : "Edit record"} onClick={startEdit}>Edit</button>}
      {allowDelete && <button type="button" className="danger-button record-delete-button" disabled={busy || disabled} title={disabled ? disabledReason : "Delete record"} onClick={() => { setPassword(""); setError(""); setMode("delete"); }}>Delete</button>}
      {archive && <button type="button" className="secondary-button record-archive-button" disabled={busy || record?.active === false} onClick={archiveRecord}>{record?.active === false ? "Archived" : "Archive"}</button>}
      {disabled && <span className="record-locked-hint" title={disabledReason}>Locked</span>}
    </div>
    {error && !mode && <div className="record-action-error">{error}</div>}
    {mode === "edit" && createPortal(<div className="modal-overlay record-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setMode(""); }}>
      <form className="enquiry-modal record-editor-modal" onSubmit={saveEdit}>
        <div className="modal-heading"><div><h2>Edit record</h2><p>{record?.name || record?.display_name || `${model} · #${record?.id}`}</p></div><button type="button" className="close-button" disabled={busy} onClick={() => setMode("")}>×</button></div>
        {fields.map((field) => <label key={field.name}>{field.label}
          {field.type === "textarea" ? <textarea rows="3" value={form[field.name] ?? ""} required={field.required} onChange={(e) => setForm((current) => ({ ...current, [field.name]: e.target.value }))} /> : field.type === "select" ? <select value={form[field.name] ?? ""} required={field.required} onChange={(e) => setForm((current) => ({ ...current, [field.name]: e.target.value }))}><option value="">Select</option>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <input type={field.type || "text"} step={field.type === "number" ? "any" : undefined} value={form[field.name] ?? ""} required={field.required} onChange={(e) => setForm((current) => ({ ...current, [field.name]: e.target.value }))} />}
        </label>)}
        {error && <div className="error-message">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => setMode("")}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
      </form>
    </div>, document.body)}
    {mode === "delete" && createPortal(<div className="modal-overlay record-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setMode(""); }}>
      <form className="enquiry-modal record-editor-modal" onSubmit={confirmDelete}>
        <div className="modal-heading"><div><h2>Confirm deletion</h2><p>This permanently deletes {record?.name || record?.display_name || `${model} record #${record?.id}`}. This cannot be undone.</p></div><button type="button" className="close-button" disabled={busy} onClick={() => setMode("")}>×</button></div>
        <label>Odoo account password<input type="password" autoComplete="current-password" value={password} required onChange={(e) => setPassword(e.target.value)} placeholder="Enter your Odoo password" /></label>
        {error && <div className="error-message">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => setMode("")}>Cancel</button><button type="submit" className="danger-button" disabled={busy}>{busy ? "Verifying…" : "Verify & delete"}</button></div>
      </form>
    </div>, document.body)}
  </>;
}

function EnquiriesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch enquiries from Odoo
  async function fetchEnquiries() {
    try {
      setLoading(true);
      setError("");

      const data = await getEnquiries();

      const formattedLeads = data.map((lead) => ({
        ...lead,
        _raw: lead,
        id: lead.id,
        name: lead.contact_name || lead.partner_name || lead.name || "Unnamed",
        location: lead.solar_location || "",
        type:
          lead.solar_customer_type === "residential"
            ? "Residential"
            : lead.solar_customer_type === "commercial"
            ? "Commercial"
            : "—",
        capacity:
          lead.solar_capacity
            ? `${lead.solar_capacity} kW`
            : "—",
        status: lead.stage_id?.[1] || "New",
        amount: lead.expected_revenue
          ? `₹${Number(lead.expected_revenue).toLocaleString("en-IN")}`
          : "—",
      }));

      setLeads(formattedLeads);
    } catch (err) {
      console.error("Odoo enquiry fetch error:", err);
      setError(err.message || "Unable to load enquiries from Odoo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.location.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || lead.status === filter;

    return matchesSearch && matchesFilter;
  });

  // Create enquiry directly in Odoo
  async function addEnquiry(event) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const customerName = form.get("name");
    const location = form.get("location");
    const customerType = form.get("type");
    const capacity = parseFloat(form.get("capacity"));

    try {
      setSaving(true);
      setError("");

      await createEnquiry({
        name: customerName,
        contact_name: customerName,
        phone: form.get("phone") || false,
        solar_location: location,
        solar_customer_type: customerType,
        solar_capacity: capacity,
        type: "lead",
      });

      await fetchEnquiries();

      setShowForm(false);
      formElement.reset();
    } catch (err) {
      console.error("Odoo enquiry creation error:", err);
      setError(err.message || "Unable to create enquiry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">SALES MANAGEMENT</p>
          <h1>Enquiries</h1>
          <p className="subtitle">
            Manage and track all your solar enquiries.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm(true)}
        >
          + New Enquiry
        </button>
      </section>

      {error && (
        <div className="login-error">
          {error}
        </div>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-top">Total Enquiries</div>
          <h2>{leads.length}</h2>
          <div className="stat-bottom">All enquiries</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">Qualified</div>
          <h2>
            {leads.filter((x) => x.status === "Qualified").length}
          </h2>
          <div className="stat-bottom">Potential customers</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">Won Projects</div>
          <h2>
            {leads.filter((x) => x.status === "Won").length}
          </h2>
          <div className="stat-bottom">Converted enquiries</div>
        </article>
      </section>

      <section className="panel enquiries-panel">
        <div className="enquiry-toolbar">
          <input
            className="enquiry-search"
            placeholder="Search customer or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="New">New</option>
            <option value="Qualified">Qualified</option>
            <option value="Quotation">Quotation</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Won">Won</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>LOCATION</th>
                <th>TYPE</th>
                <th>CAPACITY</th>
                <th>STATUS</th>
                <th>EST. VALUE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading enquiries from Odoo...</td>
                </tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <strong>{lead.name}</strong>
                    </td>

                    <td>{lead.location || "—"}</td>
                    <td>{lead.type}</td>
                    <td>{lead.capacity}</td>

                    <td>
                      <span
                        className={`status ${lead.status
                          .toLowerCase()
                          .replace(/[^a-z]/g, "")}`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="amount">{lead.amount}</td>
                    <td><RecordActions model="crm.lead" record={lead._raw} fields={[
                      { name: "contact_name", label: "Customer name" },
                      { name: "phone", label: "Phone", type: "tel" },
                      { name: "email_from", label: "Email", type: "email" },
                      { name: "solar_location", label: "Location" },
                      { name: "solar_customer_type", label: "Customer type", type: "select", options: [["residential", "Residential"], ["commercial", "Commercial"]] },
                      { name: "solar_capacity", label: "Capacity (kW)", type: "number" },
                      { name: "expected_revenue", label: "Expected revenue (₹)", type: "number" },
                    ]} onRefresh={fetchEnquiries} allowDelete /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">No enquiries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="modal-overlay">
          <form
            className="enquiry-modal"
            onSubmit={addEnquiry}
          >
            <div className="modal-heading">
              <div>
                <h2>New Enquiry</h2>
                <p>Enter the customer's basic information.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <label>Customer Name</label>
            <input
              name="name"
              required
              placeholder="Enter customer name"
            />

            <label>Phone Number</label>
            <input
              name="phone"
              type="tel"
              placeholder="Enter phone number"
            />

            <label>Location</label>
            <input
              name="location"
              required
              placeholder="Enter location"
            />

            <label>Customer Type</label>
            <select name="type">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>

            <label>Solar Capacity (kW)</label>
            <input
              name="capacity"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="e.g. 5"
              required
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Create Enquiry"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}


function FollowupsPage() {
  const [items, setItems] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const typeLabels = {
    call: "Call",
    whatsapp: "WhatsApp",
    meeting: "Meeting",
    site_visit: "Site Visit",
  };

  const statusLabels = {
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  async function loadFollowups() {
    try {
      setLoading(true);
      setError("");

      const [followupData, enquiryData, userData] = await Promise.all([
        getFollowups(),
        getEnquiries(),
        getFollowupUsers(),
      ]);

      setItems(followupData);
      setEnquiries(enquiryData);
      setUsers(userData);
    } catch (err) {
      console.error("Follow-up loading error:", err);
      setError(err.message || "Unable to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFollowups();
  }, []);

  async function addFollowup(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const leadId = Number(form.get("leadId"));
    const date = form.get("date");
    const type = form.get("type");
    const assignedId = form.get("assigned");
    const notes = form.get("notes");

    const selectedLead = enquiries.find(
      (lead) => lead.id === leadId
    );

    if (!selectedLead) {
      setError("Please select a valid enquiry.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createFollowup({
        name: `${typeLabels[type]} - ${
          selectedLead.contact_name || selectedLead.name
        }`,
        lead_id: leadId,
        followup_date: `${date} 00:00:00`,
        followup_type: type,
        assigned_to: assignedId ? Number(assignedId) : false,
        notes: notes || "",
        status: "pending",
      });

      await loadFollowups();
      setShowForm(false);
    } catch (err) {
      console.error("Follow-up creation error:", err);
      setError(err.message || "Unable to create follow-up.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item) {
    const newStatus =
      item.status === "pending" ? "completed" : "pending";

    try {
      setError("");

      await updateFollowup(item.id, {
        status: newStatus,
      });

      setItems((currentItems) =>
        currentItems.map((x) =>
          x.id === item.id
            ? { ...x, status: newStatus }
            : x
        )
      );
    } catch (err) {
      console.error("Follow-up status update error:", err);
      setError(err.message || "Unable to update follow-up status.");
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const visibleItems = items.filter((item) => {
    return (
      filter === "All" ||
      statusLabels[item.status] === filter
    );
  });

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">SALES MANAGEMENT</p>
          <h1>Follow-ups</h1>
          <p className="subtitle">
            Never miss an opportunity. Manage your customer follow-ups.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
        >
          + Schedule Follow-up
        </button>
      </section>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section className="stats-grid">
        {[
          ["Total Follow-ups", items.length],
          [
            "Pending",
            items.filter((x) => x.status === "pending").length,
          ],
          [
            "Completed",
            items.filter((x) => x.status === "completed").length,
          ],
          [
            "Overdue",
            items.filter(
              (x) =>
                x.status === "pending" &&
                x.followup_date?.slice(0, 10) < today
            ).length,
          ],
        ].map(([label, value]) => (
          <article className="stat-card" key={label}>
            <div className="stat-top">{label}</div>
            <h2>{value}</h2>
            <div className="stat-bottom">Follow-up activity</div>
          </article>
        ))}
      </section>

      <section className="panel enquiries-panel">
        <div className="panel-heading">
          <div>
            <h3>Follow-up Schedule</h3>
            <p>Track customer calls, messages and site visits.</p>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Completed</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>TYPE</th>
                <th>ASSIGNED TO</th>
                <th>NOTES</th>
                <th>STATUS</th>
                <th>STATUS ACTION</th>
                <th>RECORD ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">Loading follow-ups...</td>
                </tr>
              ) : (
                <>
                  {visibleItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {item.lead_id?.[1] || "Unknown Customer"}
                        </strong>
                      </td>

                      <td>
                        {item.followup_date?.slice(0, 10) || "-"}
                      </td>

                      <td>
                        {typeLabels[item.followup_type] ||
                          item.followup_type}
                      </td>

                      <td>
                        {item.assigned_to?.[1] || "Unassigned"}
                      </td>

                      <td>{item.notes || "-"}</td>

                      <td>
                        <span
                          className={`status ${
                            statusLabels[item.status]?.toLowerCase() ||
                            item.status
                          }`}
                        >
                          {statusLabels[item.status] || item.status}
                        </span>
                      </td>

                      <td>
                        {item.status !== "cancelled" && (
                          <button
                            className="secondary-button"
                            onClick={() => toggleStatus(item)}
                          >
                            {item.status === "pending" ? "Complete" : "Reopen"}
                          </button>
                        )}
                      </td>
                      <td><RecordActions model="ranzom.solar.followup" record={item} fields={[
                        { name: "name", label: "Follow-up title" },
                        { name: "followup_date", label: "Follow-up date & time", type: "datetime-local" },
                        { name: "followup_type", label: "Type", type: "select", options: [["call", "Call"], ["whatsapp", "WhatsApp"], ["meeting", "Meeting"], ["site_visit", "Site visit"]] },
                        { name: "notes", label: "Notes", type: "textarea" },
                        { name: "status", label: "Status", type: "select", options: [["pending", "Pending"], ["completed", "Completed"], ["cancelled", "Cancelled"]] },
                        { name: "next_followup_date", label: "Next follow-up date & time", type: "datetime-local" },
                      ]} onRefresh={loadFollowups} allowDelete /></td>
                    </tr>
                  ))}

                  {visibleItems.length === 0 && (
                    <tr>
                      <td colSpan="8">
                        No follow-ups found.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="modal-overlay">
          <form
            className="enquiry-modal"
            onSubmit={addFollowup}
          >
            <div className="modal-heading">
              <div>
                <h2>Schedule Follow-up</h2>
                <p>Create a new customer follow-up.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <label>Customer / Enquiry</label>
            <select name="leadId" required defaultValue="">
              <option value="" disabled>
                Select an enquiry
              </option>

              {enquiries.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contact_name || lead.name}
                  {lead.phone ? ` - ${lead.phone}` : ""}
                </option>
              ))}
            </select>

            <label>Follow-up Date</label>
            <input
              name="date"
              type="date"
              required
              min={today}
            />

            <label>Follow-up Type</label>
            <select name="type" defaultValue="call" required>
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="meeting">Meeting</option>
              <option value="site_visit">Site Visit</option>
            </select>

            <label>Assigned To</label>
            <select name="assigned" defaultValue="">
              <option value="">Unassigned</option>

              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <label>Notes</label>
            <input
              name="notes"
              placeholder="Follow-up details"
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Follow-up"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}



function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customer: "",
    productId: "",
    system: "On-grid",
    capacity: "",
    panel: "",
    inverter: "",
    price: "",
    subsidy: "78000",
  });

  const update = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const total = Number(form.price) || 0;
  const subsidy = Number(form.subsidy) || 0;
  const net = Math.max(0, total - subsidy);

  const money = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const statusLabels = {
    draft: "Draft",
    sent: "Sent",
    sale: "Accepted",
    cancel: "Cancelled",
  };

  async function loadQuotations() {
    try {
      setLoading(true);
      setError("");

      const [quotationData, customerData, productData] =
        await Promise.all([
          getQuotations(),
          getQuotationCustomers(),
          getQuotationProducts(),
        ]);

      const orderIds = quotationData.map((q) => q.id);
      const lines = await getQuotationLines(orderIds);

      const mapped = quotationData.map((q) => {
        const orderLines = lines.filter(
          (line) => line.order_id?.[0] === q.id
        );

        const mainLine = orderLines.find(
          (line) => line.display_type !== "line_note"
        );

        return {
          ...q,
          _raw: q,
          id: q.id,
          ref: q.name,
          customer: q.partner_id?.[1] || "Unknown Customer",
          system: mainLine?.name?.match(/System: ([^|]+)/)?.[1] || "-",
          capacity: mainLine?.name?.match(/Capacity: ([^|]+)/)?.[1] || "-",
          amount: q.amount_total,
          status: statusLabels[q.state] || q.state,
        };
      });

      setQuotations(mapped);
      setCustomers(customerData);
      setProducts(productData);
    } catch (err) {
      console.error("Quotation loading error:", err);
      setError(err.message || "Unable to load quotations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotations();
  }, []);

  async function createQuotationRecord(e) {
    e.preventDefault();

    const product = products.find((item) => item.id === Number(form.productId));
    const customerId = Number(form.customer);

    if (!products.length) {
      setError("No saleable products found in Odoo. Add a saleable product before creating a quotation.");
      return;
    }

    if (!product) {
      setError("Please select a product or service for this quotation.");
      return;
    }

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (total <= 0) {
      setError("Enter a valid gross project cost.");
      return;
    }

    if (subsidy > total) {
      setError("Subsidy cannot exceed the gross project cost.");
      return;
    }

    if (!product.uom_id?.[0]) {
      setError("The selected product has no unit of measure.");
      return;
    }

    const subsidyDiscount =
      total > 0 ? (subsidy / total) * 100 : 0;

    const description = [
      `Solar System Package`,
      `System: ${form.system}`,
      `Capacity: ${form.capacity}`,
      `Panel: ${form.panel || "Not specified"}`,
      `Inverter: ${form.inverter || "Not specified"}`,
    ].join(" | ");

    try {
      setSaving(true);
      setError("");

      await createQuotation({
        partner_id: customerId,

        order_line: [
          [
            0,
            0,
            {
              product_id: product.id,
              product_uom_id: product.uom_id[0],
              product_uom_qty: 1,
              name: description,
              price_unit: total,
              discount: subsidyDiscount,
            },
          ],
          [
            0,
            0,
            {
              display_type: "line_note",
              name: `Government Subsidy: ${money(subsidy)} | Net Investment: ${money(net)}`,
            },
          ],
        ],
      });

      await loadQuotations();

      setShowForm(false);

      setForm({
        customer: "",
        productId: "",
        system: "On-grid",
        capacity: "",
        panel: "",
        inverter: "",
        price: "",
        subsidy: "78000",
      });
    } catch (err) {
      console.error("Quotation creation error:", err);
      setError(err.message || "Unable to create quotation.");
    } finally {
      setSaving(false);
    }
  }

  const visible = quotations.filter(
    (q) => filter === "All" || q.status === filter
  );

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">SALES MANAGEMENT</p>
          <h1>Quotations</h1>
          <p className="subtitle">
            Create and manage solar project quotations.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
        >
          + Create Quotation
        </button>
      </section>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section className="stats-grid">
        {[
          ["Total Quotations", quotations.length],
          [
            "Draft",
            quotations.filter((q) => q.status === "Draft").length,
          ],
          [
            "Sent",
            quotations.filter((q) => q.status === "Sent").length,
          ],
          [
            "Accepted",
            quotations.filter((q) => q.status === "Accepted").length,
          ],
        ].map(([label, value]) => (
          <article className="stat-card" key={label}>
            <div className="stat-top">{label}</div>
            <h2>{value}</h2>
            <div className="stat-bottom">
              Quotation overview
            </div>
          </article>
        ))}
      </section>

      <section className="panel enquiries-panel">
        <div className="panel-heading">
          <div>
            <h3>All Quotations</h3>
            <p>Track quotation status and project value.</p>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Draft</option>
            <option>Sent</option>
            <option>Accepted</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>REFERENCE</th>
                <th>CUSTOMER</th>
                <th>SYSTEM</th>
                <th>CAPACITY</th>
                <th>NET INVESTMENT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading quotations...</td>
                </tr>
              ) : (
                <>
                  {visible.map((q) => (
                    <tr key={q.id}>
                      <td><strong>{q.ref}</strong></td>
                      <td>{q.customer}</td>
                      <td>{q.system}</td>
                      <td>{q.capacity}</td>
                      <td className="amount">
                        {money(q.amount)}
                      </td>
                      <td>
                        <span className={`status ${q.status.toLowerCase()}`}>{q.status}</span>
                      </td>
                      <td><RecordActions model="sale.order" record={q._raw} fields={[
                        { name: "validity_date", label: "Quotation validity", type: "date" },
                        { name: "client_order_ref", label: "Customer reference" },
                        { name: "note", label: "Terms and conditions", type: "textarea" },
                      ]} onRefresh={loadQuotations} allowDelete={q._raw?.state === "draft"} disabled={q._raw?.state !== "draft"} disabledReason="Only draft quotations can be edited or deleted here." /></td>
                    </tr>
                  ))}

                  {visible.length === 0 && (
                    <tr>
                      <td colSpan="7">
                        No quotations found.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="modal-overlay">
          <form
            className="enquiry-modal quotation-modal"
            onSubmit={createQuotationRecord}
          >
            <div className="modal-heading">
              <div>
                <h2>Create Quotation</h2>
                <p>
                  Solar project pricing and investment details.
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <label>Customer Name</label>
            <select
              name="customer"
              value={form.customer}
              onChange={update}
              required
            >
              <option value="">Select customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.phone ? ` - ${customer.phone}` : ""}
                </option>
              ))}
            </select>

            <label>Product / Service</label>
            <select
              name="productId"
              value={form.productId}
              onChange={update}
              required
            >
              <option value="">Select a saleable product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — ₹{Number(product.list_price || 0).toLocaleString("en-IN")}
                </option>
              ))}
            </select>

            <label>Solar System</label>
            <select
              name="system"
              value={form.system}
              onChange={update}
            >
              <option>On-grid</option>
              <option>Off-grid</option>
              <option>Hybrid</option>
            </select>

            <label>System Capacity</label>
            <input
              name="capacity"
              value={form.capacity}
              onChange={update}
              required
              placeholder="e.g. 5 kW"
            />

            <label>Solar Panel Brand</label>
            <input
              name="panel"
              value={form.panel}
              onChange={update}
              placeholder="Panel brand"
            />

            <label>Inverter Brand</label>
            <input
              name="inverter"
              value={form.inverter}
              onChange={update}
              placeholder="Inverter brand"
            />

            <label>Gross Project Cost (₹)</label>
            <input
              name="price"
              type="number"
              min="1"
              value={form.price}
              onChange={update}
              required
              placeholder="Enter total cost"
            />

            <label>Subsidy (₹)</label>
            <input
              name="subsidy"
              type="number"
              min="0"
              value={form.subsidy}
              onChange={update}
            />

            <div className="quotation-total">
              <div>
                <span>Gross Cost</span>
                <strong>{money(total)}</strong>
              </div>

              <div>
                <span>Subsidy</span>
                <strong>{money(subsidy)}</strong>
              </div>

              <div className="net-total">
                <span>Net Investment</span>
                <strong>{money(net)}</strong>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Quotation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}


function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");
      const data = await getCustomers();
      const labels = {
        solar_customer_type: { residential: "Residential", commercial: "Commercial" },
        solar_system_type: { hybrid: "Hybrid", on_grid: "On-Grid", off_grid: "Off-Grid" },
      };
      setCustomers(data.map((c) => ({
        ...c,
        _raw: c,
        phone: c.solar_mobile_number || c.phone || "-",
        location: [c.street, c.street2, c.solar_district, c.city, c.zip].filter(Boolean).join(", ") || "-",
        type: labels.solar_customer_type[c.solar_customer_type] || (c.is_company ? "Commercial" : "Residential"),
        system: labels.solar_system_type[c.solar_system_type] || "-",
        capacity: c.solar_capacity ? `${c.solar_capacity} kW` : "-",
      })));
    } catch (err) {
      console.error("Customer loading error:", err);
      setError(err.message || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCustomers(); }, []);

  async function addCustomer(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (key) => String(data.get(key) || "").trim();
    const name = value("name");
    const mobile = value("mobile");
    const customerType = value("customer_type");

    try {
      setSaving(true);
      setError("");
      const duplicate = customers.some((c) =>
        c.name.toLowerCase() === name.toLowerCase() &&
        (c.solar_mobile_number || c.phone || "") === mobile
      );
      if (duplicate) {
        setError("This customer already exists.");
        return;
      }

      await createCustomer({
        name,
        solar_mobile_number: mobile || false,
        phone: mobile || false,
        solar_alternative_phone: value("alternative_phone") || false,
        email: value("email") || false,
        street: value("address") || false,
        street2: value("address2") || false,
        solar_district: value("district") || false,
        city: value("city") || false,
        zip: value("zip") || false,
        solar_consumer_number: value("consumer_number") || false,
        solar_customer_type: customerType,
        is_company: customerType === "commercial",
        company_type: customerType === "commercial" ? "company" : "person",
        solar_system_type: value("system_type"),
        solar_roof_type: value("roof_type"),
        solar_capacity: Number(value("capacity") || 0),
        solar_lead_source: value("lead_source") || false,
        customer_rank: 1,
      });
      await loadCustomers();
      setShowForm(false);
    } catch (err) {
      console.error("Customer creation error:", err);
      setError(err.message || "Unable to create customer.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = customers.filter((c) =>
    `${c.name} ${c.phone} ${c.location} ${c.solar_consumer_number || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );
  const residential = customers.filter((c) => c.type === "Residential").length;
  const commercial = customers.filter((c) => c.type === "Commercial").length;
  const totalCapacity = customers.reduce((sum, c) => sum + (Number(c.solar_capacity) || 0), 0);

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">CUSTOMER MANAGEMENT</p>
          <h1>Customers</h1>
          <p className="subtitle">Manage your residential and commercial solar customers.</p>
        </div>
        <button className="primary-button" onClick={() => { setError(""); setShowForm(true); }}>+ Add Customer</button>
      </section>

      {error && <div className="error-message">{error}</div>}

      <section className="stats-grid">
        <article className="stat-card"><div className="stat-top">Total Customers</div><h2>{customers.length}</h2><div className="stat-bottom">Registered customers</div></article>
        <article className="stat-card"><div className="stat-top">Residential</div><h2>{residential}</h2><div className="stat-bottom">Residential customers</div></article>
        <article className="stat-card"><div className="stat-top">Commercial</div><h2>{commercial}</h2><div className="stat-bottom">Business customers</div></article>
        <article className="stat-card"><div className="stat-top">Total Capacity</div><h2>{totalCapacity.toLocaleString("en-IN")} kW</h2><div className="stat-bottom">Recorded solar capacity</div></article>
      </section>

      <section className="panel enquiries-panel">
        <div className="panel-heading">
          <div><h3>Customer Directory</h3><p>All registered customer records.</p></div>
          <input className="enquiry-search" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>CUSTOMER</th><th>MOBILE</th><th>LOCATION</th><th>CUSTOMER TYPE</th><th>SYSTEM</th><th>CAPACITY</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7">Loading customers...</td></tr> : <>
                {filtered.map((c) => <tr key={c.id}>
                  <td><strong>{c.name}</strong></td><td>{c.phone}</td><td>{c.location}</td><td>{c.type}</td><td>{c.system}</td><td className="amount">{c.capacity}</td>
                  <td><RecordActions model="res.partner" record={c._raw} fields={[
                    { name: "name", label: "Customer name", required: true },
                    { name: "solar_consumer_number", label: "Electricity consumer number" },
                    { name: "solar_mobile_number", label: "Mobile number", type: "tel" },
                    { name: "solar_alternative_phone", label: "Alternative number", type: "tel" },
                    { name: "email", label: "Email", type: "email" },
                    { name: "street", label: "Address line 1" },
                    { name: "street2", label: "Address line 2" },
                    { name: "solar_district", label: "District" },
                    { name: "city", label: "City / Location" },
                    { name: "zip", label: "PIN Code" },
                    { name: "solar_customer_type", label: "Customer type", type: "select", options: [["residential", "Residential"], ["commercial", "Commercial"]] },
                    { name: "solar_system_type", label: "Solar system", type: "select", options: [["hybrid", "Hybrid"], ["on_grid", "On-Grid"], ["off_grid", "Off-Grid"]] },
                    { name: "solar_roof_type", label: "Roof type", type: "select", options: [["flat", "Flat"], ["slope", "Slope"], ["sheet", "Sheet"]] },
                    { name: "solar_capacity", label: "Required capacity (kW)", type: "number" },
                    { name: "solar_lead_source", label: "Lead source", type: "select", options: [["whatsapp", "WhatsApp"], ["meta", "Meta"], ["referral", "Referral"], ["direct", "Direct"], ["website", "Website"], ["other", "Other"]] },
                  ]} onRefresh={loadCustomers} archive /></td>
                </tr>)}
                {filtered.length === 0 && <tr><td colSpan="7">No customers found.</td></tr>}
              </>}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && createPortal(
        <div className="modal-overlay record-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowForm(false); }}>
          <form className="enquiry-modal customer-modal" onSubmit={addCustomer}>
            <div className="modal-heading">
              <div><h2>Add Customer</h2><p>Enter customer and solar requirement details.</p></div>
              <button type="button" className="close-button" onClick={() => setShowForm(false)} disabled={saving}>×</button>
            </div>
            <div className="customer-form-section">
              <h3>Basic Information</h3>
              <div className="customer-form-grid">
                <div><label>Customer Name *</label><input name="name" required placeholder="Full name" /></div>
                <div><label>Electricity Consumer Number</label><input name="consumer_number" placeholder="KSEB consumer number" /></div>
                <div><label>Mobile Number *</label><input name="mobile" required type="tel" placeholder="+91..." /></div>
                <div><label>Alternative Number</label><input name="alternative_phone" type="tel" placeholder="Alternative mobile number" /></div>
                <div><label>Email</label><input name="email" type="email" placeholder="name@example.com" /></div>
                <div><label>Address Line 1</label><input name="address" placeholder="House name / building / street" /></div>
                <div><label>Address Line 2</label><input name="address2" placeholder="Area / landmark (optional)" /></div>
                <div><label>District</label><input name="district" placeholder="e.g. Kozhikode" /></div>
                <div><label>City / Location</label><input name="city" placeholder="City or installation location" /></div>
                <div><label>PIN Code</label><input name="zip" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="6-digit PIN code" /></div>
              </div>
            </div>
            <div className="customer-form-section">
              <h3>Solar Requirements</h3>
              <div className="customer-form-grid">
                <div><label>Solar System Type *</label><select name="system_type" required defaultValue="on_grid"><option value="on_grid">On-Grid</option><option value="hybrid">Hybrid</option><option value="off_grid">Off-Grid</option></select></div>
                <div><label>Customer Type *</label><select name="customer_type" required defaultValue="residential"><option value="residential">Residential</option><option value="commercial">Commercial</option></select></div>
                <div><label>Roof Type *</label><select name="roof_type" required defaultValue="flat"><option value="flat">Flat</option><option value="slope">Slope</option><option value="sheet">Sheet</option></select></div>
                <div><label>Required Capacity (kW)</label><input name="capacity" type="number" min="0" step="0.1" placeholder="e.g. 5" /></div>
              </div>
            </div>
            <div className="customer-form-section">
              <h3>Lead Information</h3>
              <div className="customer-form-grid">
                <div><label>Lead Source</label><select name="lead_source" defaultValue=""><option value="">Select source</option><option value="whatsapp">WhatsApp</option><option value="meta">Meta</option><option value="referral">Referral</option><option value="direct">Direct</option><option value="website">Website</option><option value="other">Other</option></select></div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save Customer"}</button>
            </div>
          </form>
        </div>, document.body
      )}
    </>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  async function load() {
    setLoading(true); setError("");
    try { setProducts(await getInventoryProducts()); }
    catch (e) { setError(e.message || "Unable to load products from Odoo."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const categories = ["All", ...new Set(products.map(p => p.categ_id?.[1]).filter(Boolean))];
  const rows = products.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.default_code || "").toLowerCase().includes(search.toLowerCase())
  ).filter(p => category === "All" || p.categ_id?.[1] === category);
  const currency = value => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:2}).format(value || 0);
  return <>
    <section className="welcome-row"><div><p className="eyebrow">PRODUCT CATALOGUE</p><h1>Products</h1><p className="subtitle">Manage the solar products and services available for sale.</p></div><button className="secondary-button" onClick={load}>↻ Refresh</button></section>
    {error && <div className="error-message">{error}</div>}
    <section className="stats-grid">
      <article className="stat-card"><div className="stat-top">Total Products</div><h2>{products.length}</h2><div className="stat-bottom">Products registered in Odoo</div></article>
      <article className="stat-card"><div className="stat-top">Product Categories</div><h2>{Math.max(0,categories.length-1)}</h2><div className="stat-bottom">Categories in catalogue</div></article>
      <article className="stat-card"><div className="stat-top">Available Stock</div><h2>{products.filter(p => (p.qty_available || 0) > 0).length}</h2><div className="stat-bottom">Products with on-hand quantity</div></article>
      <article className="stat-card"><div className="stat-top">Out of Stock</div><h2>{products.filter(p => (p.qty_available || 0) <= 0).length}</h2><div className="stat-bottom">Products with zero quantity</div></article>
    </section>
    <section className="panel enquiries-panel"><div className="panel-heading"><div><h3>Product Catalogue</h3><p>Live product records and sales prices from Odoo.</p></div><div className="panel-actions"><input className="enquiry-search" placeholder="Search name or SKU..." value={search} onChange={e=>setSearch(e.target.value)}/><select className="enquiry-search" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div></div>
      {loading ? <div className="empty-state">Loading products from Odoo...</div> : rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Sales Price</th><th>On Hand</th><th>Forecasted</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.default_code || "—"}</td><td>{p.categ_id?.[1] || "Uncategorised"}</td><td>{currency(p.list_price)}</td><td>{p.qty_available ?? "—"} {p.uom_id?.[1] || ""}</td><td>{p.virtual_available ?? "—"}</td><td><span className={`status-pill ${(p.qty_available || 0)>0 ? "status-success" : "status-muted"}`}>{(p.qty_available || 0)>0 ? "In Stock" : "Out of Stock"}</span></td><td><RecordActions model="product.product" record={p} fields={[{name:"name",label:"Product name",required:true},{name:"default_code",label:"Internal reference / SKU"},{name:"list_price",label:"Sales price (₹)",type:"number"}]} onRefresh={load} archive /></td></tr>)}</tbody></table></div> : <div className="empty-state">No products found in the connected Odoo database.</div>}
    </section>
  </>;
}

function SalesPage() {
  const [orders,setOrders] = useState([]); const [loading,setLoading] = useState(true); const [error,setError] = useState(""); const [search,setSearch] = useState(""); const [filter,setFilter] = useState("All");
  async function load(){setLoading(true);setError("");try{setOrders(await getQuotations());}catch(e){setError(e.message || "Unable to load sales orders from Odoo.");}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  const confirmed=orders.filter(o=>["sale","done"].includes(o.state));
  const rows=confirmed.filter(o=>filter==="All" || o.state===filter).filter(o=>(o.name||"").toLowerCase().includes(search.toLowerCase()) || (o.partner_id?.[1]||"").toLowerCase().includes(search.toLowerCase()));
  const currency=value=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value||0);
  return <>
    <section className="welcome-row"><div><p className="eyebrow">SALES MANAGEMENT</p><h1>Sales</h1><p className="subtitle">Track confirmed customer orders and sales performance.</p></div><button className="secondary-button" onClick={load}>↻ Refresh</button></section>
    {error && <div className="error-message">{error}</div>}
    <section className="stats-grid"><article className="stat-card"><div className="stat-top">Confirmed Orders</div><h2>{confirmed.length}</h2><div className="stat-bottom">Sales and completed orders</div></article><article className="stat-card"><div className="stat-top">Sales Revenue</div><h2>{currency(confirmed.reduce((n,o)=>n+(o.amount_total||0),0))}</h2><div className="stat-bottom">Order value, not cash received</div></article><article className="stat-card"><div className="stat-top">Sales Orders</div><h2>{orders.filter(o=>o.state==="sale").length}</h2><div className="stat-bottom">Currently confirmed</div></article><article className="stat-card"><div className="stat-top">Completed Orders</div><h2>{orders.filter(o=>o.state==="done").length}</h2><div className="stat-bottom">Marked done in Odoo</div></article></section>
    <section className="panel enquiries-panel"><div className="panel-heading"><div><h3>Sales Orders</h3><p>Confirmed orders retrieved from Odoo Sales.</p></div><div className="panel-actions"><input className="enquiry-search" placeholder="Search order or customer..." value={search} onChange={e=>setSearch(e.target.value)}/><select className="enquiry-search" value={filter} onChange={e=>setFilter(e.target.value)}><option value="All">All statuses</option><option value="sale">Sales Order</option><option value="done">Completed</option></select></div></div>
      {loading ? <div className="empty-state">Loading sales orders from Odoo...</div> : rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Order Date</th><th>Order Value</th><th>Status</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td><strong>{o.name}</strong></td><td>{o.partner_id?.[1] || "—"}</td><td>{o.create_date ? new Date(o.create_date.replace(" ","T")+"Z").toLocaleDateString("en-IN") : "—"}</td><td>{currency(o.amount_total)}</td><td><span className="status-pill status-success">{o.state==="done"?"Completed":"Sales Order"}</span></td></tr>)}</tbody></table></div> : <div className="empty-state">No confirmed sales orders found. Draft quotations are managed in the Quotations page.</div>}
    </section>
  </>;
}

function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const [productData, warehouseData] = await Promise.all([
        getInventoryProducts(),
        getWarehouses(),
      ]);

      setProducts(productData);
      setWarehouses(warehouseData);
    } catch (err) {
      console.error("Inventory loading error:", err);
      setError(err.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = products.length;
  const totalStock = products.reduce(
    (sum, product) => sum + (product.qty_available || 0),
    0
  );
  const outOfStock = products.filter(
    (product) => (product.qty_available || 0) <= 0
  ).length;

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">OPERATIONS MANAGEMENT</p>
          <h1>Inventory</h1>
          <p className="subtitle">
            Monitor products, stock quantities and warehouses.
          </p>
        </div>

        <button className="secondary-button" onClick={loadInventory}>
          ↻ Refresh
        </button>
      </section>

      {error && <div className="error-message">{error}</div>}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-top">Total Products</div>
          <h2>{totalProducts}</h2>
          <div className="stat-bottom">Registered products</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">On-hand Quantity</div>
          <h2>{totalStock}</h2>
          <div className="stat-bottom">Current stock</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">Out of Stock</div>
          <h2>{outOfStock}</h2>
          <div className="stat-bottom">Products with zero stock</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">Warehouses</div>
          <h2>{warehouses.length}</h2>
          <div className="stat-bottom">Registered warehouses</div>
        </article>
      </section>

      <section className="panel enquiries-panel">
        <div className="panel-heading">
          <div>
            <h3>Products & Stock</h3>
            <p>Live inventory information from Odoo.</p>
          </div>

          <input
            className="enquiry-search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>ON HAND</th>
                <th>FORECASTED</th>
                <th>INCOMING</th>
                <th>OUTGOING</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9">Loading inventory...</td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const quantity = product.qty_available || 0;
                  const status =
                    quantity <= 0 ? "Out of Stock" : "In Stock";

                  return (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong></td>
                      <td>{product.default_code || "—"}</td>
                      <td>{product.categ_id?.[1] || "—"}</td>
                      <td>
                        {quantity} {product.uom_id?.[1] || ""}
                      </td>
                      <td>{product.virtual_available || 0}</td>
                      <td>{product.incoming_qty || 0}</td>
                      <td>{product.outgoing_qty || 0}</td>
                      <td>
                        <span
                          className={`status ${
                            quantity <= 0 ? "cancelled" : "won"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td><RecordActions model="product.product" record={product} fields={[
                        { name: "name", label: "Product name", required: true },
                        { name: "default_code", label: "Internal reference / SKU" },
                        { name: "list_price", label: "Sales price (₹)", type: "number" },
                      ]} onRefresh={loadInventory} archive /></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel enquiries-panel">
        <div className="panel-heading">
          <div>
            <h3>Warehouses</h3>
            <p>Registered stock storage locations.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>WAREHOUSE</th>
                <th>CODE</th>
                <th>LOCATION</th>
              </tr>
            </thead>

            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td><strong>{warehouse.name}</strong></td>
                  <td>{warehouse.code}</td>
                  <td>{warehouse.view_location_id?.[1] || "—"}</td>
                </tr>
              ))}

              {!loading && warehouses.length === 0 && (
                <tr>
                  <td colSpan="3">No warehouses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PurchasePage({ active }) {
  const [tab, setTab] = useState("Orders");
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    supplier: "",
    product: "",
    quantity: "1",
    price: "",
  });

  useEffect(() => {
  if (active === "Suppliers") {
    setTab("Suppliers");
  } else if (active === "Vendor Bills") {
    setTab("Bills");
  } else {
    setTab("Orders");
  }
}, [active]);

const [showBillForm, setShowBillForm] = useState(false);
const [savingBill, setSavingBill] = useState(false);

const [billForm, setBillForm] = useState({
  partner_id: "",
  product_id: "",
  invoice_date: new Date().toISOString().slice(0, 10),
  invoice_date_due: "",
  ref: "",
  description: "",
  quantity: "1",
  price: "",
});

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    city: "",
  });


  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  async function loadPurchaseData() {
    try {
      setLoading(true);
      setError("");

      const [supplierData, productData, orderData, billData] =
        await Promise.all([
          getSuppliers(),
          getPurchaseProducts(),
          getPurchaseOrders(),
          getVendorBills(),
        ]);

      setSuppliers(supplierData);
      setProducts(productData);
      setOrders(orderData);
      setBills(billData);
    } catch (err) {
      console.error("Purchase loading error:", err);
      setError(err.message || "Unable to load purchase data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPurchaseData();
  }, []);

  function updateForm(e) {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "product"
        ? {
            price:
              products.find((p) => p.id === Number(value))?.list_price ?? "",
          }
        : {}),
    }));
  }

  async function handleCreateSupplier(e) {
    e.preventDefault();

    try {
      setSavingSupplier(true);
      setError("");

      await createSupplier(supplierForm);

      setSupplierForm({
        name: "",
        phone: "",
        email: "",
        street: "",
        city: "",
      });

    setShowSupplierForm(false);
    await loadPurchaseData();
    } catch (err) {
      console.error("Supplier creation error:", err);
      setError(err.message || "Unable to create supplier.");
    } finally {
      setSavingSupplier(false);
    }
  }

async function handleCreateBill(e) {
  e.preventDefault();

  if (!billForm.partner_id || !billForm.product_id) {
    setError("Please select a supplier and product.");
    return;
  }

  if (Number(billForm.quantity) <= 0 || Number(billForm.price) < 0) {
    setError("Enter a valid quantity and price.");
    return;
  }

  try {
    setSavingBill(true);
    setError("");

    await createVendorBill(billForm);

    await loadPurchaseData();

    setShowBillForm(false);

    setBillForm({
      partner_id: "",
      product_id: "",
      invoice_date: new Date().toISOString().slice(0, 10),
      invoice_date_due: "",
      ref: "",
      description: "",
      quantity: "1",
      price: "",
    });
  } catch (err) {
    console.error("Vendor bill creation error:", err);
    setError(err.message || "Unable to create vendor bill.");
  } finally {
    setSavingBill(false);
  }
}

  async function handleCreatePurchase(e) {
    e.preventDefault();

    const supplier = Number(form.supplier);
    const product = products.find(
      (p) => p.id === Number(form.product)
    );
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!supplier || !product) {
      setError("Please select a supplier and product.");
      return;
    }

    if (!product.uom_id?.[0]) {
      setError("The selected product has no unit of measure.");
      return;
    }

    if (quantity <= 0 || price < 0) {
      setError("Enter a valid quantity and purchase price.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const plannedDate = new Date(Date.now() + 86400000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      await createPurchaseOrder({
        partner_id: supplier,
        order_line: [
          [
            0,
            0,
            {
              product_id: product.id,
              name: product.name,
              product_qty: quantity,
              product_uom_id: product.uom_id[0],
              price_unit: price,
              date_planned: plannedDate,
          }
          ],
        ],
      });

      await loadPurchaseData();

      setShowForm(false);
      setForm({
        supplier: "",
        product: "",
        quantity: "1",
        price: "",
      });
    } catch (err) {
      console.error("Purchase order creation error:", err);
      setError(err.message || "Unable to create purchase order.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmOrder(order) {
    const confirmed = window.confirm(
      `Confirm purchase order ${order.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      await confirmPurchaseOrder(order.id);
      await loadPurchaseData();
    } catch (err) {
      console.error("Purchase confirmation error:", err);
      setError(err.message || "Unable to confirm purchase order.");
    }
  }

  const draftCount = orders.filter(
    (order) => order.state === "draft" || order.state === "sent"
  ).length;

  const confirmedCount = orders.filter(
    (order) => ["purchase", "done"].includes(order.state)
  ).length;

  const totalPurchaseValue = orders.reduce(
    (sum, order) => sum + Number(order.amount_total || 0),
    0
  );

  const statusLabel = (state) => {
    const labels = {
      draft: "RFQ",
      sent: "RFQ Sent",
      "to approve": "To Approve",
      purchase: "Purchase Order",
      done: "Locked",
      cancel: "Cancelled",
  };

    return labels[state] || state;
  };

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">PROCUREMENT MANAGEMENT</p>
          <h1>Purchase Management</h1>
          <p className="subtitle">
            Manage suppliers, purchase orders and vendor bills.
          </p>
        </div>

        {tab === "Suppliers" ? (
  <button
    className="primary-button"
    onClick={() => setShowSupplierForm(true)}
  >
    + Add Supplier
  </button>
) : tab === "Orders" ? (
  <button
    className="primary-button"
    onClick={() => setShowForm(true)}
  >
    + New Purchase Order
  </button>
) : tab === "Bills" ? (
  <button
    className="primary-button"
    onClick={() => setShowBillForm(true)}
  >
    + Create Vendor Bill
  </button>
) : null}
      </section>

      {error && <div className="error-message">{error}</div>}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-top">Total Suppliers</div>
          <h2>{suppliers.length}</h2>
          <div className="stat-bottom">Registered vendors</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">Purchase Orders</div>
          <h2>{orders.length}</h2>
          <div className="stat-bottom">All purchase orders</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">Awaiting Confirmation</div>
          <h2>{draftCount}</h2>
          <div className="stat-bottom">RFQs and pending orders</div>
        </article>

        <article className="stat-card">
          <div className="stat-top">Total Purchase Value</div>
          <h2>{money(totalPurchaseValue)}</h2>
          <div className="stat-bottom">
            {confirmedCount} confirmed or locked orders
          </div>
        </article>
      </section>

      <section className="panel enquiries-panel">
        <div className="panel-heading">
          <div>
            <h3>Procurement Records</h3>
            <p>Manage your suppliers, orders and bills.</p>
          </div>

          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
          >
            <option value="Orders">Purchase Orders</option>
            <option value="Suppliers">Suppliers</option>
            <option value="Bills">Vendor Bills</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            {tab === "Orders" && (
              <>
                <thead>
                  <tr>
                    <th>REFERENCE</th>
                    <th>SUPPLIER</th>
                    <th>ORDER DATE</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6">Loading purchase orders...</td>
                    </tr>
                  ) : orders.length ? (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.name}</strong></td>
                        <td>{order.partner_id?.[1] || "—"}</td>
                        <td>
                          {order.date_order?.slice(0, 10) || "—"}
                        </td>
                        <td className="amount">
                          {money(order.amount_total)}
                        </td>
                        <td>
                          <span className={`status ${order.state}`}>
                            {statusLabel(order.state)}
                          </span>
                        </td>
                        <td>
                          {["draft", "sent"].includes(order.state) ? (
                            <button
                              className="secondary-button"
                              onClick={() => handleConfirmOrder(order)}
                            >
                              Confirm
                            </button>
                          ) : null}
                          <RecordActions model="purchase.order" record={order} fields={[
                            { name: "origin", label: "Source document" },
                            { name: "notes", label: "Purchase terms", type: "textarea" },
                          ]} onRefresh={loadPurchaseData} allowDelete={["draft", "sent"].includes(order.state)} disabled={!(["draft", "sent"].includes(order.state))} disabledReason="Only draft or RFQ-sent purchase orders can be edited or deleted." />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">No purchase orders found.</td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

            {tab === "Suppliers" && (
              <>
                <thead>
                  <tr>
                    <th>SUPPLIER</th>
                    <th>PHONE</th>
                    <th>EMAIL</th>
                    <th>LOCATION</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5">Loading suppliers...</td>
                    </tr>
                  ) : suppliers.length ? (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td><strong>{supplier.name}</strong></td>
                        <td>{supplier.phone || "—"}</td>
                        <td>{supplier.email || "—"}</td>
                        <td>
                          {[supplier.city, supplier.street]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>
                        <td><RecordActions model="res.partner" record={supplier} fields={[
                          { name: "name", label: "Supplier name", required: true },
                          { name: "phone", label: "Phone", type: "tel" },
                          { name: "email", label: "Email", type: "email" },
                          { name: "street", label: "Street" },
                          { name: "city", label: "City" },
                        ]} onRefresh={loadPurchaseData} archive /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">No suppliers found in Odoo.</td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

            {tab === "Bills" && (
              <>
                <thead>
                  <tr>
                    <th>BILL REFERENCE</th>
                    <th>SUPPLIER</th>
                    <th>BILL DATE</th>
                    <th>TOTAL</th>
                    <th>AMOUNT DUE</th>
                    <th>PAYMENT STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7">Loading vendor bills...</td>
                    </tr>
                  ) : bills.length ? (
                    bills.map((bill) => (
                      <tr key={bill.id}>
                        <td><strong>{bill.name}</strong></td>
                        <td>{bill.partner_id?.[1] || "—"}</td>
                        <td>{bill.invoice_date || "—"}</td>
                        <td className="amount">
                          {money(bill.amount_total)}
                        </td>
                        <td className="amount">
                          {money(bill.amount_residual)}
                        </td>
                        <td>
                          <span className={`status ${bill.payment_state}`}>
                            {bill.payment_state || bill.state}
                          </span>
                        </td>
                        <td><RecordActions model="account.move" record={bill} fields={[
                          { name: "invoice_date", label: "Bill date", type: "date" },
                          { name: "invoice_date_due", label: "Due date", type: "date" },
                          { name: "ref", label: "Bill reference" },
                        ]} onRefresh={loadPurchaseData} allowDelete={bill.state === "draft"} disabled={bill.state !== "draft"} disabledReason="Only draft vendor bills can be edited or deleted." /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7">No vendor bills found.</td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </section>

      {showForm && (
        <div className="modal-overlay">
          <form
            className="enquiry-modal"
            onSubmit={handleCreatePurchase}
          >
            <div className="modal-heading">
              <div>
                <h2>New Purchase Order</h2>
                <p>Create a purchase order in Odoo.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <label>Supplier</label>
            <select
              name="supplier"
              value={form.supplier}
              onChange={updateForm}
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <label>Product</label>
            <select
              name="product"
              value={form.product}
              onChange={updateForm}
              required
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.default_code
                    ? ` (${product.default_code})`
                    : ""}
                </option>
              ))}
            </select>

            <label>Quantity</label>
            <input
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={updateForm}
              required
            />

            <label>Unit Purchase Price (₹)</label>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={updateForm}
              required
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Purchase Order"}
              </button>
            </div>
          </form>
        </div>
      )}
            {showSupplierForm && (
        <div className="modal-overlay">
          <form
            className="enquiry-modal"
            onSubmit={handleCreateSupplier}
          >
            <div className="modal-heading">
              <div>
                <h2>Add New Supplier</h2>
                <p>Register a supplier in Odoo.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowSupplierForm(false)}
              >
                ×
              </button>
            </div>

            <label>Supplier / Company Name *</label>
            <input
              name="name"
              value={supplierForm.name}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  name: e.target.value,
                })
              }
              required
            />

            <label>Phone Number</label>
            <input
              name="phone"
              value={supplierForm.phone}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  phone: e.target.value,
                })
              }
            />

            <label>Email</label>
            <input
              name="email"
              type="email"
              value={supplierForm.email}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  email: e.target.value,
                })
              }
            />

            <label>Street Address</label>
            <input
              name="street"
              value={supplierForm.street}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  street: e.target.value,
                })
              }
            />

            <label>City</label>
            <input
              name="city"
              value={supplierForm.city}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  city: e.target.value,
                })
              }
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowSupplierForm(false)}
                disabled={savingSupplier}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={savingSupplier}
              >
                {savingSupplier ? "Saving..." : "Save Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showBillForm && (
  <div className="modal-overlay">
    <form
      className="enquiry-modal"
      onSubmit={handleCreateBill}
    >
      <div className="modal-heading">
        <div>
          <h2>Create Vendor Bill</h2>
          <p>Create a draft vendor bill in Odoo.</p>
        </div>

        <button
          type="button"
          className="close-button"
          onClick={() => setShowBillForm(false)}
        >
          ×
        </button>
      </div>

      <label>Supplier *</label>
      <select
        value={billForm.partner_id}
        onChange={(e) =>
          setBillForm({
            ...billForm,
            partner_id: e.target.value,
          })
        }
        required
      >
        <option value="">Select supplier</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </select>

      <label>Bill Reference</label>
      <input
        value={billForm.ref}
        onChange={(e) =>
          setBillForm({ ...billForm, ref: e.target.value })
        }
        placeholder="e.g. INV-2026-001"
      />

      <label>Bill Date *</label>
      <input
        type="date"
        value={billForm.invoice_date}
        onChange={(e) =>
          setBillForm({
            ...billForm,
            invoice_date: e.target.value,
          })
        }
        required
      />

      <label>Due Date</label>
      <input
        type="date"
        value={billForm.invoice_date_due}
        onChange={(e) =>
          setBillForm({
            ...billForm,
            invoice_date_due: e.target.value,
          })
        }
      />

      <label>Product *</label>
      <select
        value={billForm.product_id}
        onChange={(e) => {
          const selected = products.find(
            (p) => p.id === Number(e.target.value)
          );

          setBillForm({
            ...billForm,
            product_id: e.target.value,
            price: selected ? String(selected.list_price) : "",
            description: selected?.name || "",
          });
        }}
        required
      >
        <option value="">Select product</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>

      <label>Description</label>
      <input
        value={billForm.description}
        onChange={(e) =>
          setBillForm({
            ...billForm,
            description: e.target.value,
          })
        }
      />

      <label>Quantity</label>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={billForm.quantity}
        onChange={(e) =>
          setBillForm({
            ...billForm,
            quantity: e.target.value,
          })
        }
        required
      />

      <label>Unit Price (₹)</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={billForm.price}
        onChange={(e) =>
          setBillForm({
            ...billForm,
            price: e.target.value,
          })
        }
        required
      />

      <div className="modal-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setShowBillForm(false)}
          disabled={savingBill}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-button"
          disabled={savingBill}
        >
          {savingBill ? "Saving..." : "Save Draft Bill"}
        </button>
      </div>
    </form>
  </div>
)}

    </>
  );
}


function DashboardPage({ onNavigate }) {
  const [range, setRange] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      const result = await getDashboardData();
      setData(result);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Unable to load dashboard data from Odoo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const today = new Date();
  const startDate = range === "all"
    ? null
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(range) + 1);

  const inRange = (value) => {
    if (!value || !startDate) return true;
    const parsed = new Date(String(value).replace(" ", "T") + (String(value).length === 10 ? "T00:00:00" : ""));
    return !Number.isNaN(parsed.getTime()) && parsed >= startDate && parsed <= today;
  };

  const enquiries = (data?.enquiries || []).filter((x) => inRange(x.create_date));
  const followups = (data?.followups || []).filter((x) => inRange(x.followup_date));
  const quotations = (data?.quotations || []).filter((x) => inRange(x.create_date));
  const invoices = (data?.invoices || []).filter((x) => inRange(x.invoice_date || x.create_date));
  const pendingFollowups = followups.filter((x) => x.status === "pending");
  const dueFollowups = pendingFollowups.filter((x) => (x.followup_date || "").slice(0, 10) <= today.toISOString().slice(0, 10));
  const siteVisits = followups.filter((x) => x.followup_type === "site_visit");
  const sentQuotes = quotations.filter((x) => ["sent", "sale", "done"].includes(x.state));
  const confirmedOrders = quotations.filter((x) => ["sale", "done"].includes(x.state));
  const postedInvoices = invoices.filter((x) => x.state === "posted");
  const revenue = postedInvoices.reduce((sum, x) => sum + Number(x.amount_total || 0), 0);
  const outstanding = postedInvoices.reduce((sum, x) => sum + Number(x.amount_residual || 0), 0);
  const cashReceived = Math.max(0, revenue - outstanding);
  const residential = enquiries.filter((x) => x.solar_customer_type === "residential").length;
  const commercial = enquiries.filter((x) => x.solar_customer_type === "commercial").length;
  const stageCounts = Object.values(enquiries.reduce((acc, lead) => {
    const stage = lead.stage_id?.[1] || "Unstaged";
    acc[stage] = acc[stage] || { label: stage, count: 0 };
    acc[stage].count += 1;
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 5);

  const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const monthKey = (value) => {
    if (!value) return "";
    const d = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const monthLabel = (key) => key
    ? new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" })
    : "";

  const monthKeys = Array.from({ length: range === "30" ? 6 : 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const revenueByMonth = monthKeys.map((key) => ({
    key,
    label: monthLabel(key),
    value: postedInvoices.filter((x) => monthKey(x.invoice_date || x.create_date) === key)
      .reduce((sum, x) => sum + Number(x.amount_total || 0), 0),
  }));
  const enquiryByMonth = monthKeys.map((key) => ({
    key,
    label: monthLabel(key),
    value: enquiries.filter((x) => monthKey(x.create_date) === key).length,
  }));
  const maxRevenue = Math.max(1, ...revenueByMonth.map((x) => x.value));
  const maxEnquiries = Math.max(1, ...enquiryByMonth.map((x) => x.value));
  const chartCoordinates = enquiryByMonth.map((point, index) => ({
    x: 30 + index * 90,
    y: 150 - (point.value / maxEnquiries) * 115,
  }));
  const points = chartCoordinates.map((point, index) =>
    `${index === 0 ? "M" : "L"}${point.x},${point.y}`
  ).join(" ");

  const cards = [
    ["Total Enquiries", enquiries.length, "All enquiries in selected period", "◈"],
    ["Follow-ups Due", dueFollowups.length, "Pending and due today or overdue", "◷"],
    ["Site Surveys", siteVisits.length, "Recorded site-visit follow-ups", "⌖"],
    ["Quotations Sent", sentQuotes.length, "Sent or accepted quotations", "▤"],
    ["Confirmed Orders", confirmedOrders.length, "Sales orders confirmed", "✓"],
    ["Active Installations", "—", "Installation tracking is not connected", "⌂"],
    ["Revenue", money(revenue), "Posted customer invoices", "₹"],
    ["Cash Received", money(cashReceived), "Paid amount on posted invoices", "↙"],
    ["Outstanding", money(outstanding), "Balance due on posted invoices", "◌"],
  ];

  return (
    <>
      <section className="welcome-row dashboard-welcome">
        <div>
          <p className="eyebrow">{today.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</p>
          <h1>Dashboard Overview</h1>
          <p className="subtitle">A live overview of your solar business performance.</p>
        </div>
        <div className="welcome-actions">
          <select className="dashboard-range" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Dashboard date range">
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button className="secondary-button" onClick={loadDashboard} disabled={loading}>↻ Refresh</button>
          <button className="primary-button" onClick={() => onNavigate("Enquiries")}>＋ New Enquiry</button>
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}
      {loading && !data ? <div className="panel dashboard-loading">Loading live business data from Odoo…</div> : (
        <>
          <section className="stats-grid dashboard-stats">
            {cards.map(([label, value, note, icon]) => (
              <article className="stat-card" key={label}>
                <div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div>
                <h2>{loading ? "…" : value}</h2>
                <div className="stat-bottom">{note}</div>
              </article>
            ))}
          </section>

          <section className="dashboard-chart-grid">
            <article className="panel dashboard-chart-panel">
              <div className="panel-heading">
                <div><h3>Enquiry Growth</h3><p>New enquiries by month · based on Odoo creation dates</p></div>
              </div>
              <div className="line-chart-wrap">
                <svg viewBox="0 0 520 190" role="img" aria-label="Monthly enquiry growth line chart">
                  {[35, 75, 115, 155].map((y) => <line key={y} x1="30" y1={y} x2="480" y2={y} className="chart-grid-line" />)}
                  <path d={points} className="enquiry-line" />
                  {enquiryByMonth.map((p, i) => {
                    const x = 30 + i * 90;
                    const y = 150 - (p.value / maxEnquiries) * 115;
                    return <g key={p.key}><circle cx={x} cy={y} r="4.5" className="chart-point"><title>{`${p.label}: ${p.value} enquiries`}</title></circle><text x={x} y="178" textAnchor="middle">{p.label}</text></g>;
                  })}
                </svg>
              </div>
            </article>

            <article className="panel pipeline-panel">
              <div className="panel-heading"><div><h3>Lead Conversion Funnel</h3><p>Current enquiry stages in selected period</p></div></div>
              {stageCounts.length ? stageCounts.map((stage) => (
                <div className="pipeline-row" key={stage.label}>
                  <div><span>{stage.label}</span><strong>{stage.count}</strong></div>
                  <div className="progress-track"><div style={{ width: `${(stage.count / Math.max(1, enquiries.length)) * 100}%` }} /></div>
                </div>
              )) : <p className="empty-chart">No enquiry stage data available.</p>}
            </article>
          </section>

          <section className="dashboard-chart-grid dashboard-lower-grid">
            <article className="panel dashboard-chart-panel">
              <div className="panel-heading"><div><h3>Monthly Revenue</h3><p>Posted customer invoices · gross invoice value</p></div></div>
              <div className="revenue-bars">
                {revenueByMonth.map((item) => (
                  <div className="revenue-bar-item" key={item.key}>
                    <strong>{item.value ? money(item.value) : "—"}</strong>
                    <div className="revenue-bar-track"><div style={{ height: `${(item.value / maxRevenue) * 100}%` }} /></div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel customer-mix-panel">
              <div className="panel-heading"><div><h3>Customer Mix</h3><p>Residential vs commercial enquiries</p></div></div>
              <div className="customer-mix-content">
                <div className="donut-chart" style={{ "--residential": `${enquiries.length ? residential / enquiries.length * 100 : 0}%` }}>
                  <div><strong>{enquiries.length}</strong><span>Enquiries</span></div>
                </div>
                <div className="donut-legend">
                  <p><i className="legend-residential" />Residential <strong>{residential}</strong></p>
                  <p><i className="legend-commercial" />Commercial <strong>{commercial}</strong></p>
                  <p className="mix-note">Unclassified: {Math.max(0, enquiries.length - residential - commercial)}</p>
                </div>
              </div>
            </article>
          </section>

          <section className="panel enquiries-panel">
            <div className="panel-heading">
              <div><h3>Recent Enquiries</h3><p>Latest enquiry records retrieved from Odoo</p></div>
              <button className="secondary-button" onClick={() => onNavigate("Enquiries")}>View all enquiries →</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>CUSTOMER</th><th>LOCATION</th><th>TYPE</th><th>CAPACITY</th><th>STAGE</th><th>EST. VALUE</th></tr></thead>
                <tbody>
                  {enquiries.slice().sort((a, b) => String(b.create_date || "").localeCompare(String(a.create_date || ""))).slice(0, 6).map((lead) => (
                    <tr key={lead.id}>
                      <td><strong>{lead.contact_name || lead.partner_name || lead.name || "Unnamed"}</strong></td>
                      <td>{lead.solar_location || "—"}</td>
                      <td>{lead.solar_customer_type || "—"}</td>
                      <td>{lead.solar_capacity ? `${lead.solar_capacity} kW` : "—"}</td>
                      <td><span className="status">{lead.stage_id?.[1] || "Unstaged"}</span></td>
                      <td className="amount">{lead.expected_revenue ? money(lead.expected_revenue) : "—"}</td>
                    </tr>
                  ))}
                  {!enquiries.length && <tr><td colSpan="6">No enquiries found for this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <div className="dashboard-footnote">
            <span>Data source: Odoo CRM, Sales and Accounting.</span>
            <span>Active installations are not shown because the current API does not expose a verified installation status/model.</span>
          </div>
        </>
      )}
    </>
  );
}



const inr = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const displayDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";
const todayISO = () => new Date().toISOString().slice(0, 10);

function ModuleHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading module-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function EmployeesModule() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", work_email: "", work_phone: "", department_id: "", job_title: "", joining_date: "" });
  const load = async () => {
    setLoading(true); setError("");
    try {
      const [people, teams] = await Promise.all([getEmployeesSafe(), getDepartmentsSafe()]);
      setEmployees(people); setDepartments(teams);
    } catch (e) { setError(e.message || "Unable to load employees."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const fields = await getModelFields("hr.employee");
      const values = { name: form.name.trim() };
      ["work_email", "work_phone", "job_title"].forEach((key) => { if (fields[key] && form[key]) values[key] = form[key]; });
      if (fields.department_id && form.department_id) values.department_id = Number(form.department_id);
      await createEmployee(values);
      setForm({ name: "", work_email: "", work_phone: "", department_id: "", job_title: "", joining_date: "" });
      setShowForm(false); await load();
    } catch (e2) { setError(e2.message || "Unable to create employee."); }
    finally { setSaving(false); }
  };
  return <>
    <ModuleHeading eyebrow="HUMAN RESOURCES" title="Employees" description="Employee directory connected to Odoo HR." action={<button className="primary-button" onClick={() => setShowForm((v) => !v)}>＋ Add employee</button>} />
    {error && <div className="module-alert">{error}</div>}
    {showForm && <section className="panel module-form-panel"><div className="panel-heading"><div><h3>New employee</h3><p>Creates an employee record in Odoo.</p></div></div>
      <form className="module-form-grid" onSubmit={save}>
        <label>Employee name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name"/></label>
        <label>Work email<input type="email" value={form.work_email} onChange={e=>setForm({...form,work_email:e.target.value})} placeholder="name@company.com"/></label>
        <label>Phone<input value={form.work_phone} onChange={e=>setForm({...form,work_phone:e.target.value})} placeholder="+91"/></label>
        <label>Designation<input value={form.job_title} onChange={e=>setForm({...form,job_title:e.target.value})} placeholder="Technician / Sales Executive"/></label>
        <label>Joining date<input type="date" value={form.joining_date} onChange={e=>setForm({...form,joining_date:e.target.value})}/></label>
        <label>Joining date<input type="date" value={form.joining_date} onChange={e=>setForm({...form,joining_date:e.target.value})}/></label>
        <label>Department<select value={form.department_id} onChange={e=>setForm({...form,department_id:e.target.value})}><option value="">Select department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <div className="module-form-actions"><button className="secondary-button" type="button" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?"Saving…":"Create employee"}</button></div>
      </form>
    </section>}
    <div className="module-kpis"><div className="panel module-kpi"><span>Total employees</span><strong>{employees.length}</strong></div><div className="panel module-kpi"><span>Active employees</span><strong>{employees.filter(x=>x.active!==false).length}</strong></div><div className="panel module-kpi"><span>Departments</span><strong>{departments.length}</strong></div></div>
    <section className="panel module-table-panel"><div className="panel-heading"><div><h3>Employee directory</h3><p>{employees.length} records from Odoo</p></div><button className="secondary-button" onClick={load}>↻ Refresh</button></div>
      {loading?<div className="module-empty">Loading employees…</div>:<div className="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>DESIGNATION</th><th>EMAIL</th><th>PHONE</th><th>JOINED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      {employees.map(emp=><tr key={emp.id}><td><strong>{emp.name}</strong><small className="module-subtext">EMP-{String(emp.id).padStart(4,"0")}</small></td><td>{emp.department_id?.[1]||"—"}</td><td>{emp.job_id?.[1]||emp.job_title||"—"}</td><td>{emp.work_email||"—"}</td><td>{emp.work_phone||"—"}</td><td>{displayDate(emp.first_contract_date)}</td><td><span className={`status ${emp.active===false?"cancel":"paid"}`}>{emp.active===false?"Inactive":"Active"}</span></td><td><RecordActions model="hr.employee" record={emp} fields={[{name:"name",label:"Employee name",required:true},{name:"work_email",label:"Work email",type:"email"},{name:"work_phone",label:"Work phone",type:"tel"},{name:"job_title",label:"Designation"}]} onRefresh={load} archive /></td></tr>)}
      {!employees.length&&<tr><td colSpan="8">No employee records found.</td></tr>}</tbody></table></div>}
    </section>
  </>;
}

function AttendanceModule() {
  const [employees,setEmployees]=useState([]); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const load=async()=>{setLoading(true);setError("");try{const [p,a]=await Promise.all([getEmployeesSafe(),getAttendanceSafe()]);setEmployees(p);setRows(a);if(!selected&&p.length)setSelected(String(p[0].id));}catch(e){setError(e.message||"Unable to load attendance.");}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const activeRows=rows.filter(r=>!r.check_out);
  const runAction=async(kind)=>{
    if(!selected)return;setBusy(true);setError("");
    try{const current=activeRows.find(r=>String(r.employee_id?.[0])===selected);if(kind==="out"&&current)await employeeCheckOut(current.id);else if(kind==="in"&&!current)await employeeCheckIn(Number(selected));await load();}
    catch(e){setError(e.message||"Attendance action failed.");}finally{setBusy(false);}
  };
  return <>
    <ModuleHeading eyebrow="HUMAN RESOURCES" title="Attendance" description="Employee check-in, check-out and working-hour history."/>
    {error&&<div className="module-alert">{error}</div>}
    <section className="panel attendance-action-panel"><div><h3>Attendance terminal</h3><p>Record attendance directly in Odoo.</p></div><div className="attendance-controls"><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select><button className="primary-button" disabled={busy||!selected||activeRows.some(r=>String(r.employee_id?.[0])===selected)} onClick={()=>runAction("in")}>{busy?"Please wait…":"Check in"}</button><button className="secondary-button" disabled={busy||!selected||!activeRows.some(r=>String(r.employee_id?.[0])===selected)} onClick={()=>runAction("out")}>Check out</button></div></section>
    <div className="module-kpis"><div className="panel module-kpi"><span>Attendance records</span><strong>{rows.length}</strong></div><div className="panel module-kpi"><span>Currently checked in</span><strong>{activeRows.length}</strong></div><div className="panel module-kpi"><span>Employees</span><strong>{employees.length}</strong></div></div>
    <section className="panel module-table-panel"><div className="panel-heading"><div><h3>Attendance history</h3><p>Latest records · Odoo HR Attendance</p></div><button className="secondary-button" onClick={load}>↻ Refresh</button></div>
      {loading?<div className="module-empty">Loading attendance…</div>:<div className="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>CHECK IN</th><th>CHECK OUT</th><th>WORKED HOURS</th><th>STATUS</th></tr></thead><tbody>
      {rows.map(r=><tr key={r.id}><td><strong>{r.employee_id?.[1]||"Unknown employee"}</strong></td><td>{r.check_in?new Date(r.check_in.replace(" ","T")).toLocaleString("en-IN"):"—"}</td><td>{r.check_out?new Date(r.check_out.replace(" ","T")).toLocaleString("en-IN"):"—"}</td><td>{r.worked_hours==null?"—":`${Number(r.worked_hours).toFixed(2)} hrs`}</td><td><span className={`status ${r.check_out?"paid":"pending"}`}>{r.check_out?"Checked out":"Working"}</span></td></tr>)}
      {!rows.length&&<tr><td colSpan="5">No attendance records found.</td></tr>}</tbody></table></div>}
    </section>
  </>;
}

function PayrollModule() {
  const [data,setData]=useState({metadata:{},payslips:[],structures:[],salaryRules:[]}); const [employees,setEmployees]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const load=async()=>{setLoading(true);setError("");try{const [overview,people]=await Promise.all([getPayrollOverview(),getEmployeesSafe()]);setData(overview);setEmployees(people);}catch(e){setError(e.message||"Unable to load payroll.");}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const meta=data.metadata||{}; const payslipMeta=meta["hr.payslip"]||{}; const versionMeta=meta["hr.version"]||{};
  const stateLabel=(s)=>({draft:"Draft",verify:"Waiting",done:"Done",cancel:"Cancelled"}[s]||s||"—");
  const wageFields=["wage","monthly_wage","salary","contract_wage"].filter(f=>versionMeta[f]);
  return <>
    <ModuleHeading eyebrow="HUMAN RESOURCES · PAYROLL" title="Payroll & Salary" description="Monthly salary records and payslips from OCA Payroll." action={<button className="secondary-button" onClick={load}>↻ Refresh</button>}/>
    {error&&<div className="module-alert">{error}</div>}
    <div className="module-kpis"><div className="panel module-kpi"><span>Employees</span><strong>{employees.length}</strong></div><div className="panel module-kpi"><span>Payslips</span><strong>{data.payslips.length}</strong></div><div className="panel module-kpi"><span>Payroll engine</span><strong className="module-kpi-word">{payslipMeta.__error?"Unavailable":"Connected"}</strong></div></div>
    <section className="panel module-table-panel"><div className="panel-heading"><div><h3>Monthly payslips</h3><p>Records stored in Odoo Payroll</p></div></div>
      {loading?<div className="module-empty">Loading payroll…</div>:<div className="table-wrap"><table><thead><tr><th>REFERENCE</th><th>EMPLOYEE</th><th>PERIOD</th><th>STRUCTURE</th><th>NET / TOTAL</th><th>STATUS</th></tr></thead><tbody>
      {data.payslips.map(p=><tr key={p.id}><td><strong>{p.number||p.name||`Payslip #${p.id}`}</strong></td><td>{p.employee_id?.[1]||"—"}</td><td>{displayDate(p.date_from)} – {displayDate(p.date_to)}</td><td>{p.struct_id?.[1]||"—"}</td><td>{p.net_wage!=null?inr(p.net_wage):p.total_net!=null?inr(p.total_net):p.total!=null?inr(p.total):"—"}</td><td><span className={`status ${p.state==="done"?"paid":"pending"}`}>{stateLabel(p.state)}</span></td></tr>)}
      {!data.payslips.length&&<tr><td colSpan="6">No payslips found yet. Configure a salary structure and salary rules in Odoo before generating the first payslip.</td></tr>}</tbody></table></div>}
    </section>
    <section className="panel module-table-panel"><div className="panel-heading"><div><h3>Salary structures & rules</h3><p>Configured in OCA Payroll</p></div></div>
      <div className="module-salary-grid"><div><strong>Salary structures ({(data.structures||[]).length})</strong><span>{(data.structures||[]).map(x=>x.name).join(", ")||"No salary structures configured yet."}</span></div><div><strong>Salary rules ({(data.salaryRules||[]).length})</strong><span>{(data.salaryRules||[]).map(x=>x.name).join(", ")||"No salary rules configured yet."}</span></div><div><strong>Payroll period</strong><span>Monthly · India · INR</span></div></div>
    </section>
    <section className="panel module-info-panel"><div className="panel-heading"><div><h3>Basic Indian salary setup</h3><p>Initial Kerala configuration · statutory calculations are not enabled.</p></div><span className="status pending">Setup required</span></div>
      <div className="module-salary-grid"><div><strong>Earnings</strong><span>Basic salary · HRA · DA · Conveyance · Special allowance</span></div><div><strong>Deductions</strong><span>Salary advance · Other approved deductions</span></div><div><strong>Calculation</strong><span>Gross earnings − deductions = net payable</span></div></div>
      <p className="module-note">Payroll models detected: {Object.entries(meta).filter(([,v])=>!v.__error).map(([k])=>k).join(", ")||"—"}. {wageFields.length?`Employee salary fields detected: ${wageFields.join(", ")}.`:"Employee wage field not yet confirmed; salary will not be written to an assumed field."} PF, ESI, Kerala Professional Tax and TDS are intentionally excluded until separately verified.</p>
    </section>
  </>;
}

function InvoicesModule() {
  const [invoices,setInvoices]=useState([]); const [customers,setCustomers]=useState([]); const [products,setProducts]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [show,setShow]=useState(false); const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({partnerId:"",productId:"",invoiceDate:todayISO(),dueDate:"",description:"",quantity:"1",price:""});
  const load=async()=>{setLoading(true);setError("");try{const [i,c,p]=await Promise.all([getCustomerInvoices(),getInvoiceCustomers(),getInventoryProducts()]);setInvoices(i);setCustomers(c);setProducts(p);}catch(e){setError(e.message||"Unable to load invoices.");}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const save=async(e)=>{e.preventDefault();setSaving(true);setError("");try{const id=await createCustomerInvoice({partnerId:form.partnerId,invoiceDate:form.invoiceDate,dueDate:form.dueDate,lines:[{name:form.description,product_id:form.productId,quantity:form.quantity,price_unit:form.price}]});setShow(false);setForm({...form,partnerId:"",productId:"",description:"",price:""});await load();setError(`Draft invoice created successfully (ID ${id}). Post it after reviewing the invoice in Odoo.`);}catch(err){setError(err.message||"Invoice creation failed.");}finally{setSaving(false);}};
  const post=async(id)=>{if(!window.confirm("Post this customer invoice in Odoo? This creates an accounting entry."))return;try{await postCustomerInvoice(id);await load();}catch(e){setError(e.message||"Unable to post invoice.");}};
  return <>
    <ModuleHeading eyebrow="FINANCE" title="Customer Invoices" description="Create, review and post customer invoices in Odoo Accounting." action={<button className="primary-button" onClick={()=>setShow(v=>!v)}>＋ New invoice</button>}/>
    {error&&<div className="module-alert">{error}</div>}
    {show&&<section className="panel module-form-panel"><div className="panel-heading"><div><h3>Create customer invoice</h3><p>Creates a draft customer invoice in Odoo.</p></div></div><form className="module-form-grid" onSubmit={save}>
      <label>Customer<select required value={form.partnerId} onChange={e=>setForm({...form,partnerId:e.target.value})}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Invoice date<input type="date" required value={form.invoiceDate} onChange={e=>setForm({...form,invoiceDate:e.target.value})}/></label>
      <label>Due date<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label>
      <label>Product / Service<select required value={form.productId} onChange={e=>{const p=products.find(x=>String(x.id)===e.target.value);setForm({...form,productId:e.target.value,description:p?.name||"",price:p?.list_price!=null?String(p.list_price):form.price});}}><option value="">Select a product or service</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Invoice line description<input required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <label>Quantity<input type="number" min="0.01" step="0.01" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
      <label>Unit price (₹)<input type="number" min="0.01" step="0.01" required value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
      <div className="module-form-actions"><button type="button" className="secondary-button" onClick={()=>setShow(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?"Creating…":"Create draft"}</button></div>
    </form></section>}
    <div className="module-kpis"><div className="panel module-kpi"><span>Total invoices</span><strong>{invoices.length}</strong></div><div className="panel module-kpi"><span>Posted invoices</span><strong>{invoices.filter(x=>x.state==="posted").length}</strong></div><div className="panel module-kpi"><span>Outstanding</span><strong>{inr(invoices.filter(x=>x.state==="posted").reduce((s,x)=>s+Number(x.amount_residual||0),0))}</strong></div></div>
    <section className="panel module-table-panel"><div className="panel-heading"><div><h3>Invoice register</h3><p>Customer invoices · Odoo Accounting</p></div><button className="secondary-button" onClick={load}>↻ Refresh</button></div>
      {loading?<div className="module-empty">Loading invoices…</div>:<div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>INVOICE DATE</th><th>DUE DATE</th><th>TOTAL</th><th>RESIDUAL</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      {invoices.map(x=><tr key={x.id}><td><strong>{x.name||`Draft #${x.id}`}</strong></td><td>{x.partner_id?.[1]||"—"}</td><td>{displayDate(x.invoice_date)}</td><td>{displayDate(x.invoice_date_due)}</td><td>{inr(x.amount_total)}</td><td>{inr(x.amount_residual)}</td><td><span className={`status ${x.state==="posted"?"paid":"pending"}`}>{x.state==="posted"?(x.payment_state||"Posted"):"Draft"}</span></td><td>{x.state==="draft"?<><button className="table-action-button" onClick={()=>post(x.id)}>Post</button><RecordActions model="account.move" record={x} fields={[{name:"invoice_date",label:"Invoice date",type:"date"},{name:"invoice_date_due",label:"Due date",type:"date"},{name:"ref",label:"Reference"},{name:"narration",label:"Notes",type:"textarea"}]} onRefresh={load} allowDelete /></>:"Posted · Locked"}</td></tr>)}
      {!invoices.length&&<tr><td colSpan="8">No customer invoices found.</td></tr>}</tbody></table></div>}
    </section>
  </>;
}

function PaymentsModule() {
  const [payments,setPayments]=useState([]); const [customers,setCustomers]=useState([]); const [employees,setEmployees]=useState([]); const [journals,setJournals]=useState([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const [kind,setKind]=useState("receipt"); const [form,setForm]=useState({partnerId:"",amount:"",date:todayISO(),journalId:"",ref:""});
  const load=async()=>{setLoading(true);setError("");try{const [p,c,e,j]=await Promise.all([getPaymentRecords(),getInvoiceCustomers(),getEmployeesSafe(),getPaymentJournals()]);setPayments(p);setCustomers(c);setEmployees(e);setJournals(j);if(!form.journalId&&j.length)setForm(v=>({...v,journalId:String(j[0].id)}));}catch(err){setError(err.message||"Unable to load payment records.");}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const save=async(e)=>{e.preventDefault();const confirmLabel=kind==="salary"?"Post this employee salary payment to Odoo Accounting?":"Post this customer receipt to Odoo Accounting?";if(!window.confirm(confirmLabel))return;setSaving(true);setError("");try{let partnerId=form.partnerId;let partnerType="customer";let paymentType="inbound";if(kind==="salary"){const employee=employees.find(x=>String(x.id)===partnerId);if(!employee?.work_contact_id?.[0])throw new Error("This employee has no linked work contact in Odoo. Add a work contact before recording a salary payment.");partnerId=employee.work_contact_id[0];partnerType="supplier";paymentType="outbound";}
    await createPaymentRecord({partnerId,amount:form.amount,date:form.date,journalId:form.journalId,paymentType,partnerType,ref:form.ref||(kind==="salary"?"Employee salary payment":"Customer receipt")});setForm(v=>({...v,partnerId:"",amount:"",ref:""}));await load();setError("Payment posted to Odoo Accounting.");}catch(err){setError(err.message||"Payment creation failed.");}finally{setSaving(false);}};
  return <>
    <ModuleHeading eyebrow="FINANCE" title="Payments" description="Customer receipts and employee salary payment records."/>
    {error&&<div className="module-alert">{error}</div>}
    <section className="panel module-form-panel"><div className="panel-heading"><div><h3>Record a payment</h3><p>Posts an inbound receipt or outbound employee payment in Odoo Accounting.</p></div></div>
      <form className="module-form-grid" onSubmit={save}>
        <label>Payment type<select value={kind} onChange={e=>{setKind(e.target.value);setForm(v=>({...v,partnerId:""}));}}><option value="receipt">Customer receipt</option><option value="salary">Employee salary payment</option></select></label>
        <label>{kind==="salary"?"Employee":"Customer"}<select required value={form.partnerId} onChange={e=>setForm({...form,partnerId:e.target.value})}><option value="">Select {kind==="salary"?"employee":"customer"}</option>{(kind==="salary"?employees:customers).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Amount (₹)<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        <label>Payment date<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
        <label>Journal<select required value={form.journalId} onChange={e=>setForm({...form,journalId:e.target.value})}><option value="">Select bank / cash journal</option>{journals.map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select></label>
        <label>Reference<input value={form.ref} onChange={e=>setForm({...form,ref:e.target.value})} placeholder="Receipt / salary month"/></label>
        <div className="module-form-actions"><button className="primary-button" disabled={saving||!journals.length}>{saving?"Posting…":kind==="salary"?"Post salary payment":"Post customer receipt"}</button></div>
      </form>
      {!journals.length&&!loading&&<p className="module-note">No active bank/cash journals found. Configure a bank or cash journal in Odoo Accounting first.</p>}
    </section>
    <div className="module-kpis"><div className="panel module-kpi"><span>Payment records</span><strong>{payments.length}</strong></div><div className="panel module-kpi"><span>Inbound receipts</span><strong>{payments.filter(p=>p.payment_type==="inbound").length}</strong></div><div className="panel module-kpi"><span>Outbound payments</span><strong>{payments.filter(p=>p.payment_type==="outbound").length}</strong></div></div>
    <section className="panel module-table-panel"><div className="panel-heading"><div><h3>Payment register</h3><p>Posted and draft payment records from Odoo</p></div><button className="secondary-button" onClick={load}>↻ Refresh</button></div>
      {loading?<div className="module-empty">Loading payments…</div>:<div className="table-wrap"><table><thead><tr><th>REFERENCE</th><th>PARTNER</th><th>TYPE</th><th>DATE</th><th>JOURNAL</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>
      {payments.map(p=><tr key={p.id}><td><strong>{p.name||p.ref||`Payment #${p.id}`}</strong></td><td>{p.partner_id?.[1]||"—"}</td><td>{p.payment_type==="inbound"?"Receipt":"Payment"}</td><td>{displayDate(p.date)}</td><td>{p.journal_id?.[1]||"—"}</td><td>{inr(p.amount)}</td><td><span className={`status ${p.state==="posted"?"paid":"pending"}`}>{p.state||"—"}</span></td></tr>)}
      {!payments.length&&<tr><td colSpan="7">No payment records found.</td></tr>}</tbody></table></div>}
    </section>
  </>;
}

function App() {
  const [active, setActive] = useState("Dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState({ name: "Odoo User", username: "", isAdmin: false });
  const profileMenuRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("ranzom-solar-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ranzom-solar-theme", theme);
    } catch (error) {
      console.warn("Unable to save theme preference:", error);
    }
  }, [theme]);


    useEffect(() => {
  async function checkSession() {
    try {
      const response = await fetch(
        "/odoo-api/web/session/get_session_info",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {},
            id: Date.now(),
          }),
        }
      );

      const data = await response.json();

      if (data.result?.uid) {
        const user = data.result;
        setSessionUser({
          name: user.name || user.partner_display_name || user.username || "Odoo User",
          username: user.username || "",
          isAdmin: Boolean(user.is_admin),
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Session restoration error:", error);
      setIsAuthenticated(false);
    } finally {
      setCheckingSession(false);
    }
  }

  checkSession();
}, []);

    useEffect(() => {
    if (!isAuthenticated) return;

    getEnquiries()
      .then((data) => {
        console.log("ODOO ENQUIRIES:", data);
      })
      .catch((error) => {
        console.error("ODOO API ERROR:", error);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function closeProfileMenu(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }

    document.addEventListener("mousedown", closeProfileMenu);
    document.addEventListener("touchstart", closeProfileMenu);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", closeProfileMenu);
      document.removeEventListener("touchstart", closeProfileMenu);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  async function handleLogout() {
    try {
      await fetch("/odoo-api/web/session/destroy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: Date.now() }),
      });
    } catch (error) {
      console.error("Odoo logout error:", error);
    } finally {
      setProfileMenuOpen(false);
      setIsAuthenticated(false);
      setSessionUser({ name: "Odoo User", username: "", isAdmin: false });
      setActive("Dashboard");
    }
  }

  async function handleLogin({ email, password }) {
    setLoginError("");

    try {
      const response = await fetch("/odoo-api/web/session/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: {
            db: "ranzom_solar",
            login: email,
            password: password,
          },
          id: Date.now(),
        }),
      });

      const data = await response.json();

      if (data.result?.uid) {
        const user = data.result;
        setSessionUser({
          name: user.name || user.partner_display_name || user.username || email,
          username: user.username || email,
          isAdmin: Boolean(user.is_admin),
        });
        setIsAuthenticated(true);
      } else {
        setLoginError(
          data.error?.data?.message || "Invalid username or password."
        );
      }
    } catch (error) {
      setLoginError("Unable to connect to Odoo. Check whether the server is running.");
    }
  }

 if (checkingSession) {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Ranzom Solar</h1>
        <p>Restoring your session...</p>
      </div>
    </div>
  );
}

if (!isAuthenticated) {
  return <Login onLogin={handleLogin} error={loginError} />;
}

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <h2>RANZOM</h2>
            <span>SOLAR SOLUTIONS</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{sidebarCollapsed ? "›" : "‹"}</button>
        </div>

        <div className="workspace">
          <div className="workspace-icon">RS</div>
          <div>
            <strong>Ranzom Solar</strong>
            <span>Business Workspace</span>
          </div>
          <span className="workspace-arrow">⌄</span>
        </div>

        <nav>
          {navigation.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-heading">{group.title}</p>
              {group.items.map((item) => (
                <button
                  key={item}
                  className={`nav-item ${active === item ? "active" : ""}`}
                  onClick={() => setActive(item)}
                  title={sidebarCollapsed ? item : undefined}
                  aria-label={item}
                >
                  <span className="nav-dot nav-icon" aria-hidden="true">{navigationIcons[item] || "•"}</span>
                  <span className="nav-label">{item}</span>
                  
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item sidebar-settings ${active === "Settings" ? "active" : ""}`}
            onClick={() => setActive("Settings")}
            title={sidebarCollapsed ? "Settings" : undefined}
            aria-label="Settings"
          >
            <span className="nav-dot nav-icon" aria-hidden="true">⚙</span>
            <span className="nav-label">Settings</span>
          </button>
          <div className="help-card">
            <div className="help-icon">?</div>
            <strong>Need assistance?</strong>
            <span>Contact your administrator</span>
          </div>
          <div className="profile">
            <div className="avatar">YM</div>
            <div>
              <strong>{sessionUser.name}</strong>
              <span>{sessionUser.isAdmin ? "Administrator" : "Odoo User"}</span>
            </div>

          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> {active}</div>
          <div className="top-actions">
            <div className={`search-box ${globalSearchOpen ? "search-box-open" : ""}`}>
              <span aria-hidden="true">⌕</span>
              <input
                value={globalSearch}
                placeholder="Search pages..."
                aria-label="Search pages"
                onFocus={() => setGlobalSearchOpen(true)}
                onChange={(event) => { setGlobalSearch(event.target.value); setGlobalSearchOpen(true); }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") { setGlobalSearchOpen(false); setGlobalSearch(""); }
                  if (event.key === "Enter") {
                    const term = globalSearch.trim().toLowerCase();
                    const match = navigation.flatMap((group) => group.items).find((item) => item.toLowerCase().includes(term));
                    if (match) { setActive(match); setGlobalSearchOpen(false); setGlobalSearch(""); }
                  }
                }}
              />
              {globalSearch && <button type="button" className="search-clear" onClick={() => setGlobalSearch("")} aria-label="Clear search">×</button>}
              <kbd>↵</kbd>
              {globalSearchOpen && (
                <div className="global-search-results">
                  {navigation.flatMap((group) => group.items)
                    .filter((item) => !globalSearch.trim() || item.toLowerCase().includes(globalSearch.trim().toLowerCase()))
                    .slice(0, 8)
                    .map((item) => (
                      <button type="button" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => { setActive(item); setGlobalSearch(""); setGlobalSearchOpen(false); }}>
                        <span>{navigationIcons[item] || "•"}</span><span>{item}</span><small>Open page</small>
                      </button>
                    ))}
                  {navigation.flatMap((group) => group.items).filter((item) => !globalSearch.trim() || item.toLowerCase().includes(globalSearch.trim().toLowerCase())).length === 0 && <p>No matching pages found</p>}
                </div>
              )}
            </div>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
              <span className="theme-toggle-label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            <button className="icon-button">♧</button>
            <button className="icon-button notification">♧<i /></button>
            <div className="account-menu" ref={profileMenuRef}>
              <button
                className="top-avatar account-trigger"
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
              >
                <span className="account-initials">
                  {sessionUser.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U"}
                </span>
                <span className="account-trigger-chevron" aria-hidden="true">⌄</span>
              </button>

              {profileMenuOpen && (
                <div className="account-dropdown" role="menu">
                  <div className="account-dropdown-header">
                    <div className="account-avatar-large">
                      {sessionUser.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U"}
                    </div>
                    <div className="account-user-details">
                      <strong>{sessionUser.name}</strong>
                      <span>{sessionUser.isAdmin ? "Administrator" : "Odoo User"}</span>
                      {sessionUser.username && <small>{sessionUser.username}</small>}
                    </div>
                  </div>
                  <div className="account-dropdown-divider" />
                  <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setActive("Settings"); }}>
                    <span className="account-menu-icon">◎</span>
                    <span>Account & Settings</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setActive("Settings"); }}>
                    <span className="account-menu-icon">◈</span>
                    <span>Security & Session</span>
                  </button>
                  <div className="account-dropdown-divider" />
                  <button type="button" role="menuitem" className="account-logout" onClick={handleLogout}>
                    <span className="account-menu-icon">↪</span>
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content" key={active}>
          {active === "Settings" ? (
            <section className="settings-page">
              <div className="page-heading">
                <div><p className="eyebrow">WORKSPACE PREFERENCES</p><h1>Settings</h1><p>Manage your workspace appearance and account session.</p></div>
              </div>
              <div className="settings-grid">
                <section className="panel settings-card">
                  <div className="settings-card-icon">◐</div>
                  <div><h3>Appearance</h3><p>Choose how Ranzom Solar ERP looks on this device.</p></div>
                  <div className="settings-option-row"><div><strong>Theme</strong><span>{theme === "dark" ? "Dark mode is enabled" : "Light mode is enabled"}</span></div><button className="primary-button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>Switch to {theme === "dark" ? "Light" : "Dark"} Mode</button></div>
                </section>
                <section className="panel settings-card">
                  <div className="settings-card-icon">◎</div>
                  <div><h3>Account & Security</h3><p>Your account is authenticated through the connected Odoo server.</p></div>
                  <div className="settings-option-row"><div><strong>Odoo session</strong><span className="session-status"><i /> Active</span></div><button className="danger-button" onClick={handleLogout}>Sign out</button></div>
                </section>
              </div>
            </section>
          ) : active === "Enquiries" ? (
            <EnquiriesPage />
          ) : active === "Follow-ups" ? (
            <FollowupsPage />
          ) : active === "Sales" ? (
            <SalesPage />
          ) : active === "Products" ? (
            <ProductsPage />
          ) : active === "Quotations" ? (
            <QuotationsPage />
          ) : active === "Customers" ? (
            <CustomersPage />
          ) : active === "Inventory" ? (
          <InventoryPage />
          ) : active === "Suppliers" ||
           active === "Purchase Orders" ||
           active === "Vendor Bills" ? (
           <PurchasePage active={active} />
          ) : active === "Employees" ? (
            <EmployeesModule />
          ) : active === "Attendance" ? (
            <AttendanceModule />
          ) : active === "Payroll" || active === "Salary" ? (
            <PayrollModule />
          ) : active === "Invoices" ? (
            <InvoicesModule />
          ) : active === "Payments" ? (
            <PaymentsModule />
          ) : ["Projects", "Site Visits", "Installations", "Reports"].includes(active) ? (
            <section className="welcome-row">
              <div>
                <p className="eyebrow">RANZOM SOLAR ERP</p>
                <h1>{active}</h1>
                <p className="subtitle">This module is listed in the workspace navigation but its workflow has not been implemented yet. It will be connected to Odoo records in a separate update.</p>
              </div>
            </section>
          ) : (
            <DashboardPage onNavigate={setActive} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
