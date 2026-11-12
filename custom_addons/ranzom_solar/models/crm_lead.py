from odoo import fields, models


class CrmLead(models.Model):
    _inherit = 'crm.lead'

    enquiry_source = fields.Selection([
        ('whatsapp', 'WhatsApp'),
        ('meta', 'Meta'),
        ('referral', 'Referral'),('direct', 'Direct'),
    ], string='Enquiry Source')

    solar_customer_type = fields.Selection([
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
    ], string='Customer Type')

    solar_system_type = fields.Selection([
        ('on_grid', 'On-Grid'),
        ('off_grid', 'Off-Grid'),
        ('hybrid', 'Hybrid'),
    ], string='Solar System Type')

    solar_capacity = fields.Float(
        string='Required Capacity (kW)'
    )

    solar_location = fields.Char(
        string='Installation Location'
    )

    monthly_electricity_bill = fields.Monetary(
        string='Monthly Electricity Bill',
        currency_field='company_currency'
    )

    solar_customer_address = fields.Text(
        string='Customer Address'
    )

    solar_consumer_number = fields.Char(
        string='Electricity Consumer Number'
    )

    solar_kseb_section = fields.Char(
        string='KSEB Section'
    )

    solar_subsidy_required = fields.Boolean(
        string='Subsidy Required',
        default=False
    )

    followup_ids = fields.One2many(
        'ranzom.solar.followup',
        'lead_id',
        string='Follow-up History'
    )
