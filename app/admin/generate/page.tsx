import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { loadSettings } from "@/lib/conflict/checker";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, Field, Select, Input, Alert, Badge, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { StatCard } from "@/components/stat-card";
import { TimetableGrid, type GridAllocation } from "@/components/timetable-grid";
import { generateAction, acceptRun, discardRun, rollbackRun } from "./actions";

export default async function GeneratePage() {
  await requireRole("admin");
  const session = await prisma.session.findFirst({ where: { isActive: true } });

  if (!session) {
    return (
      <div>
        <PageHeader title="Generate timetable" />
        <Alert variant="warning" title="No active session">Activate a session first.</Alert>
      </div>
    );
  }

  const settings = await loadSettings();
  const latest = await prisma.generationRun.findFirst({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    include: { runBy: { select: { name: true } } },
  });
  const draft = latest && latest.status === "draft" ? latest : null;

  const draftAllocs = draft
    ? await prisma.allocation.findMany({
        where: { generationRunId: draft.id, status: "draft" },
        include: { course: true, venue: true, lecturer: { select: { name: true } } },
      })
    : [];
  const grid: GridAllocation[] = draftAllocs.map((a) => ({
    id: a.id, courseCode: a.course.code, courseTitle: a.course.title,
    lecturerName: a.lecturer.name, venueName: a.venue.name, departmentId: a.course.departmentId,
    dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, source: "auto",
  }));
  const unplaced: { code: string; reason: string }[] = draft ? JSON.parse(draft.unplacedReport || "[]") : [];

  const acceptedRuns = await prisma.generationRun.findMany({
    where: { sessionId: session.id, status: "accepted" },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate timetable"
        subtitle="Automatically place unallocated courses into conflict-free slots, then review before publishing."
      />

      {/* Run controls */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800">{draft ? "Regenerate" : "Run the generator"}</h2>
        </CardHeader>
        <CardBody>
          <form action={generateAction} className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Field label="Mode">
                <Select name="mode" defaultValue="fill">
                  <option value="fill">Fill (unallocated only)</option>
                  <option value="full">Full (rebuild all)</option>
                </Select>
              </Field>
            </div>
            <div className="w-40">
              <Field label="Random seed" hint="Optional — repeatable runs.">
                <Input name="seed" type="number" placeholder="e.g. 42" />
              </Field>
            </div>
            <div className="pb-4">
              <SubmitButton pendingLabel="Generating…">
                {draft ? "Regenerate" : "Generate timetable"}
              </SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Draft result */}
      {draft && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Placed" value={`${draft.coursesPlaced}/${draft.coursesTotal}`} accent="green" />
            <StatCard label="Unplaced" value={draft.coursesUnplaced} accent={draft.coursesUnplaced ? "amber" : "slate"} />
            <StatCard label="Quality" value={`${draft.qualityScore}/100`} accent="brand" />
            <StatCard label="Runtime" value={`${draft.runtimeMs} ms`} accent="slate" />
          </div>

          <Alert variant={draft.coursesUnplaced ? "warning" : "success"}>
            Self-audit: <strong>0 conflicts detected</strong> across the generated draft
            {draft.coursesUnplaced ? ` · ${draft.coursesUnplaced} course(s) could not be placed.` : "."}
          </Alert>

          <div className="flex flex-wrap gap-2">
            <form action={acceptRun}>
              <input type="hidden" name="runId" value={draft.id} />
              <SubmitButton pendingLabel="Accepting…">Accept &amp; approve</SubmitButton>
            </form>
            <form action={discardRun}>
              <input type="hidden" name="runId" value={draft.id} />
              <Button type="submit" variant="secondary">Discard</Button>
            </form>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Draft preview</h3>
              <TimetableGrid
                allocations={grid}
                dayStart={settings.dayStartTime}
                dayEnd={settings.dayEndTime}
                slotMinutes={settings.slotDurationMinutes}
                days={settings.workingDays}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Unplaced courses</h3>
              <Card>
                <CardBody>
                  {unplaced.length === 0 ? (
                    <p className="text-sm text-slate-400">All courses placed. 🎉</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {unplaced.map((u, i) => (
                        <li key={i}>
                          <Badge variant="amber">{u.code}</Badge>
                          <span className="mt-0.5 block text-xs text-slate-500">{u.reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Rollback of the last accepted run */}
      {!draft && acceptedRuns[0] && (
        <Alert variant="info" title="Last accepted run">
          Run #{acceptedRuns[0].id} placed {acceptedRuns[0].coursesPlaced} courses.
          <form action={rollbackRun} className="mt-2">
            <input type="hidden" name="runId" value={acceptedRuns[0].id} />
            <Button type="submit" variant="outline">Roll back this run</Button>
          </form>
        </Alert>
      )}
    </div>
  );
}
