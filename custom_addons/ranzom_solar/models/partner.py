from odoo import api, fields, models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    solar_consumer_number = fields.Char(string='Electricity Consumer Number', index=True)
    solar_mobile_number = fields.Char(string='Mobile Number', index=True) 
    solar_district = fields.Char(string='District')
    solar_alternative_phone = fields.Char(string='Alternative Mobile Number')
    solar_customer_type = fields.Selection([
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
    ], string='Solar Customer Type')
    solar_system_type = fields.Selection([
        ('hybrid', 'Hybrid'),
        ('on_grid', 'On-Grid'),
        ('off_grid', 'Off-Grid'),
    ], string='Solar System Type')
    solar_roof_type = fields.Selection([
        ('flat', 'Flat'),
        ('slope', 'Slope'),
        ('sheet', 'Sheet'),
    ], string='Roof Type')
    solar_capacity = fields.Float(string='Required Solar Capacity (kW)')
    solar_lead_source = fields.Selection([
        ('whatsapp', 'WhatsApp'),
        ('meta', 'Meta'),
        ('referral', 'Referral'),
        ('direct', 'Direct'),
        ('website', 'Website'),
        ('other', 'Other'),
    ], string='Lead Source')

    def write(self, vals):
        vals = dict(vals)
        if 'solar_customer_type' in vals:
            vals['is_company'] = vals['solar_customer_type'] == 'commercial'
        return super().write(vals)
