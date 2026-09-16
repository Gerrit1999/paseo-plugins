import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

const usageAmountSchema = z.object({
  id: z.string(),
  used: z.number(),
  remaining: z.number(),
  limit: z.number(),
  unit: z.literal("usd"),
});

const usageWindowSchema = usageAmountSchema.extend({
  resetsAt: z.string().nullable(),
});

export const localeSchema = z.enum(["en", "zh"]);

const usageStatsSchema = z.object({
  requests: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  cost: z.number(),
  actualCost: z.number(),
});

const modelUsageSchema = usageStatsSchema.extend({
  model: z.string(),
});

export const sub2ApiUsageSchema = z.object({
  sourceLabel: z.string(),
  fetchedAt: z.string(),
  mode: z.enum(["quota_limited", "unrestricted"]),
  status: z.string(),
  isValid: z.boolean(),
  planName: z.string().nullable(),
  expiresAt: z.string().nullable(),
  balance: z.number().nullable(),
  remaining: z.number().nullable(),
  quota: usageAmountSchema.nullable(),
  windows: z.array(usageWindowSchema),
  today: usageStatsSchema.nullable(),
  total: usageStatsSchema.nullable(),
  rpm: z.number().nullable(),
  tpm: z.number().nullable(),
  averageDurationMs: z.number().nullable(),
  modelStats: z.array(modelUsageSchema),
});

export type Sub2ApiUsage = z.infer<typeof sub2ApiUsageSchema>;
export type UsageAmount = z.infer<typeof usageAmountSchema>;
export type UsageStats = z.infer<typeof usageStatsSchema>;
export type Locale = z.infer<typeof localeSchema>;

export const getSub2ApiUsage = defineRpc({
  name: "sub2api.usage.get",
  input: z.object({ locale: localeSchema }),
  output: sub2ApiUsageSchema,
});
