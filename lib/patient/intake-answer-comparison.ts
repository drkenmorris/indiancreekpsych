import type {IntakeAnswers} from './intake';

/** Database jsonb changes key order, so drafts must be compared by keys and values. */
export function sameIntakeAnswers(a:Readonly<IntakeAnswers>, b:Readonly<IntakeAnswers>):boolean {
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length
  && keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&a[key]===b[key]);
}
