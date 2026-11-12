
from odoo import api, fields, models
from odoo.exceptions import UserError


class RanzomSolarQuotation(models.Model):
    _name = 'ranzom.solar.quotation'
    _description = 'Ranzom Solar Quotation'
    _order = 'create_date desc'

    name = fields.Char(
        string='Quotation Reference',
        required=True,
        copy=False,
        readonly=True,
        default='New'
    )

    
    lead_id = fields.Many2one(
        'crm.lead',
        string='CRM Enquiry',
        required=True,
        ondelete='restrict'
    )

    partner_id = fields.Many2one(
        'res.partner',
        string='Customer',
        required=True
    )

    quotation_type = fields.Selection([
        ('internal', 'Internal Quotation'),
        ('customer', 'Customer Quotation'),
    ], default='internal', required=True)

    state = fields.Selection([
        ('draft', 'Draft'),
        ('converted', 'Converted to Sales'),
        ('cancelled', 'Cancelled'),
    ], default='draft', required=True)

    date = fields.Date(
        string='Quotation Date',
        default=fields.Date.context_today
    )

    validity_date = fields.Date(string='Valid Until')

    system_type = fields.Selection([
        ('on_grid', 'On-Grid'),
        ('off_grid', 'Off-Grid'),
        ('hybrid', 'Hybrid'),
        ('micro_inverter', 'Micro Inverter'),
    ], string='System Type')

    capacity = fields.Float(string='System Capacity (kW)')

    panel_brand = fields.Char(string='Solar Panel Brand')
    inverter_brand = fields.Char(string='Inverter Brand')

    line_ids = fields.One2many(
        'ranzom.solar.quotation.line',
        'quotation_id',
        string='Quotation Components'
    )

    currency_id = fields.Many2one(
        'res.currency',
        default=lambda self: self.env.company.currency_id
    )

    subtotal = fields.Monetary(
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )

    discount = fields.Monetary(
        string='Discount',
        currency_field='currency_id'
    )

    total = fields.Monetary(
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )

    subsidy_amount = fields.Monetary(
        string='Estimated MNRE Subsidy',
        currency_field='currency_id'
    )

    net_investment = fields.Monetary(
        compute='_compute_amounts',
        store=True,
        currency_field='currency_id'
    )

    sale_order_id = fields.Many2one(
        'sale.order',
        string='Sales Order',
        readonly=True,
        copy=False
    )

    payment_terms = fields.Text(string='Payment Terms')
    notes = fields.Text(string='Internal Notes')

    @api.depends('line_ids.amount', 'discount', 'subsidy_amount')
    def _compute_amounts(self):
        for record in self:
            record.subtotal = sum(record.line_ids.mapped('amount'))
            record.total = max(record.subtotal - record.discount, 0)
            record.net_investment = max(
                record.total - record.subsidy_amount, 0
            )


    @api.onchange('lead_id')
    def _onchange_lead_id(self):
        for record in self:
            if record.lead_id:
                record.partner_id = record.lead_id.partner_id
                record.system_type = record.lead_id.solar_system_type
                record.capacity = record.lead_id.solar_capacity



    def action_convert_to_sale(self):
        self.ensure_one()

        if self.sale_order_id:
            return {
                'type': 'ir.actions.act_window',
                'name': 'Sales Quotation',
                'res_model': 'sale.order',
                'res_id': self.sale_order_id.id,
                'view_mode': 'form',
                'target': 'current',
            }

        if self.quotation_type != 'customer':
            raise UserError(
                "Only Customer Quotations can be converted to Sales."
            )

        if not self.partner_id:
            raise UserError("Please select a customer.")

        if not self.line_ids:
            raise UserError("Add at least one quotation component.")

        order_lines = []

        for line in self.line_ids:
            if not line.product_id:
                raise UserError(
                    "Please select an Odoo Product for every component."
                )

            order_lines.append((0, 0, {
                'product_id': line.product_id.id,
                'name': line.description or line.name,
                'product_uom_qty': line.quantity,
                'price_unit': line.unit_price,
            }))

        sale_order = self.env['sale.order'].create({
            'partner_id': self.partner_id.id,
            'origin': self.name,
            'order_line': order_lines,
        })

        self.write({
            'sale_order_id': sale_order.id,
            'state': 'converted',
        })

        return {
            'type': 'ir.actions.act_window',
            'name': 'Sales Quotation',
            'res_model': 'sale.order',
            'res_id': sale_order.id,
            'view_mode': 'form',
            'target': 'current',
        }

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code(
                    'ranzom.solar.quotation'
                ) or 'New'

        return super().create(vals_list)

class RanzomSolarQuotationLine(models.Model):
   
   
    _name = 'ranzom.solar.quotation.line'
    _description = 'Solar Quotation Component'

    product_id = fields.Many2one(
        'product.product',
        string='Odoo Product',
        required=True
    )
    
    quotation_id = fields.Many2one(
        'ranzom.solar.quotation',
        required=True,
        ondelete='cascade'
    )

    name = fields.Char(string='Component', required=True)
    description = fields.Text(string='Specifications')
    quantity = fields.Float(default=1.0)
    unit = fields.Char(string='Unit')
    unit_price = fields.Monetary(
        currency_field='currency_id'
    )

    currency_id = fields.Many2one(
        related='quotation_id.currency_id',
        store=True
    )

    amount = fields.Monetary(
        compute='_compute_amount',
        store=True,
        currency_field='currency_id'
    )

    @api.depends('quantity', 'unit_price')
    def _compute_amount(self):
        for line in self:
            line.amount = line.quantity * line.unit_price
