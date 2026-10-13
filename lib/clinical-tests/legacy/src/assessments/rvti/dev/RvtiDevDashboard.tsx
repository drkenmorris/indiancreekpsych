"use client";
import { useMemo, useState } from "react";
import type {
  RvtiItemBase,
  RvtiResponses,
  TimeToleranceOption,
} from "../rvtiTypes";
import { rvtiDevItemBank } from "../rvtiItemBank";
import { scoreRvtiIndividual } from "../rvtiScoring";

type DomainGroup = {
  domain: string;
  items: RvtiItemBase[];
};

const timeOptions: Array<{ value: TimeToleranceOption; label: string }> = [
  { value: "IMMEDIATE", label: "Immediately" },
  { value: "WITHIN_6_MONTHS", label: "Within 6 months" },
  { value: "WITHIN_1_2_YEARS", label: "Within 1–2 years" },
  { value: "WITHIN_3_5_YEARS", label: "Within 3–5 years" },
  { value: "INDEFINITELY", label: "Indefinitely tolerable" },
];

function groupItemsByDomain(items: RvtiItemBase[]): DomainGroup[] {
  const order: string[] = [];
  const grouped = new Map<string, RvtiItemBase[]>();

  for (const item of items) {
    if (!grouped.has(item.domain)) {
      grouped.set(item.domain, []);
      order.push(item.domain);
    }
    grouped.get(item.domain)!.push(item);
  }

  return order.map((domain) => ({
    domain,
    items: grouped.get(domain) ?? [],
  }));
}

function defaultForItem(item: RvtiItemBase): number | TimeToleranceOption {
  switch (item.scale) {
    case "LIKERT_1_7":
      return 4;
    case "IMPORTANCE_1_10":
      return 5;
    case "TIME_TOLERANCE":
      return "WITHIN_1_2_YEARS";
    default:
      return 4;
  }
}

function formatDomainTitle(domain: string): string {
  switch (domain) {
    case "RVTI_SEX":
      return "Sexual Exclusivity & Loyalty";
    case "RVTI_FIN":
      return "Financial Philosophy";
    case "RVTI_AUT":
      return "Autonomy vs Togetherness";
    case "RVTI_CHI":
      return "Children & Parenting";
    case "RVTI_PWR":
      return "Power & Control Distribution";
    case "RVTI_SPI":
      return "Spiritual / Meaning Framework";
    case "RVTI_MOR":
      return "Moral Integrity & Honesty";
    case "RVTI_CON":
      return "Conflict Philosophy";
    case "RVTI_GEN":
      return "Gender Role Expectations";
    case "RVTI_AMB":
      return "Ambition & Life Direction";
    case "RVTI_EXT":
      return "Extended Family Boundaries";
    case "RVTI_PRI":
      return "Privacy & Transparency Expectations";
    case "RVTI_SOC":
      return "Social & Lifestyle Compatibility";
    case "RVTI_HEA":
      return "Health & Self-Care Philosophy";
    default:
      return domain;
  }
}

