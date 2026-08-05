// Central definitions for the enum-like String columns (SQLite has no enums).
// Import these everywhere instead of hard-coding literals.

export const ROLES = ["admin", "hod", "lecturer", "student"] as const;
export type Role = (typeof ROLES)[number];

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Day = (typeof DAYS)[number];

export const DAY_LABELS: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

export const ALLOCATION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "declined",
  "cancelled",
] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

// Statuses that occupy a slot and therefore participate in conflict checks.
export const BLOCKING_STATUSES = ["approved", "pending"] as const;

export const ALLOCATION_SOURCES = ["manual", "auto"] as const;
export type AllocationSource = (typeof ALLOCATION_SOURCES)[number];

export const SEMESTERS = ["first", "second"] as const;
export type Semester = (typeof SEMESTERS)[number];

export const VENUE_TYPES = ["lecture_hall", "lab", "studio"] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export const LEVELS = [100, 200, 300, 400, 500] as const;
export type Level = (typeof LEVELS)[number];

export const AVAILABILITY_PREFERENCES = ["unavailable", "preferred"] as const;
export type AvailabilityPreference = (typeof AVAILABILITY_PREFERENCES)[number];

export const GENERATION_MODES = ["fill", "full"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GENERATION_STATUSES = [
  "draft",
  "accepted",
  "discarded",
  "rolled_back",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];
