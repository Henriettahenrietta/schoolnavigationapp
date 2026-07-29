import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Card, Button, Badge } from "@/components/ui";
import { markAllRead } from "./actions";

export default async function NotificationsPage() {
  const user = await requireRole("lecturer");
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up."}
        action={
          unread > 0 ? (
            <form action={markAllRead}>
              <Button variant="secondary">Mark all read</Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No notifications yet.</Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={`p-4 ${n.isRead ? "" : "border-brand-200 bg-brand-50/40"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-medium text-slate-800">
                    {n.title}
                    {!n.isRead && <Badge variant="blue">New</Badge>}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
