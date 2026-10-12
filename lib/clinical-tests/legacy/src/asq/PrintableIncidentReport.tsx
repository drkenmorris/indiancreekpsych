"use client";
import type { BehaviorIncident } from "./behavior";
import type { ChildData } from "./storage";
function safe(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
/** Browser-native Print / Save as PDF report. No external PDF service and no upload. */
export async function downloadIncidentReportPdf(child: ChildData["profile"], incidents: BehaviorIncident[]) {
  const pop = window.open("", "_blank");
  if (!pop) {
    window.alert("Allow pop-ups for this site to print or save the incident report as PDF.");
    return;
  }
  pop.opener = null;
  const rows = incidents.map((incident, idx) =>
    "<section><h2>Incident " + (idx + 1) + "</h2><pre>" +
    safe(JSON.stringify(incident, null, 2)) + "</pre></section>"
  ).join("");
  pop.document.open();
  pop.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Incident Report</title><style>body{font-family:Arial,sans-serif;margin:32px}pre{white-space:pre-wrap;overflow-wrap:anywhere}section{break-inside:avoid;border-top:1px solid #ddd;padding:12px 0}@media print{button{display:none}}</style></head><body><h1>Behavior Incident Report</h1><p>Student: ' + safe(child.name) + '</p><p>Incident count: ' + incidents.length + '</p><button onclick="window.print()">Print / Save as PDF</button>' + rows + '</body></html>');
  pop.document.close();
}
