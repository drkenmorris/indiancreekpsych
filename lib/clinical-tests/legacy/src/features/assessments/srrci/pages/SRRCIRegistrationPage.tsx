"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
import { useState } from "react";

import {
  createSRRCIProfile,
  saveSRRCIProfile,
} from "../services/srrciStorage";

interface SRRCIRegistrationPageProps {
  onRegistrationComplete: () => void;
}

type BiologicalSex = "male" | "female" | "intersex" | "prefer_not_to_say";

type RelationshipStatus =
  | "single"
  | "dating"
  | "engaged"
  | "married"
  | "separated"
  | "divorced"
  | "widowed"
  | "prefer_not_to_say";

type AssessmentUseContext =
  | "personal_growth"
  | "relationship_insight"
  | "couples_work"
  | "therapy_support"
  | "research"
  | "prefer_not_to_say";

type PartnerParticipationStatus =
  | "not_applicable"
  | "partner_not_participating"
  | "partner_may_participate"
  | "partner_participating"
  | "prefer_not_to_say";

interface SharedAssessmentProfile {
  id: string;
  sourceAssessment: "SRRCI-X";
  displayName: string;
  legalFirstName?: string;
  legalLastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  age?: number;
  biologicalSex: BiologicalSex;
  genderIdentity?: string;
  relationshipStatus: RelationshipStatus;
  educationLevel?: string;
  occupationCategory?: string;
  clinicalContext?: string;
  medicalContext?: string;
  valuesContext?: string;
  primaryReason?: string;
  assessmentUseContext: AssessmentUseContext;
  createdAt: string;
}

interface SRRCIIntakeProfile {
  profileId: string;
  partnerParticipationStatus: PartnerParticipationStatus;
  relationshipLength?: string;
  sexualOrientationOrAttractionPattern?: string;
  exclusivityExpectation?: string;
  consentAcknowledged: boolean;
  billingMetadata: {
    billingName?: string;
    billingEmail?: string;
    selectedPackage?: string;
    paymentStatus: "not_started" | "pending" | "paid" | "waived";
    paymentProcessorCustomerId?: string;
    paymentProcessorSessionId?: string;
  };
  createdAt: string;
}

const SHARED_ASSESSMENT_PROFILE_KEY = "shared_assessment_profile";
const SRRCI_INTAKE_PROFILE_KEY = "srrci_intake_profile";

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function saveSharedAssessmentProfile(profile: SharedAssessmentProfile): void {
  clinicalSessionStore.setItem(
    SHARED_ASSESSMENT_PROFILE_KEY,
    JSON.stringify(profile),
  );
}

function saveSRRCIIntakeProfile(profile: SRRCIIntakeProfile): void {
  clinicalSessionStore.setItem(
    SRRCI_INTAKE_PROFILE_KEY,
    JSON.stringify(profile),
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number";
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
      />
    </div>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
      />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="md:col-span-2">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
        {eyebrow}
      </div>

      <h2 className="mt-2 text-2xl font-bold text-white">
        {title}
      </h2>

      {body ? (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
          {body}
        </p>
      ) : null}
    </div>
  );
}

