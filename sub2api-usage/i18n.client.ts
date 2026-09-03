import type { Locale } from "./usage.shared";

export interface Messages {
  languageEnglish: string;
  languageChinese: string;
  refreshAccessibility: string;
  loadingTitle: string;
  loadingDescription: string;
  errorTitle: string;
  errorFallback: string;
  retry: string;
  used: string;
  resetsAt: string;
  remaining: string;
  requests: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  cacheRead: string;
  actualCost: string;
  walletBalance: string;
  availableBalance: string;
  remainingQuota: string;
  subscriptionQuota: string;
  currentRate: string;
  requestThroughput: string;
  averageLatency: string;
  averageLatencyDetail: string;
  modeQuotaLimited: string;
  modeUnrestricted: string;
  limits: string;
  totalQuota: string;
  fiveHourLimit: string;
  dailyLimit: string;
  sevenDayLimit: string;
  weeklyLimit: string;
  monthlyLimit: string;
  today: string;
  allTime: string;
  usageByModel: string;
  tokens: string;
  cost: string;
  updatedAt: string;
  expiresAt: string;
  unknownModel: string;
  statusActive: string;
  statusQuotaExhausted: string;
  statusExpired: string;
  statusRevoked: string;
  statusSuspended: string;
  statusUnavailable: string;
}

export const messagesByLocale: Record<Locale, Messages> = {
  en: {
    languageEnglish: "English",
    languageChinese: "Chinese",
    refreshAccessibility: "Refresh Sub2API usage",
    loadingTitle: "Loading usage",
    loadingDescription: "Querying the configured Sub2API account",
    errorTitle: "Usage unavailable",
    errorFallback: "The usage request failed.",
    retry: "Retry",
    used: "used",
    resetsAt: "Resets",
    remaining: "remaining",
    requests: "Requests",
    inputTokens: "Input tokens",
    outputTokens: "Output tokens",
    totalTokens: "Total tokens",
    cacheRead: "Cache read",
    actualCost: "Actual cost",
    walletBalance: "Wallet balance",
    availableBalance: "Available account balance",
    remainingQuota: "Remaining",
    subscriptionQuota: "Subscription quota",
    currentRate: "Current rate",
    requestThroughput: "Request throughput",
    averageLatency: "Average latency",
    averageLatencyDetail: "Across queried usage",
    modeQuotaLimited: "Quota-limited API key",
    modeUnrestricted: "Unrestricted API key",
    limits: "Limits",
    totalQuota: "Total quota",
    fiveHourLimit: "5-hour limit",
    dailyLimit: "Daily limit",
    sevenDayLimit: "7-day limit",
    weeklyLimit: "Weekly limit",
    monthlyLimit: "Monthly limit",
    today: "Today",
    allTime: "All time",
    usageByModel: "Usage by model",
    tokens: "tokens",
    cost: "cost",
    updatedAt: "Updated",
    expiresAt: "Expires",
    unknownModel: "Unknown model",
    statusActive: "Active",
    statusQuotaExhausted: "Quota exhausted",
    statusExpired: "Expired",
    statusRevoked: "Revoked",
    statusSuspended: "Suspended",
    statusUnavailable: "Unavailable",
  },
  zh: {
    languageEnglish: "英文",
    languageChinese: "中文",
    refreshAccessibility: "刷新 Sub2API 用量",
    loadingTitle: "用量加载中",
    loadingDescription: "正在查询已配置的 Sub2API 账户",
    errorTitle: "无法获取用量",
    errorFallback: "用量查询失败。",
    retry: "重试",
    used: "已使用",
    resetsAt: "重置于",
    remaining: "剩余",
    requests: "请求数",
    inputTokens: "输入 Token",
    outputTokens: "输出 Token",
    totalTokens: "总 Token",
    cacheRead: "缓存读取",
    actualCost: "实际费用",
    walletBalance: "钱包余额",
    availableBalance: "可用账户余额",
    remainingQuota: "剩余额度",
    subscriptionQuota: "订阅额度",
    currentRate: "当前速率",
    requestThroughput: "请求吞吐",
    averageLatency: "平均延迟",
    averageLatencyDetail: "查询范围内平均值",
    modeQuotaLimited: "受额度限制的 API Key",
    modeUnrestricted: "无 Key 级额度限制",
    limits: "额度限制",
    totalQuota: "总额度",
    fiveHourLimit: "5 小时限额",
    dailyLimit: "每日限额",
    sevenDayLimit: "7 天限额",
    weeklyLimit: "每周限额",
    monthlyLimit: "每月限额",
    today: "今日",
    allTime: "累计",
    usageByModel: "按模型统计",
    tokens: "Token",
    cost: "费用",
    updatedAt: "更新于",
    expiresAt: "到期于",
    unknownModel: "未知模型",
    statusActive: "正常",
    statusQuotaExhausted: "额度已用尽",
    statusExpired: "已过期",
    statusRevoked: "已撤销",
    statusSuspended: "已暂停",
    statusUnavailable: "不可用",
  },
};

const storageKey = "sub2api-usage-locale";

export function localeTag(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}

export function detectLocale(platform: "ios" | "android" | "web"): Locale {
  if (platform === "web" && typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "en" || stored === "zh") return stored;
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }

  const candidates: string[] = [];
  if (platform === "web" && typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    if (navigator.language) candidates.push(navigator.language);
  }
  try {
    candidates.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // English is the stable fallback when the runtime does not expose a locale.
  }
  return candidates.some((candidate) => candidate.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

export function rememberLocale(locale: Locale, platform: "ios" | "android" | "web") {
  if (platform === "web" && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey, locale);
    } catch {
      // The selected locale still applies for the current surface session.
    }
  }
}
