/**
 * Patient-facing legal documents, revision 2026-10-11.
 * Keep each released revision available when changing this material:
 * signed intake records store legal_packet_version.
 * Practice counsel/privacy officer must review operational statements before broad rollout.
 */
export const LEGAL_PACKET_VERSION='2026-10-11';

export type LegalDocument={title:string;summary:string;parts:readonly {heading:string;paragraphs:readonly string[]}[]};

export const legalDocuments:Record<string,LegalDocument>={
 'Notice of Privacy Practices acknowledgment':{
  title:'Notice of Privacy Practices — HIPAA and applicable substance-use privacy protections',
  summary:'Effective October 11, 2026. Indian Creek Psychological Services, Inc., 15022 W. 128th St., Olathe, KS 66062. Privacy contact: Privacy Officer, 913-636-5657. You may request a paper copy and ask questions before acknowledging receipt.',
  parts:[
   {heading:'Your health information; our duties',paragraphs:[
    'This notice explains how the practice may use or disclose protected health information (PHI) and how you can exercise your privacy rights. We are required to protect the privacy and security of your PHI, follow the notice currently in effect, provide you a copy, and notify you when a breach of unsecured PHI requires notice under applicable law.',
    'Our records may include contact information, clinical evaluations, diagnoses, treatment plans, progress, medications, insurance claims, billing information and electronic communications. Special rules can apply to psychotherapy notes and certain substance-use disorder records.'
   ]},
   {heading:'Uses and disclosures usually permitted without a separate HIPAA authorization',paragraphs:[
    'Treatment: We may use and share appropriate information with health professionals involved in your care, subject to stricter laws when they apply. Payment: We may use information to verify benefits, submit claims, receive payment or resolve billing matters. Health care operations: We may use information for quality review, compliance, practice administration and authorized professional consultation.',
    'The law may permit or require disclosure for public health and safety, reporting suspected abuse or neglect, serious threats to health or safety, health oversight, certain law-enforcement purposes, workers’ compensation, legal proceedings under valid authority, coroners and medical examiners, and other specifically authorized circumstances. We evaluate applicable legal requirements before disclosing.',
    'Other uses may require your written authorization. We do not treat a privacy-notice acknowledgment or a general treatment consent as an authorization for unrelated disclosures. We will obtain separate authorization when required for marketing, sale of PHI or most uses or disclosures of separately maintained psychotherapy notes.'
   ]},
   {heading:'Your individual privacy rights',paragraphs:[
    'You may ask to inspect or obtain copies of records in the designated record set, including eligible electronic copies; request corrections to records; request confidential communications by alternative means or at alternative locations; request restrictions on certain uses or disclosures; request an accounting of certain disclosures; obtain a paper copy of this notice; and designate a legally authorized personal representative.',
    'We generally may decline a requested restriction unless law requires us to honor it. For example, where HIPAA conditions are met, we must honor your request not to disclose information to a health plan for payment or health care operations when you have paid in full out of pocket for the relevant service. We will explain any lawful denial of a record-access or amendment request and available review rights.',
    'You may raise questions or file a privacy complaint without retaliation. Contact the Privacy Officer at Indian Creek Psychological Services, Inc., 15022 W. 128th St., Olathe, KS 66062, telephone 913-636-5657; or complain to the U.S. Department of Health and Human Services Office for Civil Rights at hhs.gov/hipaa/filing-a-complaint or 1-877-696-6775.'
   ]},
   {heading:'Sensitive mental-health information, psychotherapy notes and Kansas confidentiality',paragraphs:[
    'We apply HIPAA and applicable Kansas confidentiality and privilege laws to mental-health records. Some disclosures permitted by HIPAA may be restricted by more protective state law. We assess subpoenas, court orders, mandatory reporting, personal-representative authority and other exceptions case by case rather than assuming every legal request permits immediate disclosure.',
    'Psychotherapy notes are a narrow category of notes kept separately by the clinician to document or analyze counseling-session conversations. They generally require a separate authorization for use or disclosure, subject to limited legal exceptions. The separate psychotherapy-notes form in this packet is voluntary.'
   ]},
   {heading:'Additional safeguards when 42 CFR Part 2 applies',paragraphs:[
    'If we are a Part 2 program or create or maintain records subject to 42 CFR Part 2, those records receive the additional federal protections applicable to substance-use disorder patient records. Most disclosures by a Part 2 program require written consent or a specific regulatory exception. A consent may authorize treatment, payment and health care operations when properly obtained, but an ordinary intake signature does not itself supply such consent.',
    'Part 2 records generally cannot be used or disclosed to investigate or prosecute a patient in civil, criminal, administrative or legislative proceedings without a qualifying patient consent or a court order that satisfies Part 2 and an appropriate subpoena or similar legal mandate. Recipients and redisclosures remain subject to the applicable limitations. Ask the Privacy Officer whether particular records are covered by Part 2 and for a Part 2-specific consent when needed.',
    'Additional Part 2 rights, such as certain recipient lists and accounting rules, apply as provided in current regulations and their implementation schedules. Where HIPAA and Part 2 overlap, applicable protections govern rather than a blanket waiver in this notice.'
   ]},
   {heading:'Choices, changes and the notice itself',paragraphs:[
    'Where the law gives you a choice, you can object to certain family/friend disclosures or give or withdraw authorization as permitted. We ordinarily honor a valid written revocation prospectively; prior actions lawfully taken in reliance on an authorization cannot always be undone. A recipient who is not governed by HIPAA may be able to redisclose information, subject to other applicable laws.',
    'We may change this notice and apply a revised notice to records we maintain to the extent permitted by law. Updated notices will be available at our office and website. This notice is available in paper or electronic form and is not a consent to treatment or an authorization to release records.'
   ]}
  ]
 },
 'Consent to Counseling and Informed Treatment':{
  title:'Informed Consent for Counseling, Psychological and Substance-Use Services',
  summary:'Please review the nature of services, limitations and alternatives with your clinician before deciding whether to consent.',
  parts:[
   {heading:'Services and clinician qualifications',paragraphs:[
    'Services may include intake assessment, diagnostic interviewing, counseling, psychotherapy, treatment planning, psychoeducation, family or relationship work, substance-use assessment and relapse prevention, and referrals when appropriate. The services and frequency of sessions are determined collaboratively based on clinical assessment and available care.',
    'Kenneth L. Morris, Ed.D., LCPC, LCAC, holds a doctorate in counseling psychology (not an M.D. degree). Licensed professional counseling and addiction counseling do not authorize the practice of medicine or prescription of medication. Mental-health symptoms sometimes have medical or biological causes; discuss possible medical evaluation and coordination with your physician.'
   ]},
   {heading:'Benefits, limitations, risks and alternatives',paragraphs:[
    'Potential benefits include improved understanding, coping, relationships and functioning. Treatment can also involve uncomfortable emotions, reflection on distressing experiences, changing important relationships, or temporary worsening of symptoms. Specific outcomes cannot be guaranteed.',
    'Alternatives may include choosing another clinician or treatment method, group or community services, medication evaluation by a qualified prescriber, higher levels of care or choosing not to participate. You can ask questions, participate in treatment planning, refuse a particular intervention or discontinue outpatient treatment subject to applicable legal and safety obligations.'
   ]},
   {heading:'Confidentiality and its limits',paragraphs:[
    'Treatment information is kept confidential as required by law. Limits can include suspected abuse or neglect reporting, appropriate response to threats of serious harm, medical emergencies, authorized health oversight, some valid legal process and other disclosures required or permitted by law. Couples, family and group services carry additional confidentiality considerations: other participants are not bound by the practice’s HIPAA duties, and joint-record or information-sharing arrangements should be discussed before treatment.',
    'For minors or legally represented patients, we review the legal decision-maker’s authority, applicable minor-consent rules, records access and any limits on disclosure. A parent or partner does not automatically control every confidential detail. Coordination with other professionals is limited to what law permits or what you specifically authorize.'
   ]},
   {heading:'Appointments, crises and professional boundaries',paragraphs:[
    'This practice is an outpatient service and the website, portal, voicemail and email are not continuously monitored emergency channels. In an immediate emergency, call 911 or go to an emergency department; in the United States call or text 988 for suicide or mental-health crisis support. Clinician availability, between-session contact and referral arrangements should be discussed directly.',
    'Treatment sessions are professional clinical services. Contact outside visits, gifts, social media interactions, requests for written opinions, disability letters, court reports or testimony, and transfers of care must be discussed in advance; none is promised solely by signing this intake.'
   ]}
  ]
 },
 'Financial Agreement and Good Faith Estimate':{
  title:'Financial Responsibility, Insurance and Good Faith Estimate Information',
  summary:'Review all applicable fees and policies with the office before service. This packet does not invent or substitute for the practice’s written fee schedule.',
  parts:[
   {heading:'Fees and payment',paragraphs:[
    'Your actual session rates, evaluation fees, payment timing, accepted payment methods, and any cancellation or missed-appointment charges must be separately disclosed to you by the practice. No specific dollar amount or penalty is accepted merely by signing this document. Ask for the current written schedule and clarification before a charge is incurred.',
    'You are responsible only for patient charges that are lawfully due under the written terms you are given, your benefits and applicable law. You may request an itemized statement and raise billing disputes with the practice. Charges for records, reports, court-related services or other nonstandard services require advance explanation where applicable.'
   ]},
   {heading:'Health insurance and third-party payment',paragraphs:[
    'Insurance benefits, network status, copays, coinsurance, deductibles, referrals, prior authorizations and covered visit limits vary. Information entered in intake is patient-reported and is not a guarantee of payment. Contact your health plan and the practice to verify the relevant benefit and any prior-authorization requirements.',
    'Claims submitted to an insurer may contain diagnoses, service dates and other information needed for payment; associated disclosures follow law and the privacy notice. Benefits may be denied or adjusted by the plan. Your actual obligation will be assessed under the plan and disclosed practice policies, not an assumed amount in this packet.'
   ]},
   {heading:'Self-pay rights and Good Faith Estimates',paragraphs:[
    'If you are uninsured or choose not to use insurance, federal No Surprises Act rules generally provide a right to a written Good Faith Estimate of expected charges when you schedule sufficiently in advance or request one. A Good Faith Estimate is not this financial acknowledgment. The practice must deliver any legally required estimate separately with applicable itemization and timing.',
    'If a qualifying final bill is substantially higher than the Good Faith Estimate, federal patient-provider dispute resolution rights may apply. See cms.gov/medical-bill-rights or contact the practice. You may request a Good Faith Estimate before deciding to begin care.'
   ]}
  ]
 },
 'Telehealth Informed Consent':{
  title:'Optional Telehealth Informed Consent',
  summary:'Telehealth is a choice; declining this form does not withdraw consent to available in-person counseling.',
  parts:[
   {heading:'Nature, advantages and limits of remote care',paragraphs:[
    'Telehealth may use secure interactive video or another clinically appropriate remote modality to deliver counseling while you and the clinician are at different locations. Benefits may include convenience and access; limitations may include lost nonverbal cues, technical interruption, reduced privacy or clinical situations that call for in-person or emergency care.',
    'At each telehealth visit, you may be asked to confirm your identity, current physical location, callback number and an emergency contact or local emergency option. Treatment across state lines is subject to clinician authorization and the law where you are physically located. The clinician may recommend in-person treatment or stop a remote visit if safe or clinically appropriate care cannot be provided.'
   ]},
   {heading:'Privacy, technology and emergencies',paragraphs:[
    'Use a private location, a device you control, a reliable connection and headphones if helpful. Inform the clinician if anyone else is present. Remote communications carry residual privacy and technology risks despite safeguards; notify the practice promptly of connection or privacy concerns.',
    'If a connection fails, attempt to reconnect using the agreed visit method; call the practice at 913-636-5657 for nonemergency follow-up. For immediate danger, call 911 or local emergency services where you are. Neither participant may record a session unless the practice has separately obtained appropriate permission and applicable law permits it.'
   ]},
   {heading:'Voluntary authorization',paragraphs:[
    'Telehealth consent may be refused or withdrawn and does not require consent to audio/video recording, marketing, AI processing beyond disclosed treatment systems, or the release of psychotherapy notes. Ask the office about available in-person alternatives. Kansas law applies the same confidentiality and professional standards to telemedicine as to comparable in-person services.'
   ]}
  ]
 },
 'Electronic Communications and Patient Portal':{
  title:'Electronic Communications, Portal and E-Signature Terms',
  summary:'Your separate communication preferences in this intake control whether calls, voicemail, text and ordinary email are permitted.',
  parts:[
   {heading:'Use of electronic systems',paragraphs:[
    'The patient portal is intended for registration, appointments, intake, permitted record exchange and routine administrative communications. You must protect your password and second factor and avoid shared devices when entering private health information. Notify the practice if you suspect unauthorized account use.',
    'Email, text messages and voicemail may be read by people who have access to the destination account or device. You may opt out of those channels, designate a confidential alternative, or restrict what may be included. Ordinary email and SMS are not assumed to be safe for sensitive clinical details. Contact preferences are recorded separately rather than presumed from this agreement.'
   ]},
   {heading:'Electronic documents and signatures',paragraphs:[
    'You may request paper copies, ask questions, and discuss whether non-electronic alternatives are available. Typing your legal name in the designated signature box with an affirmative acknowledgment records your intent to sign the identified document; it does not waive legal rights that require separate authorization.',
    'The practice preserves submitted answers and signature information according to applicable retention and confidentiality duties. The site is not monitored for emergencies. Routine electronic consent does not authorize recording sessions, publicity, sale of information or disclosure to a third party.'
   ]}
  ]
 },
 'Authorization to share health information':{
  title:'Optional Authorization to Use or Disclose Health Information',
  summary:'This is separate from the privacy-notice acknowledgment and informed consent. Choose No to decline without losing access to treatment.',
  parts:[
   {heading:'Scope and specificity',paragraphs:[
    'If you select Yes, identify the person or organization authorized to disclose the information, the recipient, the specific record categories, any exclusions, purpose, direction of exchange and an expiration date or event. The practice will not treat a blank scope as a valid blanket authorization. This authorization does not include separately maintained psychotherapy notes.',
    'Authorization is voluntary. Treatment and payment ordinarily may not be conditioned on signing it, subject to narrow exceptions in the law. You may revoke it in writing by contacting Indian Creek Psychological Services, Inc., 15022 W. 128th St., Olathe, KS 66062, except for disclosures already made in reasonable reliance on it or other applicable exceptions. Once received by certain recipients, records may be redisclosed and no longer protected by HIPAA; stricter laws may still apply.',
    'Certain substance-use disorder records governed by 42 CFR Part 2 require a specialized compliant consent and cannot be assumed covered by an ordinary release. Ask the practice to review those requirements before such records are shared.'
   ]}
  ]
 },
 'Optional consent for Part 2 substance-use records':{
  title:'Separate Consent for 42 CFR Part 2 Substance-Use Disorder Records',
  summary:'Use this optional consent only after the practice confirms that the identified records are protected by 42 CFR Part 2. It is not a blanket HIPAA release.',
  parts:[
   {heading:'Your separate choice and protected information',paragraphs:[
    'Certain records identifying a person as receiving substance-use disorder services from a federally assisted Part 2 program are protected by 42 CFR Part 2. If this rule applies, the practice or other holder generally needs a compliant written consent or a recognized exception before sharing such information.',
    'If you choose Yes, identify the specific program or holder that may disclose, the specific recipient or qualifying class of recipients, what records may be shared, the purpose, and an expiration date or event. You may choose a treatment/payment/health-care-operations consent where the rule permits it, or a different specific purpose. Do not sign a form with incomplete disclosure details.',
    'A lawful Part 2 consent does not automatically authorize using your records in civil, criminal, administrative or legislative proceedings against you. An appropriate separate consent or qualifying court order and legal process are required. If a HIPAA-regulated recipient receives Part 2 records under an authorized treatment/payment/operations consent, subsequent disclosures may be governed by HIPAA while special legal-proceedings restrictions continue.'
   ]},
   {heading:'Voluntary authorization, revocation and other protected notes',paragraphs:[
    'You may decline this authorization. You may revoke a valid consent in writing through the identified disclosing program or the practice, subject to lawful reliance and exceptions. Certain downstream redisclosures may occur under the governing regulations; discuss those implications before signing.',
    'This consent does not authorize disclosure of separately maintained Part 2 SUD counseling notes. Such notes, if applicable, require their own separate authorization under the specific rules. The office must review every completed Part 2 request for scope and applicability before releasing information.'
   ]}
  ]
 },
 'Separate consent for SUD counseling notes':{
  title:'Independent Authorization for Substance-Use Disorder Counseling Notes',
  summary:'Separate consent for specially protected SUD counseling notes, when applicable. It is not bundled with routine substance-use or psychotherapy information.',
  parts:[
   {heading:'What this form covers',paragraphs:[
    'Part 2 protects separately maintained SUD counseling notes that document or analyze the contents of a conversation during a private or group SUD counseling session, as defined by the regulation. This category is distinct from ordinary SUD treatment records and also may differ from psychotherapy notes under HIPAA.',
    'If you elect Yes, identify the holder authorized to disclose, the intended recipient, the precise notes, the purpose, expiration date or event, and provide a separately dated signature. This optional consent does not authorize disclosure of unrelated treatment information or other categories of notes.'
   ]},
   {heading:'Your control',paragraphs:[
    'You may choose No. A refusal is not a refusal of all substance-use treatment. You may revoke permission in writing, subject to permitted prior reliance and legal exceptions. Staff will verify record classification, legal authority and the completed authorization before making a disclosure.'
   ]}
  ]
 },
 'Separate authorization for psychotherapy notes':{
  title:'Separate, Optional Psychotherapy-Notes Authorization',
  summary:'This permission is not combined with the general release, and declining it does not prevent ordinary treatment.',
  parts:[
   {heading:'Specially protected notes and choice',paragraphs:[
    'This form concerns only psychotherapy notes as defined by HIPAA: notes kept separately from the medical record that document or analyze session conversations. They are not the routine progress notes, diagnosis, dates, treatment plans or billing records that may be kept in the designated record set.',
    'Select Yes only after identifying the party authorized to disclose the notes, the receiving party, precise purpose, expiration date or event, and the individual or authorized representative signing. Authorization is voluntary; most uses and disclosures of psychotherapy notes require this separate form, apart from limited legal exceptions.',
    'You can revoke authorization in writing through the practice, except to the extent already relied upon or as otherwise provided by law. Disclosure may lead to redisclosure outside HIPAA protection, subject to other applicable law.'
   ]}
  ]
 },
 'Patient attestation and consent to submit':{
  title:'Final Patient Declaration and Electronic Signature',
  summary:'Each optional authorization remains independent. This final signature confirms information accuracy and the intended electronic submission.',
  parts:[
   {heading:'What your signature means',paragraphs:[
    'I have had an opportunity to read the documents in this packet, request a paper copy, identify unanswered questions and make separate choices about treatment, payment information, telehealth and optional releases. No single final signature substitutes for a missing authorization required under federal or Kansas law.',
    'I understand that knowingly false information can affect assessment, insurance or treatment planning. Information I provide is true and complete to the best of my knowledge; I may notify the practice about needed corrections. I understand the practice may need to resolve requests for discussion or unsigned consent forms before the relevant service is provided.',
    'I understand that choosing not to authorize a separate release of records or psychotherapy notes does not by itself bar care. The electronic signature below records intent to submit this intake and the selected acknowledgments.'
   ]}
  ]
 }
};
