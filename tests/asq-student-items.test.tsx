// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelfForm } from "../lib/clinical-tests/legacy/src/asq/SelfForm";
import { AUTISM_ITEMS_SELF } from "../lib/clinical-tests/legacy/src/assessments/autism/items/autismItemsSelf";
import { clinicalSessionStore } from "../lib/clinical-tests/clinicalSessionStore";

beforeEach(() => clinicalSessionStore.clear());
afterEach(() => { cleanup(); clinicalSessionStore.clear(); });

test("ASQ student bank contains 179 distinct, nonblank numbered questions", () => {
  expect(AUTISM_ITEMS_SELF).toHaveLength(179);
  expect(new Set(AUTISM_ITEMS_SELF.map(item => item.id)).size).toBe(179);
  for (let i = 0; i < AUTISM_ITEMS_SELF.length; i++) {
    const item = AUTISM_ITEMS_SELF[i];
    expect(item.id).toBe("S" + String(i + 1).padStart(3, "0"));
    expect((item.text ?? "").trim().length).toBeGreaterThan(0);
  }
});

test("ASQ student questionnaire actually renders all 179 prompts and answer choices", () => {
  const { container } = render(<SelfForm />);
  expect(screen.getByText("Answered 0 of 179 items.")).toBeTruthy();
  const output = container.textContent ?? "";
  for (const item of AUTISM_ITEMS_SELF) {
    expect(output).toContain(item.text);
  }
  expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(179 * 5);
  const answer = container.querySelector('input[name="item-S001"][value="3"]');
  expect(answer).not.toBeNull();
  fireEvent.click(answer as HTMLInputElement);
  expect(screen.getByText("Answered 1 of 179 items.")).toBeTruthy();
});