function getDomainIntro(domain: string): string {
  switch (domain) {
    case "RVTI_SEX":
      return "These questions assess your beliefs, priorities, and relationship limits regarding exclusivity, fidelity, and sexual loyalty.";
    case "RVTI_FIN":
      return "These questions assess your beliefs, priorities, and relationship limits regarding money, financial transparency, spending, risk, and control.";
    case "RVTI_AUT":
      return "These questions assess your beliefs, priorities, and relationship limits regarding independence, privacy, closeness, emotional space, and autonomy.";
    case "RVTI_CHI":
      return "These questions assess your beliefs, priorities, and relationship limits regarding children, parenting, discipline, developmental support, and family values.";
    case "RVTI_PWR":
      return "These questions assess your beliefs, priorities, and relationship limits regarding decision-making authority, equality, leadership, and control within a relationship.";
    case "RVTI_SPI":
      return "These questions assess your beliefs, priorities, and relationship limits regarding faith, spirituality, shared meaning, and moral worldview.";
    case "RVTI_MOR":
      return "These questions assess your beliefs, priorities, and relationship limits regarding honesty, integrity, truthfulness, and ethical conduct.";
    case "RVTI_CON":
      return "These questions assess your beliefs, priorities, and relationship limits regarding conflict, communication, repair, and how disagreements should be handled.";
    case "RVTI_GEN":
      return "These questions assess your beliefs, priorities, and relationship limits regarding gender roles, expectations, responsibilities, and role structure in a relationship.";
    case "RVTI_AMB":
      return "These questions assess your beliefs, priorities, and relationship limits regarding ambition, achievement, lifestyle direction, and long-term goals.";
    case "RVTI_EXT":
      return "These questions assess your beliefs, priorities, and relationship limits regarding extended family influence, loyalty, boundaries, and outside involvement.";
    case "RVTI_PRI":
      return "These questions assess your beliefs, priorities, and relationship limits regarding privacy, openness, personal boundaries, and transparency.";
    case "RVTI_SOC":
      return "These questions assess your beliefs, priorities, and relationship limits regarding social life, recreation, activity level, and lifestyle compatibility.";
    case "RVTI_HEA":
      return "These questions assess your beliefs, priorities, and relationship limits regarding health, wellness, self-care, substance use, and lifestyle habits.";
    default:
      return "These questions assess your beliefs, priorities, and relationship limits in this relationship domain.";
  }
}

function getConstructLabel(item: RvtiItemBase): string {
  const id = item.id;

  if (id.includes("_D1")) return "Position / Belief";
  if (id.includes("_D2")) return "Importance";
  if (id.includes("_D3")) return "Identity Fusion";

  if (item.followupRole === "SEVERITY") return "Severity";
  if (item.followupRole === "LIKELIHOOD") return "Exit Likelihood";
  if (item.followupRole === "TIME") return "Time Tolerance";

  return "Response";
}

function getScaleAnchors(item: RvtiItemBase): {
  left: string;
  center?: string;
  right: string;
} {
  const id = item.id;

  if (item.scale === "IMPORTANCE_1_10") {
    return {
      left: "Not important at all",
      center: "Moderately important",
      right: "Absolutely essential",
    };
  }

  if (item.scale === "TIME_TOLERANCE") {
    return {
      left: "Least tolerance",
      right: "Most tolerance",
    };
  }

  if (item.followupRole === "SEVERITY") {
    return {
      left: "Not disturbing at all",
      center: "Moderately upsetting",
      right: "Extremely distressing",
    };
  }

  if (item.followupRole === "LIKELIHOOD") {
    return {
      left: "Would definitely not end the relationship",
      center: "Unsure / depends",
      right: "Would almost certainly end the relationship",
    };
  }

  if (id.includes("_D1")) {
    return {
      left: "Strongly disagree",
      center: "Neutral / unsure",
      right: "Strongly agree",
    };
  }

  if (id.includes("_D3")) {
    return {
      left: "Not at all true of me",
      center: "Moderately true",
      right: "Completely true / core to who I am",
    };
  }

  return {
    left: "Low",
    center: "Moderate",
    right: "High",
  };
}

function isBeliefItem(item: RvtiItemBase): boolean {
  return item.id.includes("_D1") || item.id.includes("_D2") || item.id.includes("_D3");
}

function isScenarioItem(item: RvtiItemBase): boolean {
  return !isBeliefItem(item);
}

function getScenarioStemId(item: RvtiItemBase): string {
  return item.stemId ?? item.id;
}

function groupScenarioItems(
  items: RvtiItemBase[]
): Array<{ stemId: string; items: RvtiItemBase[] }> {
  const order: string[] = [];
  const grouped = new Map<string, RvtiItemBase[]>();

  for (const item of items) {
    const stemId = getScenarioStemId(item);
    if (!grouped.has(stemId)) {
      grouped.set(stemId, []);
      order.push(stemId);
    }
    grouped.get(stemId)!.push(item);
  }

  return order.map((stemId) => ({
    stemId,
    items: grouped.get(stemId) ?? [],
  }));
}

