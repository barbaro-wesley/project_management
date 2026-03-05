import { z } from "zod";

export const listNotificationsDto = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
});

export type ListNotificationsDto = z.infer<typeof listNotificationsDto>;