"use client";
import { clinicalSessionStore } from "@/lib/clinical-tests/clinicalSessionStore";
// src/asq/BehaviorLog.tsx

import React, { useEffect, useState } from "react";
import type {
  BehaviorIncident,
  BehaviorType,
  SettingType,
  TriggerTag,
  IncidentCreatorRole,
  SchoolViewerRole,
  DisciplinaryActionType,
  DisciplinaryDeciderRole,
} from "./behavior";
import {
  BehaviorTypeLabels,
  SettingLabels,
  TriggerLabels,
  suggestStrategiesForIncident,
} from "./behavior";

import {
  loadAppData,
  saveAppData,
  createChildProfile,
  type ChildData,
} from "./storage";

import { downloadIncidentReportPdf } from "./PrintableIncidentReport";


// Map for discipline role labels
const DisciplinaryDeciderRoleLabels = {
  TEACHER: "Teacher",
  COUNSELOR: "Counselor",
  ADMIN: "Admin",
  PRINCIPAL: "Principal",
  DEAN: "Dean",
  NURSE: "Nurse",
  OTHER: "Other",
} as const;


// How many days after an incident before editing the main record is locked
const EDIT_LOCK_DAYS = 14;

function isIncidentLocked(incident: BehaviorIncident): boolean {
  const src =
    incident.incidentOccurredAt || incident.reportedAt || incident.timestamp;

  if (!src) return false;

  const d = new Date(src);
  if (Number.isNaN(d.getTime())) return false;

  const now = Date.now();
  const ageMs = now - d.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  return ageDays > EDIT_LOCK_DAYS;
}

const reporterRoleOptions = [
  { value: "parent", label: "Parent / Caregiver" },
  { value: "teacher", label: "Teacher / School Staff" },
  { value: "counselor", label: "Counselor / Therapist" },
] as const;

type ReporterRoleOption = (typeof reporterRoleOptions)[number]["value"];

const schoolViewerRoleOptions: { value: SchoolViewerRole; label: string }[] = [
  { value: "TEACHER", label: "Teachers" },
  { value: "COUNSELOR", label: "Counselors" },
  { value: "ADMIN", label: "Administrators" },
];

type ViewerMode = "PARENT" | "SCHOOL";

interface BehaviorLogProps {
  viewerMode?: ViewerMode;
  onSelectionChange?: (payload: {
    selectedIds: string[];
    selectedIncidents: BehaviorIncident[];
    filteredIncidents: BehaviorIncident[];
    /** What you probably want to feed into Print/PDF:
     *  - if any are selected → those
     *  - otherwise        → all filtered incidents
     */
    effectiveForExport: BehaviorIncident[];
  }) => void;
}