function renderScale(
  item: RvtiItemBase,
  value: number | TimeToleranceOption,
  onChange: (value: number | TimeToleranceOption) => void
) {
  const anchors = getScaleAnchors(item);

  if (item.scale === "LIKERT_1_7") {
    const numericValue = typeof value === "number" ? value : 4;

    return (
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 6,
            gap: 8,
          }}
        >
          <div style={{ textAlign: "left" }}>{anchors.left}</div>
          <div style={{ textAlign: "center" }}>{anchors.center ?? ""}</div>
          <div style={{ textAlign: "right" }}>{anchors.right}</div>
        </div>

        <input
          type="range"
          min={1}
          max={7}
          step={1}
          value={numericValue}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />

        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
          Selected: {numericValue}
        </div>
      </div>
    );
  }

  if (item.scale === "IMPORTANCE_1_10") {
    const numericValue = typeof value === "number" ? value : 5;

    return (
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 6,
            gap: 8,
          }}
        >
          <div style={{ textAlign: "left" }}>{anchors.left}</div>
          <div style={{ textAlign: "center" }}>{anchors.center ?? ""}</div>
          <div style={{ textAlign: "right" }}>{anchors.right}</div>
        </div>

        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={numericValue}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />

        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
          Selected: {numericValue}
        </div>
      </div>
    );
  }

  if (item.scale === "TIME_TOLERANCE") {
    const selectedValue =
      typeof value === "string" ? value : "WITHIN_1_2_YEARS";

    return (
      <div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          Choose how long you believe you could tolerate this pattern before ending the relationship.
        </div>

        <select
          value={selectedValue}
          onChange={(e) => onChange(e.target.value as TimeToleranceOption)}
          style={{
            width: "100%",
            padding: "0.65rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#fff",
          }}
        >
          {timeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}

function scoreLabel(score: number): string {
  if (score < 20) return "Very Low";
  if (score < 40) return "Low";
  if (score < 60) return "Moderate";
  if (score < 80) return "High";
  return "Very High";
}

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span>
          {pct.toFixed(0)} ({scoreLabel(pct)})
        </span>
      </div>

      <div
        style={{
          height: 10,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "#4b5563",
          }}
        />
      </div>
    </div>
  );
}

