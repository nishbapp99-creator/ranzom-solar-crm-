
{
    'name': 'Ranzom Solar CRM',
    'version': '19.0.1.0.0',
    'category': 'Sales/CRM',
    'summary': 'Custom CRM and business management for Ranzom Solar',
    'description': 'Ranzom Solar enquiry and business management system.',
    'depends': [
        'base',
        'crm',
        'sale_management',
        'project',
        'account',
    ],
    'data': [
        'data/sequence.xml',
        'security/ir.model.access.csv',
        'views/followup_views.xml',
        'views/crm_lead_views.xml',
        'views/quotation_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
