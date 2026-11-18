import { test, expect } from "@playwright/test";
import { persianParts, persianToISO } from "../shared/components/persian-date";
test("Persian calendar converts known dates and rejects impossible days", () => {
  expect(persianParts(new Date("2024-03-20T12:00:00Z"))).toEqual({
    year: 1403,
    month: 1,
    day: 1,
  });
  expect(persianParts(new Date("2026-11-09T12:00:00Z"))).toEqual({
    year: 1405,
    month: 8,
    day: 18,
  });
  expect(persianToISO(1405, 8, 18)).toBe("2026-11-09");
  expect(persianToISO(1405, 7, 31)).toBe("");
  expect(persianToISO(1403, 12, 30)).toBe("2025-03-20");
});
test("Persian calendar preserves date across leap-year and year boundaries", () => {
  for (const iso of [
    "1960-01-01",
    "1990-01-01",
    "2000-02-29",
    "2024-02-29",
    "2024-03-19",
    "2024-03-20",
    "2025-03-20",
    "2025-03-21",
    "2026-12-31",
    "2030-01-01",
    "2040-03-20",
  ]) {
    const p = persianParts(new Date(iso + "T12:00:00Z"));
    expect(persianToISO(p.year, p.month, p.day)).toBe(iso);
  }
});