export default function SRRCIRegistrationPage({
  onRegistrationComplete,
}: SRRCIRegistrationPageProps) {
  const [displayName, setDisplayName] = useState("");
  const [legalFirstName, setLegalFirstName] = useState("");
  const [legalLastName, setLegalLastName] = useState("");
  const [age, setAge] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>(
    "prefer_not_to_say",
  );
  const [genderIdentity, setGenderIdentity] = useState("");

  const [relationshipStatus, setRelationshipStatus] =
    useState<RelationshipStatus>("prefer_not_to_say");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateOrProvince, setStateOrProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");

  const [educationLevel, setEducationLevel] = useState("");
  const [occupationCategory, setOccupationCategory] = useState("");
  const [clinicalContext, setClinicalContext] = useState("");
  const [medicalContext, setMedicalContext] = useState("");
  const [valuesContext, setValuesContext] = useState("");
  const [primaryReason, setPrimaryReason] = useState("");

  const [assessmentUseContext, setAssessmentUseContext] =
    useState<AssessmentUseContext>("personal_growth");

  const [partnerParticipationStatus, setPartnerParticipationStatus] =
    useState<PartnerParticipationStatus>("not_applicable");

  const [relationshipLength, setRelationshipLength] = useState("");
  const [
    sexualOrientationOrAttractionPattern,
    setSexualOrientationOrAttractionPattern,
  ] = useState("");
  const [exclusivityExpectation, setExclusivityExpectation] = useState("");

  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("SRRCI-X Standard");
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);

  function handleBeginAssessment() {
    if (!displayName.trim()) {
      window.alert("Please enter a display name.");
      return;
    }

    if (email.trim() && !email.includes("@")) {
      window.alert("Please enter a valid email address or leave it blank.");
      return;
    }

    if (!consentAcknowledged) {
      window.alert(
        "Please acknowledge the interpretation and privacy notice before beginning.",
      );
      return;
    }

    const parsedAge = Number(age);

    const profile = createSRRCIProfile({
      displayName,
      age: Number.isNaN(parsedAge) ? undefined : parsedAge,
      biologicalSex,
      genderIdentity,
      relationshipStatus,
    });

    const sharedProfile: SharedAssessmentProfile = {
      id: profile.id,
      sourceAssessment: "SRRCI-X",
      displayName: displayName.trim(),
      legalFirstName: legalFirstName.trim() || undefined,
      legalLastName: legalLastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      addressLine1: addressLine1.trim() || undefined,
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim() || undefined,
      stateOrProvince: stateOrProvince.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
      age: Number.isNaN(parsedAge) ? undefined : parsedAge,
      biologicalSex,
      genderIdentity: genderIdentity.trim() || undefined,
      relationshipStatus,
      educationLevel: educationLevel.trim() || undefined,
      occupationCategory: occupationCategory.trim() || undefined,
      clinicalContext: clinicalContext.trim() || undefined,
      medicalContext: medicalContext.trim() || undefined,
      valuesContext: valuesContext.trim() || undefined,
      primaryReason: primaryReason.trim() || undefined,
      assessmentUseContext,
      createdAt: new Date().toISOString(),
    };

    const intakeProfile: SRRCIIntakeProfile = {
      profileId: profile.id || createId(),
      partnerParticipationStatus,
      relationshipLength: relationshipLength.trim() || undefined,
      sexualOrientationOrAttractionPattern:
        sexualOrientationOrAttractionPattern.trim() || undefined,
      exclusivityExpectation: exclusivityExpectation.trim() || undefined,
      consentAcknowledged,
      billingMetadata: {
        billingName: billingName.trim() || undefined,
        billingEmail: billingEmail.trim() || undefined,
        selectedPackage: selectedPackage.trim() || undefined,
        paymentStatus: "not_started",
        paymentProcessorCustomerId: undefined,
        paymentProcessorSessionId: undefined,
      },
      createdAt: new Date().toISOString(),
    };

    saveSRRCIProfile(profile);
    saveSharedAssessmentProfile(sharedProfile);
    saveSRRCIIntakeProfile(intakeProfile);

    onRegistrationComplete();
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
          <div className="mb-8">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              Omniscient Technologies
            </div>

            <h1 className="text-4xl font-bold text-white">
              SRRCI-X Registration & Intake
            </h1>

            <div className="mt-3 text-lg text-slate-300">
              Sexual Regulation & Relational Compatibility Intelligence System
            </div>

            <p className="mt-6 max-w-3xl text-slate-400">
              This intake creates the SRRCI-X assessment profile and a reusable
              shared assessment profile for future non-ConscienceOS assessments.
              Payment collection should be handled through a secure payment
              processor; this page stores only billing metadata, not raw card
              numbers, expiration dates, or security codes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SectionHeader
              eyebrow="Core Profile"
              title="Participant Identity"
              body="These fields create the active SRRCI-X profile and can also support future shared assessments."
            />

            <TextInput
              label="Display Name"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Enter display name"
            />

            <TextInput
              label="Age"
              type="number"
              value={age}
              onChange={setAge}
              placeholder="Age"
            />

            <TextInput
              label="Legal First Name"
              value={legalFirstName}
              onChange={setLegalFirstName}
              placeholder="Optional"
            />

            <TextInput
              label="Legal Last Name"
              value={legalLastName}
              onChange={setLegalLastName}
              placeholder="Optional"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Biological Sex
              </label>

              <select
                value={biologicalSex}
                onChange={(event) =>
                  setBiologicalSex(event.target.value as BiologicalSex)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="intersex">Intersex</option>
                <option value="prefer_not_to_say">
                  Prefer Not To Say
                </option>
              </select>
            </div>

            <TextInput
              label="Gender Identity"
              value={genderIdentity}
              onChange={setGenderIdentity}
              placeholder="Optional"
            />

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Relationship Status
              </label>

              <select
                value={relationshipStatus}
                onChange={(event) =>
                  setRelationshipStatus(event.target.value as RelationshipStatus)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              >
                <option value="single">Single</option>
                <option value="dating">Dating</option>
                <option value="engaged">Engaged</option>
                <option value="married">Married</option>
                <option value="separated">Separated</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="prefer_not_to_say">
                  Prefer Not To Say
                </option>
              </select>
            </div>

            <SectionHeader
              eyebrow="Contact Information"
              title="Address, Phone, and Email"
              body="These fields are appropriate for account records, support, scheduling, billing records, and future user-profile continuity."
            />

            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@example.com"
            />

            <TextInput
              label="Telephone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="Phone number"
            />

            <TextInput
              label="Address Line 1"
              value={addressLine1}
              onChange={setAddressLine1}
              placeholder="Street address"
            />

            <TextInput
              label="Address Line 2"
              value={addressLine2}
              onChange={setAddressLine2}
              placeholder="Apartment, suite, unit, etc."
            />

            <TextInput
              label="City"
              value={city}
              onChange={setCity}
              placeholder="City"
            />

            <TextInput
              label="State / Province"
              value={stateOrProvince}
              onChange={setStateOrProvince}
              placeholder="State or province"
            />

            <TextInput
              label="Postal Code"
              value={postalCode}
              onChange={setPostalCode}
              placeholder="ZIP or postal code"
            />

            <TextInput
              label="Country"
              value={country}
              onChange={setCountry}
              placeholder="Country"
            />

            <SectionHeader
              eyebrow="Shared Assessment Context"
              title="Reusable Assessment Background"
              body="These fields can be reused by other assessment systems outside of ConscienceOS X."
            />

            <TextInput
              label="Education Level"
              value={educationLevel}
              onChange={setEducationLevel}
              placeholder="Optional"
            />

            <TextInput
              label="Occupation Category"
              value={occupationCategory}
              onChange={setOccupationCategory}
              placeholder="Optional"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Primary Assessment Use
              </label>

              <select
                value={assessmentUseContext}
                onChange={(event) =>
                  setAssessmentUseContext(
                    event.target.value as AssessmentUseContext,
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              >
                <option value="personal_growth">Personal Growth</option>
                <option value="relationship_insight">
                  Relationship Insight
                </option>
                <option value="couples_work">Couples Work</option>
                <option value="therapy_support">Therapy Support</option>
                <option value="research">Research</option>
                <option value="prefer_not_to_say">
                  Prefer Not To Say
                </option>
              </select>
            </div>

            <TextInput
              label="Primary Reason for Taking Assessment"
              value={primaryReason}
              onChange={setPrimaryReason}
              placeholder="Brief reason or goal"
            />

            <TextAreaInput
              label="Clinical / Therapy Context"
              value={clinicalContext}
              onChange={setClinicalContext}
              placeholder="Optional. Example: therapy support, relationship counseling, self-reflection, or research context."
            />

            <TextAreaInput
              label="Medical / Medication Context"
              value={medicalContext}
              onChange={setMedicalContext}
              placeholder="Optional. Include only what the user chooses to disclose."
            />

            <div className="md:col-span-2">
              <TextAreaInput
                label="Cultural, Religious, or Values Context"
                value={valuesContext}
                onChange={setValuesContext}
                placeholder="Optional. Include only if relevant to interpretation."
              />
            </div>

            <SectionHeader
              eyebrow="SRRCI-X Context"
              title="Relationship and Couple-Dynamics Setup"
              body="These fields support future partner comparison, couple-dynamics reporting, and relational interpretation."
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Partner Participation
              </label>

              <select
                value={partnerParticipationStatus}
                onChange={(event) =>
                  setPartnerParticipationStatus(
                    event.target.value as PartnerParticipationStatus,
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              >
                <option value="not_applicable">Not Applicable</option>
                <option value="partner_not_participating">
                  Partner Not Participating
                </option>
                <option value="partner_may_participate">
                  Partner May Participate
                </option>
                <option value="partner_participating">
                  Partner Participating
                </option>
                <option value="prefer_not_to_say">
                  Prefer Not To Say
                </option>
              </select>
            </div>

            <TextInput
              label="Relationship Length"
              value={relationshipLength}
              onChange={setRelationshipLength}
              placeholder="Example: 2 years, 8 months, not applicable"
            />

            <TextInput
              label="Sexual Orientation / Attraction Pattern"
              value={sexualOrientationOrAttractionPattern}
              onChange={setSexualOrientationOrAttractionPattern}
              placeholder="Optional"
            />

            <TextInput
              label="Exclusivity / Relationship Agreement"
              value={exclusivityExpectation}
              onChange={setExclusivityExpectation}
              placeholder="Example: monogamous, mutually negotiated, unclear, etc."
            />

            <SectionHeader
              eyebrow="Billing Metadata"
              title="Payment Placeholder"
              body="Do not enter or store raw card numbers, expiration dates, or security codes here. Future implementation should use Stripe, Square, PayPal/Braintree, Authorize.net, or another PCI-compliant processor."
            />

            <TextInput
              label="Billing Name"
              value={billingName}
              onChange={setBillingName}
              placeholder="Name for billing record"
            />

            <TextInput
              label="Billing Email"
              type="email"
              value={billingEmail}
              onChange={setBillingEmail}
              placeholder="billing@example.com"
            />

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Selected Product / Package
              </label>

              <select
                value={selectedPackage}
                onChange={(event) => setSelectedPackage(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              >
                <option value="SRRCI-X Standard">SRRCI-X Standard</option>
                <option value="SRRCI-X Couples">SRRCI-X Couples</option>
                <option value="SRRCI-X Therapist Review">
                  SRRCI-X Therapist Review
                </option>
                <option value="SRRCI-X Research Edition">
                  SRRCI-X Research Edition
                </option>
              </select>

              <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm leading-relaxed text-yellow-100">
                Payment UI placeholder: replace this section with a secure
                hosted checkout or tokenized payment element from your payment
                processor. Never store raw card data or CVV in clinicalSessionStore,
                application state, logs, or your database.
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={consentAcknowledged}
                  onChange={(event) =>
                    setConsentAcknowledged(event.target.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900"
                />

                <span className="text-sm leading-relaxed text-slate-300">
                  I understand that SRRCI-X results are assessment and
                  decision-support information, not a stand-alone medical or
                  mental-health diagnosis. I also understand that sensitive
                  contact, relationship, and billing metadata should be handled
                  according to appropriate privacy and security standards.
                </span>
              </label>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
              ConscienceOS X profiles remain separate. This shared profile is
              intended only for SRRCI-X and future non-ConscienceOS assessments.
            </p>

            <button
              type="button"
              onClick={handleBeginAssessment}
              className="rounded-2xl bg-cyan-500 px-8 py-4 text-lg font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Begin Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
