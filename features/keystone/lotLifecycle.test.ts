import assert from "node:assert/strict";
import test from "node:test";
import { canQuarantineLot, depositWebhookAppointmentEffect, recallChangesLotStatus, recallStepOutcome } from "./lotLifecycle";

test("an incident hold does not downgrade a recalled, expired or gone lot", () => {
  for (const status of ["recalled", "expired", "destroyed", "returned", "quarantined"]) assert.equal(canQuarantineLot(status), false, status);
  assert.equal(canQuarantineLot("available"), true);
  assert.equal(canQuarantineLot("depleted"), true);
});

test("a recall overrides every lot status except lots already gone", () => {
  for (const status of ["available", "quarantined", "expired", "depleted", "recalled"]) assert.equal(recallChangesLotStatus(status), true, status);
  assert.equal(recallChangesLotStatus("destroyed"), false);
  assert.equal(recallChangesLotStatus("returned"), false);
});

test("a late deposit webhook confirms only a pending visit and refunds anything no longer open", () => {
  assert.equal(depositWebhookAppointmentEffect("pending"), "confirm");
  assert.equal(depositWebhookAppointmentEffect("confirmed"), "mark_paid");
  for (const status of ["cancelled", "completed", "no_show", "in_progress", null, undefined]) assert.equal(depositWebhookAppointmentEffect(status), "refund", String(status));
});

test("a closed recall is never reopened and a case never rewinds", () => {
  assert.deepEqual(recallStepOutcome("closed", "assess", "applicability_review"), { error: "This recall is closed and can't be reopened; open a new recall case" });
  assert.ok("error" in recallStepOutcome("closed", "close", "closed"));
  assert.ok("error" in recallStepOutcome("patients_identified", "quarantine", "quarantined"));
  assert.deepEqual(recallStepOutcome("patients_identified", "notify", "notifications_in_progress"), { status: "notifications_in_progress" });
  assert.deepEqual(recallStepOutcome("disposition_complete", "clinical_assessment", "notifications_in_progress"), { status: "disposition_complete" });
  assert.deepEqual(recallStepOutcome("disposition_complete", "close", "closed"), { status: "closed" });
});
