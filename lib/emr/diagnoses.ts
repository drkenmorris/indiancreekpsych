import catalog from './diagnosis-catalog.json';

export const diagnosisCatalog = catalog;
export type Diagnosis = {
 code: string; label: string; version: string;
 priority: 'primary' | 'secondary';
 status: 'confirmed' | 'provisional' | 'rule_out'; notes: string;
};
const codes = new Map(catalog.rows.map(row => [row.code, row]));
export function validDiagnoses(value: unknown): value is Diagnosis[] {
 if (!Array.isArray(value) || value.length > 30) return false;
 return value.every(row => row && Object.keys(row).length === 6 &&
  typeof row.code === 'string' && typeof row.label === 'string' && codes.get(row.code)?.label === row.label && row.version === catalog.version &&
  ['primary','secondary'].includes(row.priority) &&
  ['confirmed','provisional','rule_out'].includes(row.status) &&
  typeof row.notes === 'string' && row.notes.length <= 1000) &&
  value.filter(row => row.priority === 'primary').length <= 1 &&
  new Set(value.map(row => row.code)).size === value.length;
}
