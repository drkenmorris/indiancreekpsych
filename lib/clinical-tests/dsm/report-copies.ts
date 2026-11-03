import {activePlan,progressRecords,moduleStatus,type ModuleRecord} from './tier-two-progress';
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
/** Pure fictional report preparation. No patient/provider identity mapping or transport. */
export function prepareReportCopies(plan:NonNullable<ReturnType<typeof activePlan>>,records:Record<string,ModuleRecord>=progressRecords(plan)){
 const report={version:'1.0.0',source:{instrumentId:plan.handoff.instrumentId,definitionVersion:plan.handoff.version,definitionHash:plan.handoff.definitionHash,tierOneCompletedAt:plan.handoff.completedAt},respondent:{version:plan.profile.id,ageBand:plan.profile.ageBand,type:plan.profile.respondent},clinicalReviewRequired:true,
  safety:{flag:plan.handoff.safetyFlag,review:plan.handoff.safetyReview},reviewDomains:plan.handoff.domains.filter(d=>plan.handoff.reviewDomains.includes(d.id)),
  modules:plan.handoff.domains.filter(d=>plan.handoff.routedDomains.includes(d.id)).map(d=>({...d,status:moduleStatus(records[d.id]),record:records[d.id]??null}))};
 const copy=(destination:string)=>({destination,patientId:null,assignedProviderId:null,liveTransferEnabled:false,report:clone(report)});
 return {user:copy('User on-screen summary'),provider:copy('Assigned provider review'),emr:copy('EMR assessment record')};
}
