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


/** The general patient directory may show contact source statements only.
 * Clinical, medication, allergy, trauma, legal, insurance and future intake
 * fields require their own separately bounded review surfaces. Fail closed on
 * unknown or malformed keys rather than displaying a raw intake answer map.
 */
const directoryContactDisplayKeys = new Set([
  'full_name', 'preferred_name', 'date_of_birth', 'address', 'address2',
  'city', 'state', 'postal_code', 'phone', 'email',
]);

export function visibleIntakeContactEntries(
  source: Readonly<Record<string, unknown>> | null | undefined,
): Array<[string, string]> {
  if (!source) return [];
  return Object.entries(source).filter(
    (entry): entry is [string, string] =>
      directoryContactDisplayKeys.has(entry[0]) &&
      typeof entry[1] === 'string' &&
      entry[1].trim().length > 0,
  );
}
