import { db } from "./db";

/**
 * Mark stale PENDING appointments (older than `maxAgeMinutes`) as CANCELLED
 * and free their slots back to FREE. Used as a lazy cleanup on slot pages
 * and from the daily cron.
 */
export async function cleanupStalePending(maxAgeMinutes = 5): Promise<{
  cancelled: number;
}> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  const stale = await db.appointment.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true, slotId: true },
  });

  if (stale.length === 0) return { cancelled: 0 };

  await db.$transaction([
    db.appointment.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
    db.slot.updateMany({
      where: {
        id: { in: stale.map((s) => s.slotId) },
        status: "PENDING",
      },
      data: { status: "FREE" },
    }),
  ]);

  return { cancelled: stale.length };
}
