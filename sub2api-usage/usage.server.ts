import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { z } from "zod";
import type { Locale, Sub2ApiUsage, UsageStats } from "./usage.shared";

const rawStatsSchema = z
  .object({
    requests: z.number().optional(),
    input_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
    cache_creation_tokens: z.number().optional(),
    cache_read_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
    cost: z.number().optional(),
    actual_cost: z.number().optional(),
  })
  .passthrough();

const rawUsageResponseSchema = z
  .object({
    mode: z.enum(["quota_limited", "unrestricted"]),
    isValid: z.boolean(),
    status: z.string().optional(),
    planName: z.string().optional(),
    expires_at: z.string().nullable().optional(),
    balance: z.number().optional(),
    remaining: z.number().optional(),
    quota: z
      .object({
        used: z.number(),
        remaining: z.number().optional(),
        limit: z.number(),
      })
      .optional(),
    rate_limits: z
      .array(
        z.object({
          window: z.string(),
          used: z.number(),
          remaining: z.number().optional(),
          limit: z.number(),
          reset_at: z.string().nullable().optional(),
        }),
      )
      .optional(),
    subscription: z
      .object({
        daily_usage_usd: z.number().optional(),
        weekly_usage_usd: z.number().optional(),
        monthly_usage_usd: z.number().optional(),
        daily_limit_usd: z.number().nullable().optional(),
        weekly_limit_usd: z.number().nullable().optional(),
        monthly_limit_usd: z.number().nullable().optional(),
        expires_at: z.string().nullable().optional(),
      })
      .optional(),
    usage: z
      .object({
        today: rawStatsSchema.optional(),
        total: rawStatsSchema.optional(),
        rpm: z.number().optional(),
        tpm: z.number().optional(),
        average_duration_ms: z.number().optional(),
      })
      .optional(),
    model_stats: z
      .array(rawStatsSchema.extend({ model: z.string().optional() }))
      .optional(),
  })
  .passthrough();

type JsonRecord = Record<string, unknown>;
type RawUsageResponse = z.infer<typeof rawUsageResponseSchema>;

const runtimeProcess = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const connectionCandidates = [
  {
    baseUrlKey: "SUB2API_BASE_URL",
    apiKeyKeys: ["SUB2API_API_KEY", "SUB2API_KEY"],
  },
  {
    baseUrlKey: "ANTHROPIC_BASE_URL",
    apiKeyKeys: ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"],
  },
  {
    baseUrlKey: "OPENAI_BASE_URL",
    apiKeyKeys: ["OPENAI_API_KEY"],
  },
] as const;

interface ServerMessages {
  notConfigured: string;
  invalidBaseUrl: string;
  invalidProtocol: string;
  unauthorized: string;
  notFound: string;
  invalidJson: string;
  unsupportedShape: string;
  timeout: string;
  networkFailed: string;
  httpFailed(status: number): string;
}

const serverMessages: Record<Locale, ServerMessages> = {
  en: {
    notConfigured:
      "Sub2API is not configured. Set SUB2API_BASE_URL and SUB2API_API_KEY in the Paseo daemon environment.",
    invalidBaseUrl: "SUB2API_BASE_URL must be a valid absolute URL.",
    invalidProtocol: "SUB2API_BASE_URL must use HTTP or HTTPS.",
    unauthorized: "The Sub2API API key is invalid or cannot query usage.",
    notFound: "The configured Sub2API server does not expose /v1/usage.",
    invalidJson: "Sub2API /v1/usage returned invalid JSON.",
    unsupportedShape: "Sub2API /v1/usage returned an unsupported response shape.",
    timeout: "Sub2API /v1/usage timed out after 15 seconds.",
    networkFailed: "Unable to reach the configured Sub2API server.",
    httpFailed: (status) => `Sub2API usage request failed with HTTP ${status}.`,
  },
  zh: {
    notConfigured:
      "未配置 Sub2API。请在 Paseo daemon 环境中设置 SUB2API_BASE_URL 和 SUB2API_API_KEY。",
    invalidBaseUrl: "SUB2API_BASE_URL 必须是有效的绝对 URL。",
    invalidProtocol: "SUB2API_BASE_URL 必须使用 HTTP 或 HTTPS。",
    unauthorized: "Sub2API API Key 无效或无权查询用量。",
    notFound: "已配置的 Sub2API 服务未提供 /v1/usage 接口。",
    invalidJson: "Sub2API /v1/usage 返回了无效的 JSON。",
    unsupportedShape: "Sub2API /v1/usage 返回了不支持的响应结构。",
    timeout: "Sub2API /v1/usage 请求在 15 秒后超时。",
    networkFailed: "无法连接到已配置的 Sub2API 服务。",
    httpFailed: (status) => `Sub2API 用量请求失败，HTTP 状态码 ${status}。`,
  },
};

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function readString(record: JsonRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function resolveConnection(messages: ServerMessages) {
  const processEnv = asRecord(runtimeProcess.process?.env);
  for (const candidate of connectionCandidates) {
    const baseUrl = readString(processEnv, [candidate.baseUrlKey]);
    const apiKey = readString(processEnv, candidate.apiKeyKeys);
    if (baseUrl && apiKey) {
      return { baseUrl, apiKey };
    }
  }

  throw new Error(messages.notConfigured);
}

function usageUrl(baseUrl: string, messages: ServerMessages): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(messages.invalidBaseUrl);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(messages.invalidProtocol);
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/v1/usage")) {
    url.pathname = `${path.replace(/\/v1$/, "")}/v1/usage`;
  }
  url.search = "";
  url.hash = "";
  return url;
}

