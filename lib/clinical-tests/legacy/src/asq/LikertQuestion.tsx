"use client";
// src/asq/LikertQuestion.tsx
import React from "react";

// Keep `null` to represent "unanswered" internally,
// but we do NOT render a "(No response)" option anymore.
export type LikertValue = 0 | 1 | 2 | 3 | 4 | null;

interface LikertQuestionProps {
  id: string | number;
  text: string;
  value: LikertValue;
  onChange: (id: string | number, value: LikertValue) => void;
}

const labels: Array<{ value: Exclude<LikertValue, null>; label: string }> = [
  { value: 0, label: "0 = Never" },
  { value: 1, label: "1 = Rarely" },
  { value: 2, label: "2 = Sometimes" },
  { value: 3, label: "3 = Often" },
  { value: 4, label: "4 = Almost always" },
];

export const LikertQuestion: React.FC<LikertQuestionProps> = ({
  id,
  text,
  value,
  onChange,
}) => {
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        marginBottom: "0.75rem",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#f9fafb",
      }}
    >
      <div style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>
        <strong>Item {id}.</strong> {text}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {labels.map((opt) => (
          <label
            key={opt.value}
            style={{ fontSize: "0.85rem", cursor: "pointer" }}
          >
            <input
              type="radio"
              name={`item-${String(id)}`}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(id, opt.value)}
              style={{ marginRight: "0.25rem" }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
};
