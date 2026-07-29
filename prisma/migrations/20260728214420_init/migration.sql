-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'lecturer',
    "staffId" TEXT,
    "departmentId" INTEGER,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'lecture_hall',

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT NOT NULL DEFAULT 'first',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creditUnits" INTEGER NOT NULL DEFAULT 2,
    "departmentId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "expectedStudents" INTEGER NOT NULL DEFAULT 50,
    "semester" TEXT NOT NULL DEFAULT 'first',
    "sessionId" INTEGER NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "lecturerId" INTEGER NOT NULL,
    "venueId" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "generationRunId" INTEGER,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "declineReason" TEXT,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerAvailability" (
    "id" SERIAL NOT NULL,
    "lecturerId" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "preference" TEXT NOT NULL DEFAULT 'preferred',

    CONSTRAINT "LecturerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "runById" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "randomSeed" INTEGER,
    "coursesTotal" INTEGER NOT NULL DEFAULT 0,
    "coursesPlaced" INTEGER NOT NULL DEFAULT 0,
    "coursesUnplaced" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runtimeMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "unplacedReport" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "description" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "dayStartTime" TEXT NOT NULL DEFAULT '08:00',
    "dayEndTime" TEXT NOT NULL DEFAULT '18:00',
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "workingDays" TEXT NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]',
    "maxWeeklyHoursPerLecturer" INTEGER NOT NULL DEFAULT 18,
    "allowOverrides" BOOLEAN NOT NULL DEFAULT true,
    "lunchStart" TEXT NOT NULL DEFAULT '13:00',
    "lunchEnd" TEXT NOT NULL DEFAULT '14:00',
    "maxConsecutiveHours" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Programme_departmentId_idx" ON "Programme"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_name_key" ON "Venue"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_name_semester_key" ON "Session"("name", "semester");

-- CreateIndex
CREATE INDEX "Course_departmentId_level_idx" ON "Course"("departmentId", "level");

-- CreateIndex
CREATE INDEX "Course_sessionId_idx" ON "Course"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_sessionId_key" ON "Course"("code", "sessionId");

-- CreateIndex
CREATE INDEX "Allocation_sessionId_dayOfWeek_startTime_endTime_venueId_idx" ON "Allocation"("sessionId", "dayOfWeek", "startTime", "endTime", "venueId");

-- CreateIndex
CREATE INDEX "Allocation_lecturerId_dayOfWeek_idx" ON "Allocation"("lecturerId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Allocation_status_idx" ON "Allocation"("status");

-- CreateIndex
CREATE INDEX "Allocation_generationRunId_idx" ON "Allocation"("generationRunId");

-- CreateIndex
CREATE INDEX "LecturerAvailability_lecturerId_dayOfWeek_idx" ON "LecturerAvailability"("lecturerId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "GenerationRun_sessionId_idx" ON "GenerationRun"("sessionId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerAvailability" ADD CONSTRAINT "LecturerAvailability_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_runById_fkey" FOREIGN KEY ("runById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
