import { describe, expect, it } from "vitest";
import { weeklyInsights } from "../app/content/weekly-insights";
import { renderInsightEmail } from "../app/content/insight-email";
import { serviceDetails, specialtyDetails } from "../app/content/clinical-detail";

describe("clinical education library", () => {
  it("contains 52 unique, complete editorial editions", () => {
    expect(weeklyInsights).toHaveLength(52);
    expect(new Set(weeklyInsights.map(item => item.slug)).size).toBe(52);
    weeklyInsights.forEach((item,index) => {
      expect(item.week).toBe(index+1);
      expect(item.insight.length).toBeGreaterThan(100);
      expect(item.practice.length).toBeGreaterThan(35);
      expect(item.image).toMatch(/^\/images\//);
    });
  });
  it("provides substantive content for all 18 specialty and service pages", () => {
    expect(Object.keys(specialtyDetails)).toHaveLength(9);
    expect(Object.keys(serviceDetails)).toHaveLength(9);
    Object.values({...specialtyDetails,...serviceDetails}).forEach(detail => {
      expect(detail.recognize.length).toBeGreaterThan(100);
      expect(detail.approach.length).toBeGreaterThan(100);
      expect(detail.questions).toHaveLength(3);
    });
  });
  it("renders HTML exports with a required unsubscribe placeholder, never subscriber data", () => {
    const html=renderInsightEmail(weeklyInsights[0]);
    expect(html).toContain("{{UNSUBSCRIBE_URL}}");
    expect(html).toContain("https://indiancreekpsych.com/images/");
    expect(html).toContain("not individualized treatment advice");
  });
});