export const BehaviorLog: React.FC<BehaviorLogProps> = ({
  viewerMode = "PARENT",
  onSelectionChange,
}) => {
  // --- App-level data: children + active child ---
  const [children, setChildren] = useState<ChildData[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  // --- New child form state ---
  const [newChildName, setNewChildName] = useState("");
  const [newChildGrade, setNewChildGrade] = useState("");

  // --- Incident form state (for currently active child) ---
  const [reporterName, setReporterName] = useState("");
  const [reporterRole, setReporterRole] =
    useState<ReporterRoleOption>("teacher");
  const [behaviorType, setBehaviorType] = useState<BehaviorType>("MELTDOWN");
  const [setting, setSetting] = useState<SettingType>("SCHOOL");
  const [locationNote, setLocationNote] = useState("");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [triggers, setTriggers] = useState<TriggerTag[]>([]);
  const [description, setDescription] = useState("");
  const [whatHelped, setWhatHelped] = useState("");

  // Incident time (HTML datetime-local compatible string)
  const [incidentDateTime, setIncidentDateTime] = useState<string>("");

  // Share-with-school controls
  const [shareWithSchool, setShareWithSchool] = useState<boolean>(false);
  const [shareRoles, setShareRoles] = useState<SchoolViewerRole[]>([
    "TEACHER",
    "COUNSELOR",
    "ADMIN",
  ]);

  const [selectedIncidentId, setSelectedIncidentId] =
    useState<string | null>(null);
  const [editingIncidentId, setEditingIncidentId] =
    useState<string | null>(null);

  // --- Disciplinary action (admin/school use) state for selected incident ---
  const [disciplineType, setDisciplineType] =
    useState<DisciplinaryActionType>("NONE");
  const [disciplineDetails, setDisciplineDetails] = useState("");
  const [disciplineByName, setDisciplineByName] = useState("");
  const [disciplineByRole, setDisciplineByRole] =
    useState<DisciplinaryDeciderRole>("ADMIN");
  const [disciplineDecidedAt, setDisciplineDecidedAt] = useState<string>("");

  // --- NEW: Selection & filters for incidents ---
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<string[]>([]);
  const [behaviorFilter, setBehaviorFilter] =
    useState<BehaviorType | "ALL">("ALL");
  const [settingFilter, setSettingFilter] =
    useState<SettingType | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] =
    useState<"" | "1" | "2" | "3" | "4" | "5">("");
  const [sharedFilter, setSharedFilter] =
    useState<"" | "SHARED" | "PRIVATE">("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // --- Load from clinicalSessionStore on mount ---
  useEffect(() => {
    const data = loadAppData();
    setChildren(data.children || []);
    setActiveChildId(data.activeChildId || null);
  }, []);

  // --- Persist whenever children/activeChildId change ---
  useEffect(() => {
    saveAppData({
      children,
      activeChildId,
    });
  }, [children, activeChildId]);

  const activeChild =
    children.find((c) => c.profile.id === activeChildId) || null;
  const incidents: BehaviorIncident[] = activeChild ? activeChild.incidents : [];

  // --- Filters: derive filtered incidents ---
  const filteredIncidents = incidents.filter((incident) => {
    // Date range filter
    if (dateFrom || dateTo) {
      const src =
        incident.incidentOccurredAt ||
        incident.reportedAt ||
        incident.timestamp;
      if (src) {
        const d = new Date(src);
        if (!Number.isNaN(d.getTime())) {
          if (dateFrom) {
            const from = new Date(dateFrom);
            if (d < from) return false;
          }
          if (dateTo) {
            const to = new Date(dateTo);
            // include the entire "to" day by adding 1 day and using <
            to.setDate(to.getDate() + 1);
            if (d >= to) return false;
          }
        }
      }
    }

    // Behavior filter
    if (behaviorFilter !== "ALL" && incident.behaviorType !== behaviorFilter) {
      return false;
    }

    // Setting filter
    if (settingFilter !== "ALL" && incident.setting !== settingFilter) {
      return false;
    }

    // Severity filter
    if (severityFilter !== "") {
      const sev = Number(severityFilter);
      if (incident.severity !== sev) return false;
    }

    // Shared / private filter
    if (sharedFilter === "SHARED" && !incident.sharedWithSchool) {
      return false;
    }
    if (sharedFilter === "PRIVATE" && incident.sharedWithSchool) {
      return false;
    }

    return true;
  });

  const totalCount = incidents.length;
  const filteredCount = filteredIncidents.length;
  const selectedCount = selectedIncidentIds.length;

  // Let parent know what is currently selected / exportable
  useEffect(() => {
    if (!onSelectionChange) return;

    const selectedIncidents = incidents.filter((i) =>
      selectedIncidentIds.includes(i.id)
    );

    const effectiveForExport =
      selectedIncidents.length > 0 ? selectedIncidents : filteredIncidents;

    onSelectionChange({
      selectedIds: selectedIncidentIds,
      selectedIncidents,
      filteredIncidents,
      effectiveForExport,
    });
  }, [onSelectionChange, incidents, selectedIncidentIds, filteredIncidents]);

  const toggleTrigger = (tag: TriggerTag) => {
    setTriggers((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleShareRole = (role: SchoolViewerRole) => {
    setShareRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newChildName.trim();
    if (!trimmedName) return;

    const profile = createChildProfile(trimmedName, {
      grade: newChildGrade.trim() || undefined,
    });

    const newChild: ChildData = {
      profile,
      incidents: [],
    };

    const updated = [...children, newChild];
    setChildren(updated);
    setActiveChildId(profile.id);
    setNewChildName("");
    setNewChildGrade("");
    setSelectedIncidentId(null);
    setEditingIncidentId(null);
    setSelectedIncidentIds([]);
  };

  const resetIncidentForm = () => {
    setBehaviorType("MELTDOWN");
    setSetting("SCHOOL");
    setLocationNote("");
    setSeverity(3);
    setTriggers([]);
    setDescription("");
    setWhatHelped("");
    setIncidentDateTime("");
    setShareWithSchool(false);
    setShareRoles(["TEACHER", "COUNSELOR", "ADMIN"]);
  };

  const handleChangeActiveChild = (childId: string) => {
    setActiveChildId(childId);
    setSelectedIncidentId(null);
    setEditingIncidentId(null);
    setSelectedIncidentIds([]);
    resetIncidentForm();
  };

  const handleSubmitIncident = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeChild) {
      alert("Please add or select a child before logging incidents.");
      return;
    }

    const now = new Date().toISOString();

    let occurredAtIso = now;
    if (incidentDateTime) {
      try {
        occurredAtIso = new Date(incidentDateTime).toISOString();
      } catch {
        occurredAtIso = now;
      }
    }

    const creatorRole: IncidentCreatorRole =
      reporterRole === "parent"
        ? "PARENT"
        : reporterRole === "teacher"
        ? "TEACHER"
        : "COUNSELOR";

    if (editingIncidentId) {
      // update existing incident
      const updatedChildren = children.map((child) => {
        if (child.profile.id !== activeChild.profile.id) return child;

        const updatedIncidents = child.incidents.map((inc) => {
          if (inc.id !== editingIncidentId) return inc;

          return {
            ...inc,
            reporterName: reporterName.trim() || undefined,
            reporterRole,
            behaviorType,
            setting,
            locationNote: locationNote.trim() || undefined,
            severity,
            triggers,
            description: description.trim() || undefined,
            whatHelped: whatHelped.trim() || undefined,
            incidentOccurredAt: occurredAtIso,
            sharedWithSchool: shareWithSchool,
            sharedWithRoles: shareWithSchool ? shareRoles : [],
          };
        });

        return {
          ...child,
          incidents: updatedIncidents,
        };
      });

      setChildren(updatedChildren);
      setSelectedIncidentId(editingIncidentId);
      setEditingIncidentId(null);
      resetIncidentForm();
      return;
    }

    // create new incident
    const newIncident: BehaviorIncident = {
      id: now + Math.random().toString(36).slice(2),
      timestamp: now, // legacy "reportedAt"
      incidentOccurredAt: occurredAtIso,
      reportedAt: now,

      reporterName: reporterName.trim() || undefined,
      reporterRole,
      behaviorType,
      setting,
      locationNote: locationNote.trim() || undefined,
      severity,
      triggers,
      description: description.trim() || undefined,
      whatHelped: whatHelped.trim() || undefined,

      createdByRole: creatorRole,

      sharedWithSchool: shareWithSchool,
      sharedWithRoles: shareWithSchool ? shareRoles : [],

      disciplinaryActionType: "NONE",
      adminUpdates: [],
    };

    const updatedChildren = children.map((child) => {
      if (child.profile.id !== activeChild.profile.id) return child;
      return {
        ...child,
        incidents: [newIncident, ...child.incidents],
      };
    });

    setChildren(updatedChildren);
    setSelectedIncidentId(newIncident.id);
    setSelectedIncidentIds((prev) => [...prev, newIncident.id]);
    resetIncidentForm();
  };

  const handleEditIncident = (incident: BehaviorIncident) => {
    setEditingIncidentId(incident.id);
    setSelectedIncidentId(incident.id);

    setReporterName(incident.reporterName ?? "");
    setReporterRole(incident.reporterRole as ReporterRoleOption);
    setBehaviorType(incident.behaviorType);
    setSetting(incident.setting);
    setLocationNote(incident.locationNote ?? "");
    setSeverity(incident.severity);
    setTriggers(incident.triggers ?? []);
    setDescription(incident.description ?? "");
    setWhatHelped(incident.whatHelped ?? "");

    const srcTime =
      incident.incidentOccurredAt ||
      incident.reportedAt ||
      incident.timestamp;
    try {
      if (srcTime) {
        const iso = new Date(srcTime).toISOString();
        setIncidentDateTime(iso.slice(0, 16)); // YYYY-MM-DDTHH:MM
      } else {
        setIncidentDateTime("");
      }
    } catch {
      setIncidentDateTime("");
    }

    setShareWithSchool(!!incident.sharedWithSchool);
    if (incident.sharedWithSchool && incident.sharedWithRoles?.length) {
      setShareRoles(incident.sharedWithRoles as SchoolViewerRole[]);
    } else {
      setShareRoles(["TEACHER", "COUNSELOR", "ADMIN"]);
    }

    setDisciplineType(incident.disciplinaryActionType ?? "NONE");
    setDisciplineDetails(incident.disciplinaryActionDetails ?? "");
    setDisciplineByName(incident.disciplinaryDecidedByName ?? "");
    setDisciplineByRole(
      (incident.disciplinaryDecidedByRole as DisciplinaryDeciderRole) ||
        "ADMIN"
    );

    try {
      if (incident.disciplinaryDecidedAt) {
        const iso = new Date(incident.disciplinaryDecidedAt).toISOString();
        setDisciplineDecidedAt(iso.slice(0, 16));
      } else {
        setDisciplineDecidedAt("");
      }
    } catch {
      setDisciplineDecidedAt("");
    }
  };

  const handleCancelEdit = () => {
    setEditingIncidentId(null);
    resetIncidentForm();
  };

  const handleSaveDiscipline = () => {
    if (!activeChild || !selectedIncidentId) return;

    const decidedAtIso = disciplineDecidedAt
      ? new Date(disciplineDecidedAt).toISOString()
      : undefined;

    const updatedChildren = children.map((child) => {
      if (child.profile.id !== activeChild.profile.id) return child;

      const updatedIncidents = child.incidents.map((inc) => {
        if (inc.id !== selectedIncidentId) return inc;

        return {
          ...inc,
          disciplinaryActionType: disciplineType,
          disciplinaryActionDetails: disciplineDetails.trim() || undefined,
          disciplinaryDecidedByName: disciplineByName.trim() || undefined,
          disciplinaryDecidedByRole: disciplineByRole,
          disciplinaryDecidedAt: decidedAtIso,
        };
      });

      return {
        ...child,
        incidents: updatedIncidents,
      };
    });

    setChildren(updatedChildren);
  };

  // --- Selection helpers ---
  const toggleIncidentSelected = (id: string) => {
    setSelectedIncidentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    filteredIncidents.length > 0 &&
    filteredIncidents.every((inc) => selectedIncidentIds.includes(inc.id));

  const handleToggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      // unselect all visible
      const visibleIds = new Set(filteredIncidents.map((i) => i.id));
      setSelectedIncidentIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      // add all visible
      setSelectedIncidentIds((prev) => {
        const set = new Set(prev);
        filteredIncidents.forEach((i) => set.add(i.id));
        return Array.from(set);
      });
    }
  };

  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) ?? null;

  const suggestions = selectedIncident
    ? suggestStrategiesForIncident(selectedIncident)
    : [];

  const incidentIsLocked = selectedIncident
    ? isIncidentLocked(selectedIncident)
    : false;

  // Build tooltip text for the discipline badge in the incident list
  const getDisciplineTooltip = (
    incident: BehaviorIncident
  ): string | undefined => {
    const parts: string[] = [];

    if (
      incident.disciplinaryDecidedByName ||
      incident.disciplinaryDecidedByRole
    ) {
      const roleLabel = incident.disciplinaryDecidedByRole
        ? DisciplinaryDeciderRoleLabels[
            incident.disciplinaryDecidedByRole as DisciplinaryDeciderRole
          ]
        : undefined;

      let who = "";
      if (roleLabel) who += roleLabel;
      if (incident.disciplinaryDecidedByName) {
        who += who
          ? ` ${incident.disciplinaryDecidedByName}`
          : incident.disciplinaryDecidedByName;
      }
      if (who) parts.push(`Decided by: ${who}`);
    }

    if (incident.disciplinaryDecidedAt) {
      try {
        const d = new Date(incident.disciplinaryDecidedAt);
        parts.push(`On: ${d.toLocaleString()}`);
      } catch {
        // ignore bad date
      }
    }

    if (incident.disciplinaryActionDetails) {
      parts.push(`Notes: ${incident.disciplinaryActionDetails}`);
    }

    if (parts.length === 0) return undefined;
    return parts.join(" | ");
  };

  // Incidents to use for export/print:
  //  - If any are checked, use just those
  //  - Otherwise, use whatever is currently filtered / visible


  const exportIncidents =
    selectedIncidentIds.length > 0
      ? incidents.filter((i) => selectedIncidentIds.includes(i.id))
      : filteredIncidents;

        const handleDownloadPdf = async () => {
    if (!activeChild) {
      alert("Please select a child before downloading a report.");
      return;
    }

    if (exportIncidents.length === 0) {
      alert("No incidents to include with the current filters/selection.");
      return;
    }

    try {
      await downloadIncidentReportPdf(activeChild.profile, exportIncidents);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Sorry, something went wrong while generating the PDF.");
    }
  };



    const handleOpenPrintView = () => {

        {/*}
    }
  const handleDownloadPdf = async () => {
    if (!activeChild) {
      alert("Please select a child before downloading a PDF.");
      return;
    }

    if (exportIncidents.length === 0) {
      alert("No incidents to include in the PDF with the current filters/selection.");
      return;
    }
    try {
      await downloadIncidentReportPdf(activeChild.profile, exportIncidents);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Sorry, something went wrong while generating the PDF.");
    }
  };


*/}

    if (!activeChild) {
      alert("Please select a child before printing.");
      return;
    }

    if (exportIncidents.length === 0) {
      alert("No incidents to print with the current filters/selection.");
      return;
    }

    const childName = activeChild.profile.name;

    // Build printable HTML
    const rowsHtml = exportIncidents
      .map((inc) => {
        const dtSource =
          inc.incidentOccurredAt || inc.reportedAt || inc.timestamp;
        const dt = dtSource ? new Date(dtSource) : null;

        const dateLabel =
          dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString() : "—";
        const settingLabel = SettingLabels[inc.setting];
        const behaviorLabel = BehaviorTypeLabels[inc.behaviorType];
        const triggersText =
          inc.triggers && inc.triggers.length > 0
            ? inc.triggers.map((t) => TriggerLabels[t]).join(", ")
            : "—";
        const descriptionText = inc.description || "—";
        const whatHelpedText = inc.whatHelped || "—";
        const locationText = inc.locationNote || "—";
        const sharedText = inc.sharedWithSchool
          ? inc.sharedWithRoles && inc.sharedWithRoles.length > 0
            ? `Yes (${inc.sharedWithRoles.join(", ")})`
            : "Yes"
          : "No – home only";

        return `
          <tr>
            <td>${dateLabel}</td>
            <td>${behaviorLabel}</td>
            <td>${settingLabel}</td>
            <td>${locationText}</td>
            <td>${inc.severity}</td>
            <td>${triggersText}</td>
            <td>${descriptionText}</td>
            <td>${whatHelpedText}</td>
            <td>${sharedText}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Behavior Log for ${childName}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              margin: 1rem;
              font-size: 12px;
              color: #111827;
            }
            h1, h2 {
              margin: 0 0 0.5rem 0;
            }
            h1 {
              font-size: 1.4rem;
            }
            h2 {
              font-size: 1rem;
              color: #4b5563;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0.75rem;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 0.3rem 0.4rem;
              vertical-align: top;
            }
            th {
              background-color: #f3f4f6;
              font-weight: 600;
            }
            .meta {
              font-size: 0.8rem;
              color: #4b5563;
              margin-bottom: 0.25rem;
            }
          </style>
        </head>
        <body>
          <h1>Behavior Log</h1>
          <h2>Child: ${childName}</h2>
          <div class="meta">
            Incidents included: ${exportIncidents.length}  
            ${
              selectedIncidentIds.length > 0
                ? "(based on selected checkboxes)"
                : "(based on current filters)"
            }
          </div>
          <table>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Behavior</th>
                <th>Setting</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Triggers</th>
                <th>Description</th>
                <th>What helped</th>
                <th>Shared with school?</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

  const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups for this site to print.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div>
      <h2
        style={{
          fontSize: "1.2rem",
          marginBottom: "0.5rem",
        }}
      >
        Behavior Log & Support (Per-Child)
      </h2>
      <p
        style={{
          fontSize: "0.9rem",
          color: "#4b5563",
          marginBottom: "1rem",
        }}
      >
        Select which child you&apos;re tracking, log incidents, edit past
        entries, and view tailored support suggestions. All data is stored
        locally in this browser, per child.
      </p>

      {/* Child selector & new child form */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
          padding: "0.75rem",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ minWidth: "220px" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginBottom: "0.25rem",
            }}
          >
            Select child
          </label>
          {children.length === 0 ? (
            <p
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
              }}
            >
              No children added yet. Use the form on the right to add the first
              child.
            </p>
          ) : (
            <select
              value={activeChildId || ""}
              onChange={(e) => handleChangeActiveChild(e.target.value)}
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            >
              <option value="" disabled>
                Choose a child…
              </option>
              {children.map((child) => (
                <option key={child.profile.id} value={child.profile.id}>
                  {child.profile.name}
                  {child.profile.grade ? ` (Grade ${child.profile.grade})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <form
          onSubmit={handleAddChild}
          style={{ minWidth: "240px", flex: "1 1 0" }}
        >
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginBottom: "0.25rem",
            }}
          >
            Add child
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <input
              type="text"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="Child's name"
              style={{
                flex: "2 1 160px",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            />
            <input
              type="text"
              value={newChildGrade}
              onChange={(e) => setNewChildGrade(e.target.value)}
              placeholder="Grade (optional)"
              style={{
                flex: "1 1 80px",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "#2563eb",
                color: "white",
                fontSize: "0.85rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Add / Switch
            </button>
          </div>
        </form>
      </div>

      {/* New / Edit Incident Form */}
      <form
        onSubmit={handleSubmitIncident}
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          opacity: activeChild ? 1 : 0.6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              margin: 0,
            }}
          >
            {editingIncidentId ? "Edit Incident" : "Log a New Incident"}
          </h3>
          {editingIncidentId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                padding: "0.25rem 0.6rem",
                borderRadius: "999px",
                border: "1px solid #9ca3af",
                backgroundColor: "#ffffff",
                color: "#4b5563",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Cancel editing
            </button>
          )}
        </div>

        {!activeChild && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "#b91c1c",
              marginBottom: "0.5rem",
            }}
          >
            Please add or select a child above before logging incidents.
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.15rem",
              }}
            >
              Reporter name (optional)
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.15rem",
              }}
            >
              Reporter role
            </label>
            <select
              value={reporterRole}
              onChange={(e) =>
                setReporterRole(e.target.value as ReporterRoleOption)
              }
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            >
              {reporterRoleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.15rem",
              }}
            >
              Behavior type
            </label>
            <select
              value={behaviorType}
              onChange={(e) => setBehaviorType(e.target.value as BehaviorType)}
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            >
              {Object.entries(BehaviorTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.15rem",
              }}
            >
              Setting
            </label>
            <select
              value={setting}
              onChange={(e) => setSetting(e.target.value as SettingType)}
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            >
              {Object.entries(SettingLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.15rem",
              }}
            >
              Severity (1 = mild, 5 = severe)
            </label>
            <select
              value={severity}
              onChange={(e) =>
                setSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
              }
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Incident Date/Time */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginBottom: "0.15rem",
              }}
            >
              When did this happen? (optional)
            </label>
            <input
              type="datetime-local"
              value={incidentDateTime}
              onChange={(e) => setIncidentDateTime(e.target.value)}
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem",
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
              }}
            />
            <p
              style={{
                marginTop: "0.1rem",
                fontSize: "0.7rem",
                color: "#6b7280",
              }}
            >
              Leave blank to use the current date and time.
            </p>
          </div>
        </div>

        {/* Share with school controls */}
        <div
          style={{
            marginBottom: "0.75rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px dashed #d1d5db",
            backgroundColor: "#fefce8",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            <input
              type="checkbox"
              checked={shareWithSchool}
              onChange={(e) => setShareWithSchool(e.target.checked)}
            />
            Share this incident with the school?
          </label>
          <p
            style={{
              marginTop: "0.2rem",
              marginBottom: shareWithSchool ? "0.35rem" : 0,
              fontSize: "0.75rem",
              color: "#6b7280",
            }}
          >
            When sharing is enabled, you can choose which school roles may view
            this entry. You can still keep some incidents private to home.
          </p>

          {shareWithSchool && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              {schoolViewerRoleOptions.map((opt) => {
                const checked = shareRoles.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleShareRole(opt.value)}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginBottom: "0.15rem",
            }}
          >
            Location / context (optional)
          </label>
          <input
            type="text"
            value={locationNote}
            onChange={(e) => setLocationNote(e.target.value)}
            placeholder="e.g., recess, math class, grocery store, bedtime"
            style={{
              width: "100%",
              padding: "0.35rem 0.5rem",
              fontSize: "0.85rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginBottom: "0.25rem",
            }}
          >
            What seemed to trigger this? (tap all that fit)
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.4rem",
            }}
          >
            {(Object.keys(TriggerLabels) as TriggerTag[]).map((tag) => {
              const active = triggers.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTrigger(tag)}
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "999px",
                    border: active ? "none" : "1px solid #d1d5db",
                    backgroundColor: active ? "#4f46e5" : "white",
                    color: active ? "white" : "#111827",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {TriggerLabels[tag]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginBottom: "0.15rem",
            }}
          >
            Brief description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What happened, in your own words?"
            style={{
              width: "100%",
              padding: "0.35rem 0.5rem",
              fontSize: "0.85rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginBottom: "0.15rem",
            }}
          >
            What helped, even a little? (optional)
          </label>
          <textarea
            value={whatHelped}
            onChange={(e) => setWhatHelped(e.target.value)}
            rows={2}
            placeholder="e.g., quiet space, headphones, clear instructions, break"
            style={{
              width: "100%",
              padding: "0.35rem 0.5rem",
              fontSize: "0.85rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              resize: "vertical",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!activeChild}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            backgroundColor: activeChild ? "#4f46e5" : "#9ca3af",
            color: "white",
            fontSize: "0.9rem",
            cursor: activeChild ? "pointer" : "not-allowed",
          }}
        >
          {editingIncidentId
            ? "Save Changes"
            : "Save Incident & View Suggestions"}
        </button>
      </form>

      {/* Incident List + Suggestions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            filteredIncidents.length > 0
              ? "minmax(0, 2fr) minmax(0, 3fr)"
              : "1fr",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              marginBottom: "0.5rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.95rem",
                marginBottom: 0,
              }}
            >
              Recent Incidents{" "}
              {activeChild ? `for ${activeChild.profile.name}` : ""}
            </h3>

            {/* Counts */}
            <div
              style={{
                fontSize: "0.75rem",
                color: "#4b5563",
              }}
            >
              Showing <strong>{filteredCount}</strong> of{" "}
              <strong>{totalCount}</strong> incidents. Selected:{" "}
              <strong>{selectedCount}</strong>.
            </div>

            {/* Filters row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.35rem",
                fontSize: "0.75rem",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 500 }}>Filters:</span>

              <select
                value={behaviorFilter}
                onChange={(e) =>
                  setBehaviorFilter(
                    e.target.value === "ALL"
                      ? "ALL"
                      : (e.target.value as BehaviorType)
                  )
                }
                style={{
                  padding: "0.2rem 0.35rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="ALL">All behaviors</option>
                {Object.entries(BehaviorTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={settingFilter}
                onChange={(e) =>
                  setSettingFilter(
                    e.target.value === "ALL"
                      ? "ALL"
                      : (e.target.value as SettingType)
                  )
                }
                style={{
                  padding: "0.2rem 0.35rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="ALL">All settings</option>
                {Object.entries(SettingLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(
                    e.target.value as "" | "1" | "2" | "3" | "4" | "5"
                  )
                }
                style={{
                  padding: "0.2rem 0.35rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="">All severities</option>
                <option value="1">Severity 1</option>
                <option value="2">Severity 2</option>
                <option value="3">Severity 3</option>
                <option value="4">Severity 4</option>
                <option value="5">Severity 5</option>
              </select>

              <select
                value={sharedFilter}
                onChange={(e) =>
                  setSharedFilter(
                    e.target.value as "" | "SHARED" | "PRIVATE"
                  )
                }
                style={{
                  padding: "0.2rem 0.35rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="">All (shared + private)</option>
                <option value="SHARED">Shared with school only</option>
                <option value="PRIVATE">Home-only incidents</option>
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: "0.2rem 0.35rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
                placeholder="From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: "0.2rem 0.35rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
                placeholder="To"
              />

              <button
                type="button"
                onClick={() => {
                  setBehaviorFilter("ALL");
                  setSettingFilter("ALL");
                  setSeverityFilter("");
                  setSharedFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
                style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: "999px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Clear filters
              </button>
            </div>

            {/* Select all visible */}
            {filteredIncidents.length > 0 && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.75rem",
                  marginTop: "0.15rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAllVisible}
                />
                Select all incidents currently shown
              </label>
            )}
          </div>

          {!activeChild ? (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
              }}
            >
              Select a child above to view incident history.
            </p>
          ) : filteredIncidents.length === 0 ? (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
              }}
            >
              No incidents match the current filters for{" "}
              {activeChild.profile.name}. Try adjusting filters or logging a new
              incident.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {filteredIncidents.map((incident) => {
                const dtSource =
                  incident.incidentOccurredAt ||
                  incident.reportedAt ||
                  incident.timestamp;
                const dt = dtSource ? new Date(dtSource) : null;

                const label =
                  dt && !Number.isNaN(dt.getTime())
                    ? `${dt.toLocaleDateString()} ${dt.toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}`
                    : "—";

                const isSelectedRow = incident.id === selectedIncidentId;
                const isShared = !!incident.sharedWithSchool;
                const isChecked = selectedIncidentIds.includes(incident.id);

                return (
                  <li key={incident.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedIncidentId(incident.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.5rem 0.6rem",
                        borderRadius: "0.5rem",
                        border: isSelectedRow
                          ? "1px solid #4f46e5"
                          : "1px solid #e5e7eb",
                        backgroundColor: isSelectedRow ? "#eef2ff" : "white",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                        }}
                      >
                        {/* Checkbox for selection */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleIncidentSelected(incident.id);
                          }}
                          style={{ marginTop: "0.2rem" }}
                        />

                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.15rem",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 500,
                              }}
                            >
                              {BehaviorTypeLabels[incident.behaviorType]}
                            </span>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                              }}
                            >
                              {label}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#4b5563",
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span>{SettingLabels[incident.setting]}</span>
                            {incident.locationNote && (
                              <span>· {incident.locationNote}</span>
                            )}
                            <span>· Severity: {incident.severity}</span>

                            {isShared && (
                              <span
                                style={{
                                  padding: "0.05rem 0.4rem",
                                  borderRadius: "999px",
                                  backgroundColor: "#ecfdf5",
                                  border: "1px solid #bbf7d0",
                                  fontSize: "0.7rem",
                                  color: "#166534",
                                }}
                              >
                                Shared with school
                              </span>
                            )}

                            {/* Read-only discipline summary badge */}
                            {incident.disciplinaryActionType &&
                              incident.disciplinaryActionType !== "NONE" && (
                                <span
                                  title={getDisciplineTooltip(incident)}
                                  style={{
                                    padding: "0.05rem 0.4rem",
                                    borderRadius: "999px",
                                    backgroundColor: "#fee2e2",
                                    border: "1px solid #fecaca",
                                    fontSize: "0.7rem",
                                    color: "#b91c1c",
                                  }}
                                >
                                  Discipline:{" "}
                                  {(() => {
                                    switch (incident.disciplinaryActionType) {
                                      case "LOSS_OF_PRIVILEGE":
                                        return "Loss of privilege";
                                      case "PARENT_CONTACT":
                                        return "Parent contacted";
                                      case "LUNCH_DETENTION":
                                        return "Lunch detention";
                                      case "AFTER_SCHOOL_DETENTION":
                                        return "After-school detention";
                                      case "IN_SCHOOL_SUSPENSION":
                                        return "In-school suspension";
                                      case "OUT_OF_SCHOOL_SUSPENSION":
                                        return "Out-of-school suspension";
                                      case "EXPULSION":
                                        return "Expulsion / referral";
                                      case "RESTORATIVE_CONFERENCE":
                                        return "Restorative conference";
                                      case "SAFETY_PLAN":
                                        return "Safety plan";
                                      case "OTHER":
                                        return "Other action";
                                      default:
                                        return "Recorded";
                                    }
                                  })()}
                                  {incident.disciplinaryDecidedByRole &&
                                    incident.disciplinaryDecidedByRole !==
                                      "OTHER" && (
                                    <>
                                      {" ("}
                                      {
                                        DisciplinaryDeciderRoleLabels[
                                          incident
                                            .disciplinaryDecidedByRole as DisciplinaryDeciderRole
                                        ]
                                      }
                                      {")"}
                                    </>
                                  )}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedIncident && (
          <div>
            <h3
              style={{
                fontSize: "0.95rem",
                marginBottom: "0.5rem",
              }}
            >
              Incident Details & Suggested Supports
            </h3>
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                marginBottom: "0.75rem",
                fontSize: "0.85rem",
              }}
            >
              <p style={{ marginBottom: "0.35rem" }}>
                <strong>Child:</strong>{" "}
                {activeChild ? activeChild.profile.name : "—"}
              </p>
              <p style={{ marginBottom: "0.35rem" }}>
                <strong>Behavior:</strong>{" "}
                {BehaviorTypeLabels[selectedIncident.behaviorType]}
              </p>
              <p style={{ marginBottom: "0.35rem" }}>
                <strong>Setting:</strong>{" "}
                {SettingLabels[selectedIncident.setting]}
                {selectedIncident.locationNote
                  ? ` – ${selectedIncident.locationNote}`
                  : ""}
              </p>
              <p style={{ marginBottom: "0.35rem" }}>
                <strong>Severity:</strong> {selectedIncident.severity} / 5
              </p>
              {selectedIncident.incidentOccurredAt && (
                <p style={{ marginBottom: "0.35rem" }}>
                  <strong>Incident time:</strong>{" "}
                  {new Date(
                    selectedIncident.incidentOccurredAt
                  ).toLocaleString()}
                </p>
              )}
              <p style={{ marginBottom: "0.35rem" }}>
                <strong>Sharing with school:</strong>{" "}
                {selectedIncident.sharedWithSchool
                  ? selectedIncident.sharedWithRoles &&
                    selectedIncident.sharedWithRoles.length > 0
                    ? `Yes (${selectedIncident.sharedWithRoles.join(", ")})`
                    : "Yes"
                  : "No – home only"}
              </p>
              {(selectedIncident.triggers ?? []).length > 0 && (
                <p style={{ marginBottom: "0.35rem" }}>
                  <strong>Triggers:</strong>{" "}
                  {(selectedIncident.triggers ?? [])
                    .map((t) => TriggerLabels[t])
                    .join(", ")}
                </p>
              )}
              {selectedIncident.description && (
                <p style={{ marginBottom: "0.35rem" }}>
                  <strong>Description:</strong> {selectedIncident.description}
                </p>
              )}
              {selectedIncident.whatHelped && (
                <p style={{ marginBottom: "0.5rem" }}>
                  <strong>What helped:</strong> {selectedIncident.whatHelped}
                </p>
              )}

              {/* Disciplinary Action (school/admin use) */}
              {viewerMode === "SCHOOL" && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px dashed #e5e7eb",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Disciplinary action (school / admin use)
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          marginBottom: "0.15rem",
                        }}
                      >
                        Action type
                      </label>
                      <select
                        value={disciplineType}
                        onChange={(e) =>
                          setDisciplineType(
                            e.target.value as DisciplinaryActionType
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "0.3rem 0.4rem",
                          fontSize: "0.8rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <option value="NONE">
                          None / documented only
                        </option>
                        <option value="LOSS_OF_PRIVILEGE">
                          Loss of privilege
                        </option>
                        <option value="PARENT_CONTACT">
                          Parent contacted
                        </option>
                        <option value="LUNCH_DETENTION">
                          Lunch detention
                        </option>
                        <option value="AFTER_SCHOOL_DETENTION">
                          After-school detention
                        </option>
                        <option value="IN_SCHOOL_SUSPENSION">
                          In-school suspension
                        </option>
                        <option value="OUT_OF_SCHOOL_SUSPENSION">
                          Out-of-school suspension
                        </option>
                        <option value="EXPULSION">
                          Expulsion / expulsion referral
                        </option>
                        <option value="RESTORATIVE_CONFERENCE">
                          Restorative conference
                        </option>
                        <option value="SAFETY_PLAN">
                          Safety plan / risk protocol
                        </option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          marginBottom: "0.15rem",
                        }}
                      >
                        Decided by (name)
                      </label>
                      <input
                        type="text"
                        value={disciplineByName}
                        onChange={(e) => setDisciplineByName(e.target.value)}
                        placeholder="e.g., Principal Jones"
                        style={{
                          width: "100%",
                          padding: "0.3rem 0.4rem",
                          fontSize: "0.8rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          marginBottom: "0.15rem",
                        }}
                      >
                        Role
                      </label>
                      <select
                        value={disciplineByRole}
                        onChange={(e) =>
                          setDisciplineByRole(
                            e.target.value as DisciplinaryDeciderRole
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "0.3rem 0.4rem",
                          fontSize: "0.8rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="PRINCIPAL">Principal</option>
                        <option value="DEAN">Dean</option>
                        <option value="COUNSELOR">Counselor</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          marginBottom: "0.15rem",
                        }}
                      >
                        Decision date/time (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={disciplineDecidedAt}
                        onChange={(e) => setDisciplineDecidedAt(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.3rem 0.4rem",
                          fontSize: "0.8rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "0.5rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        marginBottom: "0.15rem",
                      }}
                    >
                      Notes (optional)
                    </label>
                    <textarea
                      value={disciplineDetails}
                      onChange={(e) => setDisciplineDetails(e.target.value)}
                      rows={2}
                      placeholder="e.g., restorative conversation held, parent agreed to follow-up meeting."
                      style={{
                        width: "100%",
                        padding: "0.3rem 0.4rem",
                        fontSize: "0.8rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDiscipline}
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #16a34a",
                      backgroundColor: "#dcfce7",
                      color: "#166534",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      marginRight: "0.5rem",
                    }}
                  >
                    Save disciplinary action
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      !incidentIsLocked && handleEditIncident(selectedIncident)
                    }
                    disabled={incidentIsLocked}
                    style={{
                      padding: "0.3rem 0.7rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #4b5563",
                      backgroundColor: incidentIsLocked
                        ? "#f3f4f6"
                        : "#ffffff",
                      color: incidentIsLocked ? "#9ca3af" : "#111827",
                      fontSize: "0.8rem",
                      cursor: incidentIsLocked ? "not-allowed" : "pointer",
                      marginTop: "0.4rem",
                    }}
                  >
                    Edit this incident
                  </button>

                  {incidentIsLocked && (
                    <p
                      style={{
                        marginTop: "0.3rem",
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                      }}
                    >
                      This incident is older than {EDIT_LOCK_DAYS} days and the
                      original record is locked from editing. You can still
                      update disciplinary actions.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ecfdf5",
                fontSize: "0.85rem",
              }}
            >
              <h4
                style={{
                  fontSize: "0.9rem",
                  marginBottom: "0.35rem",
                }}
              >
                Suggested Supports (Prototype)
              </h4>
              {suggestions.length === 0 ? (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#6b7280",
                  }}
                >
                  No specific suggestions generated yet. Try tagging one or more
                  likely triggers (sensory, transitions, social demand, etc.)
                  above.
                </p>
              ) : (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.1rem",
                  }}
                >
                  {suggestions.map((text, idx) => (
                    <li key={idx} style={{ marginBottom: "0.25rem" }}>
                      {text}
                    </li>
                  ))}
                </ul>
              )}
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                These suggestions are general supports, not a substitute for a
                full clinical plan. Counselors can add tailored strategies based
                on this pattern over time.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Export & Print controls */}




      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          fontSize: "0.8rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div>
            <strong>Export tools</strong>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Use filters + checkboxes above to decide which incidents to include
            in the printer-friendly log.
          </div>
        </div>

        
        
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleDownloadPdf}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#10b981",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Download Incident Report (PDF)
          </button>

          <button
            type="button"
            onClick={handleOpenPrintView}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Open printer-friendly view
          </button>
        </div>
        
        {/*}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >



          <button
            type="button"
            onClick={handleDownloadPdf}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#10b981",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Download Incident Report (PDF)
          </button>

          <button
            type="button"
            onClick={handleOpenPrintView}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Open printer-friendly view
          </button>
        </div>

        */}

        {/*
        
        <button
            type="button"
            onClick={handleOpenPrintView}
            style={{
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Open printer-friendly view
          </button>
        </div> */}




      </div>
    </div>
  );
};

// BehaviorLog restored - working version with filters & print view
