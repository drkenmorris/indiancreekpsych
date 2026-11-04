import manifest from './source-manifest.json';
import {scoreCseq,type CseqResponse} from '../legacy/selfesteem/cseqScoring';
import {srrciItems} from '../legacy/src/features/assessments/srrci/data/srrciItems';
import {scoreSRRCI} from '../legacy/src/features/assessments/srrci/engine/srrciScoring';
import type {SRRCIResponse} from '../legacy/src/features/assessments/srrci/types/srrciTypes';
import {scoreRtafiAssessment} from '../legacy/src/features/psychometrics/rtafi/engine/rtafiScoring';
import type {RtafiResponse} from '../legacy/src/features/psychometrics/rtafi/types/rtafiTypes';
import {RTAFI_DOMAIN_DEFINITIONS,RTAFI_SUBSCALE_DEFINITIONS} from '../legacy/src/features/psychometrics/rtafi/data/rtafiDomains';
import {buildRDIIReport} from '../legacy/src/assessments/rdii/rdiiScoring';
import {rdiiItemsFormA} from '../legacy/src/assessments/rdii/rdiiItemsFormA';
import type {AssessmentResponse} from '../legacy/src/assessments/rdii/rdiiTypes';
import {scoreRvtiIndividual} from '../legacy/src/assessments/rvti/rvtiScoring';
import type {RvtiResponses} from '../legacy/src/assessments/rvti/rvtiTypes';
import {type Definition,type Answers,validateSave} from './definition';
export type ReportRow={label:string;score:number|null;direction:string;detail:string};
export type ClinicalReport={title:string;summary:string;rows:ReportRow[];flags:string[];discussion:string[];limitations:string[];answered:number;total:number;sourceVersion:string;engineVersion:string;raw:unknown};
export const ENGINE_VERSION=manifest.version+'/'+manifest.digest;
const commonLimits=['Individual self-report reflects the respondent’s account at this administration. Verify context, comprehension, distress, and relevant history with the respondent.','Scores are outputs of the repository’s original scoring rules. Percent-of-scale scores are not population percentiles. No validated norms, diagnostic accuracy, or treatment effectiveness is established here.','Response-style indicators are source heuristics, not proof of dishonesty. Absence of flags does not establish validity. No automated diagnosis or decision about a relationship is made.'];
export function buildClinicalReport(d:Definition,a:Answers):ClinicalReport{
 const total=d.items.length,answered=d.items.filter(i=>a[i.id]!==undefined).length;
 validateSave({answers:a,page:0,submit:true,expectedRevision:0,identityConfirmed:true},d);
 let rows:ReportRow[]=[],flags:string[]=[],raw:unknown,summary='',discussion:string[]=[],limitations=[...commonLimits];
 if(d.testKey==='cseq'){
  const likert=Object.fromEntries(Object.entries(a).filter(([id])=>!id.startsWith('FC-'))) as CseqResponse['likert'];
  const forcedChoice=Object.fromEntries(Object.entries(a).filter(([id])=>id.startsWith('FC-'))) as NonNullable<CseqResponse['forcedChoice']>;
  const r=scoreCseq({likert,forcedChoice});raw=r;flags=r.validity.flags;
  rows=[...r.scales,...r.detractors,...r.contributors].map(s=>({label:s.label,score:s.pct0to100,direction:s.id.startsWith('DET_')?'Higher = less reported detractor (inverted)':'Higher = greater reported support',detail:`${s.nAnswered}/${s.nItems} scored responses; source mean ${s.mean0to3}/3. Source descriptive band: ${s.band}.`}));
  summary=`The source profile rule returned “${r.profile.name}”. This is a descriptive hypothesis to explore with the respondent. ${r.profile.summary}`;
  discussion=['Ask for a recent example of self-criticism and how the person recovered. Explore what helped.','Review differences among intrinsic worth, boundaries, internal validation and stress stability. Agree on one practical support to try and revisit.','Discuss the paired-statement choices in the response appendix; the original engine accepts but does not score them.'];
  limitations.push('CSEQ’s original global composite pools supportive, detractor and validity items without consistent direction. It is retained in source output but is not presented as an overall self-esteem score. Forced choices are recorded for discussion without numerical interpretation.');
 }
 if(d.testKey==='srrci'){
  const r=scoreSRRCI('assigned-individual',Object.entries(a).map(([itemId,value])=>({itemId,value})) as SRRCIResponse[]);raw=r;flags=[...r.validityProfile.notes,...r.patternFlags];
  rows=r.domainScores.map(s=>({label:s.label,score:s.percentScore,direction:srrciItems.find(i=>i.domain===s.domain)?.category==='clinical'?'Higher = greater reported concern':'Higher = greater reported relational or regulation resource',detail:`Raw ${s.rawScore}/${s.maxScore}. Source hypothesis: ${s.narrative}`}));
  summary=`Source clinical-concern index ${r.regulationConcernScore}/100; reported regulation-strength index ${r.regulationStrengthScore}/100. These summarize different item groups and should be interpreted together with individual domains and the respondent’s context.`;
  discussion=['Clarify the respondent’s own goals, values and meaning of the reported experiences. Discuss distress, functional impact, consent and boundaries privately.','Explore triggers, coping, communication and repair with specific recent examples; identify a mutually acceptable discussion or skill to practice.','This is one person’s account. Do not infer a partner’s preferences, couple compatibility, or consent from these scores.'];
  limitations.push('Source severity and compatibility narratives use unvalidated rule thresholds. They are clinical discussion hypotheses, not diagnoses, predictions or measured couple agreement.');
 }
 if(d.testKey==='rtafi'){
  const r=scoreRtafiAssessment(Object.entries(a).map(([itemId,value])=>({itemId,value})) as RtafiResponse[]);raw=r;
  rows=r.domainScores.map(s=>({label:RTAFI_DOMAIN_DEFINITIONS.find(x=>x.code===s.domain)?.name||s.domain,score:s.standardizedScore??null,direction:'Source-keyed endorsement; mixed domain directions',detail:`${s.itemCount} scored responses; mean ${s.meanScore}/4. ${RTAFI_DOMAIN_DEFINITIONS.find(x=>x.code===s.domain)?.description||''}`}));
  rows.push(...r.domainScores.flatMap(domain=>domain.subscaleScores.map(s=>({label:RTAFI_SUBSCALE_DEFINITIONS.find(x=>x.code===s.subscale)?.name||s.subscale,score:s.standardizedScore??null,direction:'Source-keyed endorsement; verify item direction',detail:`${s.itemCount} scored responses; mean ${s.meanScore}/4. ${RTAFI_SUBSCALE_DEFINITIONS.find(x=>x.code===s.subscale)?.description||''}`}))));
  summary='The profile organizes reported stress, relational experience, attachment, regulation and protective functioning. Read item content and reverse-key direction before treating any domain as risk or protection.';
  flags=Object.entries(r.validityProfile).filter(([name,value])=>name.endsWith('Flag')&&value===true).map(([name])=>'Source review indicator: '+name.replace('Flag','').replace(/([A-Z])/g,' $1')+'. Discuss the responses rather than inferring intent.');
  rows.push(...Object.entries(r.validityProfile).filter(([,v])=>typeof v==='number').map(([label,score])=>({label:'Response style — '+label.replace(/([A-Z])/g,' $1'),score:score as number,direction:'Higher = stronger source review indicator',detail:'Original heuristic scale; not proof of inaccurate responding or dishonesty.'})));
  discussion=['Agree on the family and relationship context used for answering. Explore current safety and support privately, without inferring that a reported pattern proves an event.','Ask for examples linking stress activation, relational trust and recovery; identify an existing coping resource and one support the person wants to strengthen.','Discuss pacing and readiness before exploring distressing experiences. Use history and clinical assessment to determine next steps.'];
  limitations.push('The source contains mixed reverse-key directions in attachment and protective scales. Composite labels can imply a direction not supported consistently by the item keys. Original output is retained, but composite indices and categorical severity are withheld from the clinical presentation pending scoring review. Household comparisons require independently assigned contextualized responses; this individual administration supplies no comparison.');
 }
 if(d.testKey==='rdii'){
  const r=buildRDIIReport(rdiiItemsFormA,a as AssessmentResponse);raw=r;flags=r.validityFlags;summary=`Source index descriptors: ${r.summary} These are rule-based hypotheses for therapist review; they are not clinical findings or diagnoses.`;
  rows=[...Object.values(r.indices).map(s=>({label:s.title,score:s.score,direction:'Source composite; inspect component directions',detail:s.narrative})),...Object.values(r.subscales).map(s=>({label:s.title,score:s.score,direction:s.polarity==='HEALTHY_HIGH'?'Higher = reported resource':s.polarity==='RISK_HIGH'?'Higher = reported concern':'Response-style indicator',detail:`${s.answered}/${s.total} items or pairs. Source discussion hypothesis: ${s.narrative}`}))];
  discussion=['Explore specific examples of respect, emotional connection, conflict, dependency and commitment without treating one person’s account as a finding about a partner.','Ask how reported strengths and concerns change across settings or stress. Review discrepancies between scales and the person’s experience.','Identify one observable change the respondent wants to discuss with the therapist; review safety and individual needs before joint relationship exercises.'];
  limitations.push('Form A self-report only. The source T-like transform is display-only and not norm referenced; it is omitted from this presentation. Bands and narratives are rule-based hypotheses.');
 }
 if(d.testKey==='rvti'){
  const r=scoreRvtiIndividual(a as RvtiResponses);raw=r;flags=r.validityFlags??[];
  const names:Record<string,string>={RVTI_SEX:'Sexual exclusivity and loyalty',RVTI_FIN:'Financial philosophy',RVTI_AUT:'Autonomy and togetherness',RVTI_CHI:'Children and parenting'};
  rows=r.domainScores.flatMap(s=>Object.entries(s).filter(([k])=>k.endsWith('_0_100')).map(([metric,score])=>({label:`${names[s.domain]} — ${metric.replace('_0_100','').replace(/([A-Z])/g,' $1')}`,score:score as number,direction:'Descriptive dimension; higher is not necessarily better',detail:'Original RVTI conversion and composite weights; use the underlying scenario and value responses for meaning.'})));
  summary='The four-domain profile describes stated values, their importance, and imagined responses to relationship disagreement. These scores describe preferences and scenario responses; they do not rank values or predict relationship outcomes.';
  discussion=['Review the most important values and what each means in practice. Separate a preference from a boundary and a nonnegotiable need.','Compare scenario reactions with lived examples. Explore what communication, repair or practical agreement could look like, while respecting autonomy.','A couple comparison needs separately collected, consenting partner responses. This report contains no inferred partner or dyadic score.'];
  limitations.push('Four active source domains only. Hypothetical responses may differ from actual behavior. No normative bands or validated rupture predictions are available.');
 }
 return {title:d.title,summary,rows,flags,discussion,limitations,answered,total,sourceVersion:d.version,engineVersion:ENGINE_VERSION,raw};
}
