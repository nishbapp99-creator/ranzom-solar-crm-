# Customer Full Address Update

This patch completes the address fields in the Customers Add and Edit forms.

Included fields:
- Address Line 1 — `res.partner.street`
- Address Line 2 — `res.partner.street2`
- District — `res.partner.solar_district`
- City / Location — `res.partner.city`
- PIN Code — `res.partner.zip` (standard Odoo field)

## Replace only one file
`frontend/src/App.jsx`

The Customer District Update already added `street2`, `city`, `solar_district`, and `zip` to the customer read fields, and the `partner.py` model defines `solar_district`. This patch assumes that earlier update is already installed. No database schema change or Odoo module upgrade is needed for PIN code because `zip` is a standard Odoo field.

After replacing App.jsx, hard-refresh the browser with Cmd + Shift + R. If Vite does not reload, restart the frontend dev server.

Static source assertions passed. No live Odoo integration test was performed.
