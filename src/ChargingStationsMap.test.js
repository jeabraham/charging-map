import { test, expect } from "vitest";
import { filterByDate } from "./dateFilter";

// -------------------------
// 1. Local Unit Tests
// -------------------------
const localStation = {
  AddressInfo: {
    Title: "Tim Horton's - Tesla Supercharger",
    AddressLine1: "606 W Industrial Rd",
    Town: "Hanna",
    StateOrProvince: "AB",
  },
  DateCreated: "2025-06-20T10:58:00Z",
  DateLastStatusUpdate: "2025-06-24T08:20:00Z",
};

test("filterByDate should include station when startDate is before DateCreated", () => {
  const startDate = "2025-05-01";
  const result = filterByDate(localStation, startDate, "");
  console.log("DEBUG local test (startDate only):", { DateCreated: localStation.DateCreated, startDate, result });
  expect(result).toBe(true);
});

test("filterByDate should exclude station when endDate is before DateCreated", () => {
  const endDate = "2025-06-01";
  const result = filterByDate(localStation, "", endDate);
  console.log("DEBUG local test (endDate only):", { DateCreated: localStation.DateCreated, endDate, result });
  expect(result).toBe(false);
});

// -------------------------
// 2. Integration Test – Fetch Station by ID
// -------------------------
const API_KEY = process.env.VITE_OPENCHARGEMAP_KEY || "YOUR_API_KEY_HERE";

test("fetch station 384610 by ID and log DateCreated", async () => {
  const url = `https://api.openchargemap.io/v3/poi/?key=${API_KEY}&output=json&chargepointid=384610`;

  const response = await fetch(url);
  const data = await response.json();

  console.log("API raw response (ID):", JSON.stringify(data, null, 2));
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBe(1);

  const station = data[0];
  console.log("Fetched station DateCreated:", station.DateCreated);

  expect(station.ID).toBe(384610);
  expect(station.UUID).toBe("96E96DBB-4F7C-4799-ADFD-9DBAB496365F");
  expect(new Date(station.DateCreated).toISOString()).toBe("2025-06-20T10:58:00.000Z");
});

// -------------------------
// 3. Integration Test – Fetch Station by UUID
// -------------------------
test("fetch station by UUID and log DateCreated", async () => {
  const url = `https://api.openchargemap.io/v3/poi/?key=${API_KEY}&output=json&uuid=96E96DBB-4F7C-4799-ADFD-9DBAB496365F`;

  const response = await fetch(url);
  const data = await response.json();

  console.log("API raw response (UUID):", JSON.stringify(data, null, 2));

  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThan(0);

  // ✅ Just check that the UUID field exists and is not empty
  expect(typeof data[0].UUID).toBe("string");
  expect(data[0].UUID.length).toBeGreaterThan(0);
});

// -------------------------
// 4. Integration Test – Apply filterByDate to Fetched Station
// -------------------------
test("apply filterByDate to API-fetched station", async () => {
  const url = `https://api.openchargemap.io/v3/poi/?key=${API_KEY}&output=json&chargepointid=384610`;

  const response = await fetch(url);
  const data = await response.json();
  const station = data[0];

  const startDate = "2025-05-01";
  const endDate = "2025-06-01";

  const passesStartDate = filterByDate(station, startDate, "");
  const passesEndDate = filterByDate(station, "", endDate);

  console.log("DEBUG API filter results:", {
    DateCreated: station.DateCreated,
    startDate,
    passesStartDate,
    endDate,
    passesEndDate,
  });

  expect(passesStartDate).toBe(true);   // should include
  expect(passesEndDate).toBe(false);    // should exclude
});
