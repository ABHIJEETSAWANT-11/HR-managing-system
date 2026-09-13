import { Notification } from "../modules/notifications/notification.model";

/**
 * Notification creation helper — called at existing trigger points
 * (interview scheduled, offer approved, portal accept/reject). Fire-and-forget:
 * a notification failure must NEVER fail the primary operation.
 */
export async function notify(input: {
  organizationId: string;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}): Promise<void> {
  try {
    await Notification.create({
      organizationId: input.organizationId,
      ...(input.userId ? { userId: input.userId } : {}),
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    });
  } catch (err) {
    console.error("[notify] failed (non-fatal):", (err as Error).message);
  }
}

/** Org-wide notification (visible to admins/recruiters). */
export async function notifyOrg(input: Omit<Parameters<typeof notify>[0], "userId">): Promise<void> {
  return notify(input);
}
