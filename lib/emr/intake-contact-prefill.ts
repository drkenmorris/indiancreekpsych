/** Safe, explicit transfer of patient-reported intake contact details into a draft.
 * Never transfers names, birth dates, patient identifiers, untyped phone numbers,
 * or clinical history. The caller must obtain clinician review before saving.
 */
/** Contact source strings are unverified patient statements, not trusted UI labels.
 * Reject oversized values and invisible/bidirectional control characters that
 * could disguise protected history as an ordinary directory contact field.
 * Do not silently rewrite these values into a different clinician-reviewed fact.
 */
const unsafeContactText = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;
function safeIntakeContactValue(key:string, raw:unknown):string|null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > 300 || unsafeContactText.test(value)) return null;
  if (key === 'email' && (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) return null;
  return value;
}

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
    const value = safeIntakeContactValue(intakeField, source[intakeField]);
    if (value === null) continue;
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
  return Object.entries(source).flatMap(([key, raw]): Array<[string, string]> => {
    if (!directoryContactDisplayKeys.has(key)) return [];
    const value = safeIntakeContactValue(key, raw);
    return value === null ? [] : [[key, value]];
  });
}
