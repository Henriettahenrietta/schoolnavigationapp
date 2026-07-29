import { prisma } from "./prisma";

// Create an in-app notification for a user (approvals, rejections, overrides).
export async function notify(params: {
  userId: number;
  title: string;
  message: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
    },
  });
}

export async function unreadCount(userId: number): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
