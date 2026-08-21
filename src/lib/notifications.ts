import { prisma } from "@/lib/db";

export async function notifyUser(input: {
  userId: string;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  if (!input.userId) return;
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });
  } catch {
    // never break the main flow because of a notification failure
  }
}

export function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