function numberOrZero(value: number | undefined): number {
  return value ?? 0;
}

function normalizeStats(stats: z.infer<typeof rawStatsSchema> | undefined): UsageStats | null {
  if (!stats) return null;
  return {
    requests: numberOrZero(stats.requests),
    inputTokens: numberOrZero(stats.input_tokens),
    outputTokens: numberOrZero(stats.output_tokens),
    cacheCreationTokens: numberOrZero(stats.cache_creation_tokens),
    cacheReadTokens: numberOrZero(stats.cache_read_tokens),
    totalTokens: numberOrZero(stats.total_tokens),
    cost: numberOrZero(stats.cost),
    actualCost: numberOrZero(stats.actual_cost ?? stats.cost),
  };
}

function normalizeResponse(raw: RawUsageResponse, sourceLabel: string): Sub2ApiUsage {
  const mode = raw.mode;
  const windows =
    mode === "quota_limited"
      ? (raw.rate_limits ?? []).map((window) => ({
          id: window.window,
          used: window.used,
          remaining: window.remaining ?? Math.max(0, window.limit - window.used),
          limit: window.limit,
          unit: "usd" as const,
          resetsAt: window.reset_at ?? null,
        }))
      : [
          ["daily", raw.subscription?.daily_usage_usd, raw.subscription?.daily_limit_usd],
          ["weekly", raw.subscription?.weekly_usage_usd, raw.subscription?.weekly_limit_usd],
          ["monthly", raw.subscription?.monthly_usage_usd, raw.subscription?.monthly_limit_usd],
        ].flatMap(([id, used, limit]) =>
          typeof used === "number" && typeof limit === "number" && limit > 0
            ? [
                {
                  id: String(id),
                  used,
                  remaining: Math.max(0, limit - used),
                  limit,
                  unit: "usd" as const,
                  resetsAt: null,
                },
              ]
            : [],
        );

  return {
    sourceLabel,
    fetchedAt: new Date().toISOString(),
    mode,
    status: raw.status ?? (raw.isValid === false ? "unavailable" : "active"),
    isValid: raw.isValid !== false,
    planName: raw.planName ?? null,
    expiresAt: raw.expires_at ?? raw.subscription?.expires_at ?? null,
    balance: raw.balance ?? null,
    remaining: raw.remaining ?? null,
    quota: raw.quota
      ? {
          id: "total",
          used: raw.quota.used,
          remaining: raw.quota.remaining ?? Math.max(0, raw.quota.limit - raw.quota.used),
          limit: raw.quota.limit,
          unit: "usd",
        }
      : null,
    windows,
    today: normalizeStats(raw.usage?.today),
    total: normalizeStats(raw.usage?.total),
    rpm: raw.usage?.rpm ?? null,
    tpm: raw.usage?.tpm ?? null,
    averageDurationMs: raw.usage?.average_duration_ms ?? null,
    modelStats: (raw.model_stats ?? []).map((stats) => ({
      model: stats.model ?? "",
      ...(normalizeStats(stats) ?? {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        totalTokens: 0,
        cost: 0,
        actualCost: 0,
      }),
    })),
  };
}

function responseError(status: number, messages: ServerMessages): string {
  if (status === 401 || status === 403) return messages.unauthorized;
  if (status === 404) return messages.notFound;
  return messages.httpFailed(status);
}

export async function fetchSub2ApiUsage(
  input: { locale: Locale },
  _context: PluginHandlerContext,
): Promise<Sub2ApiUsage> {
  const messages = serverMessages[input.locale];
  const { baseUrl, apiKey } = resolveConnection(messages);
  const url = usageUrl(baseUrl, messages);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(messages.timeout);
    }
    throw new Error(messages.networkFailed);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(responseError(response.status, messages));
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await response.text());
  } catch {
    throw new Error(messages.invalidJson);
  }

  const parsed = rawUsageResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(messages.unsupportedShape);
  }

  return normalizeResponse(parsed.data, url.host);
}
