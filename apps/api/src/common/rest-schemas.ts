import { nicknameSchema, modeSchema } from '@duoquest/shared-types';
import { z } from 'zod';

// Shared by runtime validation and OpenAPI request documentation.
export const guestRequestSchema = z.object({ nickname: nicknameSchema }).strict();
export const equipRequestSchema = z.object({ itemId: z.string().min(1).max(100) }).strict();
export const purchaseRequestSchema = equipRequestSchema
  .extend({ requestId: z.string().uuid() })
  .strict();

export const guestResponseSchema = z.object({
  playerId: z.string().uuid(),
  nickname: z.string(),
  token: z.string(),
});
export const profileResponseSchema = z
  .object({
    id: z.string().uuid(),
    nickname: z.string(),
    xp: z.number().int(),
    wallet: z.object({ balance: z.number().int() }).nullable(),
  })
  .nullable();
const matchResultSchema = z.object({
  sessionId: z.string().uuid(),
  mode: modeSchema,
  scores: z.record(z.number()),
  winnerIds: z.array(z.string().uuid()),
  outcome: z.enum(['COMPLETED', 'FAILED', 'DRAW']),
  correctCounts: z.record(z.number()),
});
export const historyResponseSchema = z.array(
  z.object({
    score: z.number().int(),
    session: z.object({
      id: z.string().uuid(),
      mode: modeSchema,
      finishedAt: z.string().datetime().nullable(),
      result: z.object({ payload: matchResultSchema }).nullable(),
    }),
  }),
);
export const packSummarySchema = z.object({
  id: z.string().uuid(),
  packId: z.string(),
  title: z.string(),
  trusted: z.boolean(),
  questionCount: z.number().int(),
});
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  slot: z.string().nullable(),
  price: z.number().int(),
  gameId: z.string().nullable(),
  metadata: z.unknown(),
});
export const loadoutSchema = z.object({
  playerId: z.string().uuid(),
  slot: z.string(),
  itemId: z.string(),
});
export const inventoryResponseSchema = z.object({
  items: z.array(
    z.object({
      playerId: z.string().uuid(),
      itemId: z.string(),
      quantity: z.number().int(),
      item: itemSchema,
    }),
  ),
  loadout: z.array(loadoutSchema),
});
export const purchaseResponseSchema = z.object({ purchased: z.literal(true), itemId: z.string() });
