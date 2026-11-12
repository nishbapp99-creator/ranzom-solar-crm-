from odoo import fields, models


class RanzomSolarFollowup(models.Model):
    _name = 'ranzom.solar.followup'
    _description = 'Ranzom Solar Follow-up'
    _order = 'followup_date desc'

    name = fields.Char(
        string='Follow-up Subject',
        required=True
    )

    lead_id = fields.Many2one(
        'crm.lead',
        string='Enquiry',
        required=True,
        ondelete='cascade'
    )

    followup_date = fields.Datetime(
        string='Follow-up Date & Time',
        required=True
    )

    assigned_to = fields.Many2one(
        'res.users',
        string='Assigned Employee',
        default=lambda self: self.env.user
    )

    followup_type = fields.Selection([
        ('call', 'Call'),
        ('whatsapp', 'WhatsApp'),
        ('meeting', 'Meeting'),
        ('site_visit', 'Site Visit'),
    ], string='Follow-up Type', required=True)

    notes = fields.Text(string='Notes')

    status = fields.Selection([
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], string='Status', default='pending', required=True)

    next_followup_date = fields.Datetime(
        string='Next Follow-up Date'
    )
