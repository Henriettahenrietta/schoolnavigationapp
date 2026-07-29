import { z } from "zod";
import {
  ROLES,
  DAYS,
  ALLOCATION_STATUSES,
  ALLOCATION_SOURCES,
  SEMESTERS,
  VENUE_TYPES,
  LEVELS,
  AVAILABILITY_PREFERENCES,
  GENERATION_MODES,
} from "./constants";

// Shared Zod schemas. Because SQLite stores enum-like values as plain strings, these
// schemas are the single source of truth that keeps those columns valid.

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM 24-hour format");

export const timeRange = z
  .object({ startTime: hhmm, endTime: hhmm })
  .refine((v) => v.endTime > v.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const lecturerRegisterSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  staffId: z.string().min(1).max(40),
  departmentId: z.coerce.number().int().positive(),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export const departmentSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(12).toUpperCase(),
});

export const programmeSchema = z.object({
  departmentId: z.coerce.number().int().positive(),
  name: z.string().min(2).max(120),
  level: z.coerce.number().refine((n) => (LEVELS as readonly number[]).includes(n), {
    message: "Level must be one of 100, 200, 300, 400, 500",
  }),
});

export const venueSchema = z.object({
  name: z.string().min(1).max(80),
  building: z.string().min(1).max(80),
  capacity: z.coerce.number().int().min(1).max(5000),
  type: z.enum(VENUE_TYPES),
});

export const sessionSchema = z.object({
  name: z.string().min(4).max(20),
  semester: z.enum(SEMESTERS),
  isActive: z.coerce.boolean().optional().default(false),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const courseSchema = z.object({
  code: z.string().min(3).max(12).toUpperCase(),
  title: z.string().min(3).max(160),
  creditUnits: z.coerce.number().int().min(1).max(6),
  departmentId: z.coerce.number().int().positive(),
  level: z.coerce.number().refine((n) => (LEVELS as readonly number[]).includes(n), {
    message: "Level must be one of 100, 200, 300, 400, 500",
  }),
  expectedStudents: z.coerce.number().int().min(1).max(5000),
  semester: z.enum(SEMESTERS),
  sessionId: z.coerce.number().int().positive(),
});

export const availabilitySchema = z
  .object({
    lecturerId: z.coerce.number().int().positive(),
    dayOfWeek: z.enum(DAYS),
    startTime: hhmm,
    endTime: hhmm,
    preference: z.enum(AVAILABILITY_PREFERENCES),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const settingsSchema = z.object({
  dayStartTime: hhmm,
  dayEndTime: hhmm,
  slotDurationMinutes: z.coerce.number().int().min(15).max(240),
  workingDays: z.array(z.enum(DAYS)).min(1),
  maxWeeklyHoursPerLecturer: z.coerce.number().int().min(1).max(60),
  allowOverrides: z.coerce.boolean(),
  lunchStart: hhmm,
  lunchEnd: hhmm,
  maxConsecutiveHours: z.coerce.number().int().min(1).max(12),
});

// The allocation request a lecturer submits (and the generator constructs internally).
export const allocationRequestSchema = z
  .object({
    sessionId: z.coerce.number().int().positive(),
    courseId: z.coerce.number().int().positive(),
    lecturerId: z.coerce.number().int().positive(),
    venueId: z.coerce.number().int().positive(),
    dayOfWeek: z.enum(DAYS),
    startTime: hhmm,
    endTime: hhmm,
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const generateSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  mode: z.enum(GENERATION_MODES).default("fill"),
  randomSeed: z.coerce.number().int().optional(),
});

export type AllocationRequest = z.infer<typeof allocationRequestSchema>;

// Re-export a couple of unions so other modules can lean on the same source values.
export const enums = {
  ROLES,
  DAYS,
  ALLOCATION_STATUSES,
  ALLOCATION_SOURCES,
};