export default function RvtiDevDashboard() {
  const domainGroups = useMemo(() => groupItemsByDomain(rvtiDevItemBank), []);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const [responses, setResponses] = useState<RvtiResponses>(() => {
    const initial: RvtiResponses = {};
    for (const item of rvtiDevItemBank) {
      initial[item.id] = defaultForItem(item);
    }
    return initial;
  });

  const currentDomain = domainGroups[currentDomainIndex];
  const beliefItems = currentDomain ? currentDomain.items.filter(isBeliefItem) : [];
  const scenarioItems = currentDomain ? currentDomain.items.filter(isScenarioItem) : [];
  const scenarioGroups = groupScenarioItems(scenarioItems);

  function updateResponse(id: string, value: number | TimeToleranceOption) {
    setResponses((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  if (showResults) {
    const profile = scoreRvtiIndividual(responses);

    return (
      <div style={{ padding: 20, maxWidth: 960 }}>
        <h2 style={{ marginBottom: 6 }}>RVTI Development Results</h2>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 18 }}>
          The values below are computed scores based on your responses. “Rupture Reactivity” is a calculated summary and is not a direct response item.
        </div>

        {profile.domainScores.map((domainScore) => (
          <div
            key={domainScore.domain}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              background: "#fff",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {formatDomainTitle(domainScore.domain)}
            </h3>

            <Bar label="Position / Conviction" value={domainScore.position_0_100} />
            <Bar label="Importance" value={domainScore.importance_0_100} />
            <Bar label="Identity Fusion" value={domainScore.identityFusion_0_100} />
            <Bar label="Severity" value={domainScore.severity_0_100} />
            <Bar label="Exit Likelihood" value={domainScore.exitLikelihood_0_100} />
            <Bar label="Time Tolerance" value={domainScore.timeTolerance_0_100} />
            <Bar
              label="Rupture Reactivity (Composite)"
              value={domainScore.ruptureReactivity_0_100}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => setShowResults(false)}
          style={{
            padding: "0.7rem 1rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            cursor: "pointer",
          }}
        >
          Back to Test
        </button>
      </div>
    );
  }

  if (!currentDomain) {
    return (
      <div style={{ padding: 20 }}>
        <h2>RVTI Development Dashboard</h2>
        <div style={{ color: "#6b7280" }}>
          No domains are currently available in the RVTI development item bank.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 960 }}>
      <h2 style={{ marginBottom: 6 }}>RVTI Development Dashboard</h2>

      <nav className="rvtiDomainNavigator" aria-label="RVTI domain sections">
        <label htmlFor="rvti-domain-select">Select assessment domain</label>
        <select
          id="rvti-domain-select"
          value={currentDomainIndex}
          onChange={event=>setCurrentDomainIndex(Number(event.target.value))}
        >
          {domainGroups.map((group,index)=>(
            <option key={group.domain} value={index}>
              {String(index+1).padStart(2,"0")} · {formatDomainTitle(group.domain)}
            </option>
          ))}
        </select>
        <small>Choose a domain directly or use the Previous / Next controls below.</small>
      </nav>

      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        Domain {currentDomainIndex + 1} of {domainGroups.length}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 18,
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{formatDomainTitle(currentDomain.domain)}</h3>

        <div
          style={{
            fontSize: 14,
            color: "#4b5563",
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          {getDomainIntro(currentDomain.domain)}
        </div>

        {beliefItems.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h4 style={{ marginBottom: 10 }}>Beliefs & Priorities</h4>

            {beliefItems.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {getConstructLabel(item)}
                </div>

                <div style={{ fontSize: 15, marginBottom: 10 }}>{item.prompt}</div>

                {renderScale(item, responses[item.id], (value) =>
                  updateResponse(item.id, value)
                )}
              </div>
            ))}
          </section>
        )}

        {scenarioGroups.length > 0 && (
          <section>
            <h4 style={{ marginBottom: 10 }}>Situational Responses</h4>

            {scenarioGroups.map((group, groupIndex) => (
              <div
                key={group.stemId}
                style={{
                  border: "1px solid #f0f0f0",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14,
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Scenario {groupIndex + 1}
                </div>

                {group.items.map((item) => (
                  <div key={item.id} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      {getConstructLabel(item)}
                    </div>

                    <div style={{ fontSize: 15, marginBottom: 8 }}>{item.prompt}</div>

                    {renderScale(item, responses[item.id], (value) =>
                      updateResponse(item.id, value)
                    )}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentDomainIndex((i) => Math.max(0, i - 1))}
          disabled={currentDomainIndex === 0}
          style={{
            padding: "0.7rem 1rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: currentDomainIndex === 0 ? "#f3f4f6" : "#f9fafb",
            cursor: currentDomainIndex === 0 ? "not-allowed" : "pointer",
          }}
        >
          Previous Domain
        </button>

        {currentDomainIndex < domainGroups.length - 1 ? (
          <button
            type="button"
            onClick={() =>
              setCurrentDomainIndex((i) => Math.min(domainGroups.length - 1, i + 1))
            }
            style={{
              padding: "0.7rem 1rem",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#eef2ff",
              cursor: "pointer",
            }}
          >
            Next Domain
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowResults(true)}
            style={{
              padding: "0.7rem 1rem",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#dcfce7",
              cursor: "pointer",
            }}
          >
            Score Test
          </button>
        )}
      </div>
    </div>
  );
}