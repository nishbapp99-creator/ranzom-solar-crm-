from odoo import api, models, _
from odoo.exceptions import AccessDenied, UserError


class RanzomSolarDeleteService(models.TransientModel):
    """Password-confirmed deletion for approved Ranzom Solar records."""

    _name = "ranzom.solar.delete.service"
    _description = "Ranzom Solar Protected Delete Service"

    _ALLOWED_MODELS = frozenset({
        "crm.lead",
        "ranzom.solar.followup",
        "ranzom.solar.quotation",
        "sale.order",
        "res.partner",
        "purchase.order",
        "account.move",
        "hr.attendance",
        "account.payment",
        "project.project",
        "project.task",
    })

    @api.model
    def verify_password_and_delete(self, model_name, record_id, password):
        """Verify the active user's password and unlink one approved record."""
        if not isinstance(model_name, str) or model_name not in self._ALLOWED_MODELS:
            raise UserError(_("Deletion is not enabled for this record type."))

        try:
            record_id = int(record_id)
        except (TypeError, ValueError):
            raise UserError(_("Invalid record identifier."))
        if record_id <= 0:
            raise UserError(_("Invalid record identifier."))

        try:
            self.env.user._check_credentials(
                {"type": "password", "password": password or ""},
                {"interactive": True},
            )
        except AccessDenied:
            raise UserError(_("The password is incorrect. The record was not deleted."))

        record = self.env[model_name].browse(record_id).exists()
        if not record:
            raise UserError(_("This record no longer exists. Refresh the page and try again."))

        # Do not bypass the caller's ACLs or record rules.
        record.check_access("unlink")

        # Protect business records that have moved beyond draft workflows.
        if model_name == "sale.order" and record.state not in ("draft", "sent", "cancel"):
            raise UserError(_("Confirmed sales orders cannot be deleted from this workspace."))
        if model_name == "purchase.order" and record.state not in ("draft", "sent", "cancel"):
            raise UserError(_("Confirmed purchase orders cannot be deleted from this workspace."))
        if model_name == "account.move" and record.state != "draft":
            raise UserError(_("Posted accounting entries cannot be deleted. Cancel them through Odoo Accounting if permitted."))
        if model_name == "account.payment" and record.state != "draft":
            raise UserError(_("Posted payments cannot be deleted from this workspace."))

        record.unlink()
        return True
