/** Safe, explicit transfer of patient-reported intake contact details into a draft.
 * Never transfers names, birth dates, patient identifiers, untyped phone numbers,
 * or clinical history. The caller must obtain clinician review before saving.
 */
export const intakeContactFieldPairs = [
  ['address', 'address1'],
  ['address2', 'address2'],
  ['city', 'city'],
  ['state', 'state'],
  ['postal_code', 'postal_code'],
  ['email', 'email'],
] as const;

export function intakeContactPrefill(
  draft: Readonly<Record<string, string>>,
  source: Readonly<Record<string, unknown>> | null | undefined,
): {draft: Record<string, string>; fields: string[]} {
  const next = {...draft};
  const fields: string[] = [];
  if (!source) return {draft: next, fields};

  for (const [intakeField, chartField] of intakeContactFieldPairs) {
    if ((next[chartField] ?? '').trim()) continue;
    const reported = source[intakeField];
    if (typeof reported !== 'string') continue;
    const value = reported.trim();
    if (!value || value.length > 300) continue;
    if (chartField === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) continue;
    next[chartField] = value;
    fields.push(chartField);
  }
  return {draft: next, fields};
}
