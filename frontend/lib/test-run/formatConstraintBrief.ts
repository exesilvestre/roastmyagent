/** Matches backend `format_constraint_brief`, full text for display (frontend truncates in CSS). */
export function formatConstraintBrief(fields: Record<string, string> | null | undefined): string {
  if (!fields || typeof fields !== "object") {
    return "";
  }
  return (
    `Validation goal:\n${fields.validation_goal ?? ""}\n\n` +
    `Expected constraints:\n${fields.expected_constraints ?? ""}\n\n` +
    `Failure evidence (for this probe):\n${fields.failure_evidence ?? ""}`
  );
}
