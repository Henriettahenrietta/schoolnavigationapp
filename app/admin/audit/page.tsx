import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import { Badge } from "@/components/ui";

const ACTION_VARIANT: Record<string, "green" | "amber" | "red" | "blue" | "slate"> = {
  create: "green",
  update: "blue",
  delete: "red",
  login: "slate",
  login_failed: "red",
  approve: "green",
  reject: "amber",
  override: "amber",
  generate: "blue",
  publish: "green",
};

export default async function AuditPage() {
  await requireRole("admin");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="The 200 most recent system actions. Every create, update, delete, login, approval and override is recorded."
      />
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>When</TH>
            <TH>User</TH>
            <TH>Action</TH>
            <TH>Entity</TH>
            <TH>Description</TH>
            <TH>IP</TH>
          </TR>
        </THead>
        <TBody>
          {logs.length === 0 ? (
            <EmptyRow colSpan={6}>No activity recorded yet.</EmptyRow>
          ) : (
            logs.map((l) => (
              <TR key={l.id}>
                <TD className="whitespace-nowrap text-xs text-slate-500">
                  {new Date(l.createdAt).toLocaleString()}
                </TD>
                <TD>{l.user?.name ?? "—"}</TD>
                <TD>
                  <Badge variant={ACTION_VARIANT[l.action] ?? "slate"}>{l.action}</Badge>
                </TD>
                <TD className="text-slate-500">
                  {l.entityType}
                  {l.entityId ? ` #${l.entityId}` : ""}
                </TD>
                <TD>{l.description}</TD>
                <TD className="text-xs text-slate-400">{l.ip ?? "—"}</TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
