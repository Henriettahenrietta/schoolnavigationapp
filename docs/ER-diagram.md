# Course Allocation System — Entity-Relationship Diagram

Database: **PostgreSQL** (Neon, via Prisma). Times are stored as `HH:MM` strings; enum-like
columns are `String` with allowed values enforced by the Zod layer (`lib/validation.ts`).

```mermaid
erDiagram
    DEPARTMENT ||--o{ USER : "employs"
    DEPARTMENT ||--o{ PROGRAMME : "offers"
    DEPARTMENT ||--o{ COURSE : "owns"

    SESSION ||--o{ COURSE : "contains"
    SESSION ||--o{ ALLOCATION : "scopes"
    SESSION ||--o{ GENERATION_RUN : "has"

    USER ||--o{ ALLOCATION : "teaches (lecturer)"
    USER ||--o{ ALLOCATION : "approves (admin)"
    USER ||--o{ LECTURER_AVAILABILITY : "declares"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_LOG : "acts"
    USER ||--o{ GENERATION_RUN : "runs"

    COURSE ||--o{ ALLOCATION : "is scheduled as"
    VENUE ||--o{ ALLOCATION : "hosts"
    GENERATION_RUN ||--o{ ALLOCATION : "produces (draft)"

    DEPARTMENT {
        int id PK
        string name
        string code UK
    }
    PROGRAMME {
        int id PK
        int departmentId FK
        string name
        int level
    }
    VENUE {
        int id PK
        string name UK
        string building
        int capacity
        string type
    }
    SESSION {
        int id PK
        string name
        string semester
        bool isActive
        datetime startDate
        datetime endDate
    }
    USER {
        int id PK
        string name
        string email UK
        string passwordHash
        string role
        string staffId
        int departmentId FK
        bool isActive
    }
    COURSE {
        int id PK
        string code
        string title
        int creditUnits
        int departmentId FK
        int level
        int expectedStudents
        string semester
        int sessionId FK
    }
    ALLOCATION {
        int id PK
        int sessionId FK
        int courseId FK
        int lecturerId FK
        int venueId FK
        string dayOfWeek
        string startTime
        string endTime
        string status
        string source
        int generationRunId FK
        bool isLocked
        string declineReason
        int approvedById FK
        datetime approvedAt
        bool isOverride
        string overrideReason
    }
    LECTURER_AVAILABILITY {
        int id PK
        int lecturerId FK
        string dayOfWeek
        string startTime
        string endTime
        string preference
    }
    GENERATION_RUN {
        int id PK
        int sessionId FK
        int runById FK
        string mode
        int randomSeed
        int coursesTotal
        int coursesPlaced
        int coursesUnplaced
        float qualityScore
        int runtimeMs
        string status
        string unplacedReport
    }
    NOTIFICATION {
        int id PK
        int userId FK
        string title
        string message
        bool isRead
        string link
    }
    AUDIT_LOG {
        int id PK
        int userId FK
        string action
        string entityType
        int entityId
        string description
        string ip
    }
    SETTING {
        int id PK
        string dayStartTime
        string dayEndTime
        int slotDurationMinutes
        string workingDays
        int maxWeeklyHoursPerLecturer
        bool allowOverrides
    }
```

## Key relationships

- An **Allocation** is the central "timetable row": it ties one *course*, one *lecturer*,
  one *venue* and one *session* to a `dayOfWeek` + `startTime`–`endTime`.
- The **conflict engine** treats allocations with status `approved` or `pending` in the
  active session as "occupying" their slot.
- A **GenerationRun** produces many draft allocations at once; accepting the run promotes
  them to `approved`, discarding/rolling back removes them.

## Use-case list (for the write-up)

**Admin**
1. Manage academic sessions, departments, programmes, venues, courses, lecturers, settings (CRUD).
2. Review pending allocation requests → approve / reject with reason / override with justification.
3. Run the automatic timetable generator (fill or full mode, optional seed).
4. Preview a generated draft, edit slots manually (re-validated), lock slots, accept/discard/roll back.
5. Publish / unpublish a session's timetable.
6. View dashboards, conflict reports and lecturer-workload reports; export to PDF/Excel.
7. View the audit log.

**Lecturer**
8. Register / log in / complete profile / declare availability.
9. Submit an allocation request with live conflict feedback.
10. View own timetable, own weekly workload, request history and decline reasons.
11. Receive in-app notifications on approval / rejection / override.

**Student / Public**
12. Select department + level and view the published timetable (no login), print it.
