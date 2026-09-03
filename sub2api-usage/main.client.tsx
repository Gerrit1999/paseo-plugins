import type { PluginSurfaceProps, PluginTheme } from "@getpaseo/plugin";
import { useRpc } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/react-native";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  detectLocale,
  localeTag,
  messagesByLocale,
  rememberLocale,
  type Messages,
} from "./i18n.client";
import type { Locale, Sub2ApiUsage, UsageAmount, UsageStats } from "./usage.shared";
import { getSub2ApiUsage } from "./usage.shared";

type Styles = ReturnType<typeof createStyles>;

function formatUsd(value: number | null, locale: Locale): string {
  if (value === null) return "-";
  const digits = Math.abs(value) < 1 && value !== 0 ? 4 : 2;
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatNumber(value: number | null, locale: Locale): string {
  return value === null ? "-" : Math.round(value).toLocaleString(localeTag(locale));
}

function percentage(item: Pick<UsageAmount, "used" | "limit">): number {
  if (item.limit <= 0) return 0;
  return Math.max(0, Math.min(100, (item.used / item.limit) * 100));
}

function progressColor(value: number, theme: PluginTheme): string {
  if (value >= 90) return theme.colors.statusDanger;
  if (value >= 70) return theme.colors.statusWarning;
  return theme.colors.statusSuccess;
}

function limitLabel(id: string, messages: Messages): string {
  const labels: Record<string, string> = {
    total: messages.totalQuota,
    "5h": messages.fiveHourLimit,
    "1d": messages.dailyLimit,
    "7d": messages.sevenDayLimit,
    daily: messages.dailyLimit,
    weekly: messages.weeklyLimit,
    monthly: messages.monthlyLimit,
  };
  return labels[id] ?? id;
}

function statusLabel(status: string, messages: Messages): string {
  const labels: Record<string, string> = {
    active: messages.statusActive,
    quota_exhausted: messages.statusQuotaExhausted,
    expired: messages.statusExpired,
    revoked: messages.statusRevoked,
    suspended: messages.statusSuspended,
    unavailable: messages.statusUnavailable,
  };
  return labels[status.toLowerCase()] ?? status;
}

function ProgressRow({
  item,
  styles,
  theme,
  locale,
  messages,
}: {
  item: UsageAmount & { resetsAt?: string | null };
  styles: Styles;
  theme: PluginTheme;
  locale: Locale;
  messages: Messages;
}) {
  const usedPct = percentage(item);
  return (
    <View style={styles.progressRow}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{limitLabel(item.id, messages)}</Text>
        <Text style={styles.rowValue}>
          {formatUsd(item.used, locale)} / {formatUsd(item.limit, locale)}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={limitLabel(item.id, messages)}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(usedPct),
          text: `${formatUsd(item.used, locale)} / ${formatUsd(item.limit, locale)}`,
        }}
        style={styles.progressTrack}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${usedPct}%`, backgroundColor: progressColor(usedPct, theme) },
          ]}
        />
      </View>
      <View style={styles.rowFooter}>
        <Text style={styles.mutedText}>
          {usedPct.toLocaleString(localeTag(locale), { maximumFractionDigits: 1 })}% {messages.used}
        </Text>
        <Text style={styles.mutedText}>
          {item.resetsAt
            ? `${messages.resetsAt} ${new Date(item.resetsAt).toLocaleString(localeTag(locale))}`
            : `${formatUsd(item.remaining, locale)} ${messages.remaining}`}
        </Text>
      </View>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  styles,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  styles: Styles;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Icon name={icon} size={18} color={styles.summaryIconText.color} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.mutedText}>{detail}</Text>
    </View>
  );
}

function StatsSection({
  title,
  stats,
  styles,
  locale,
  messages,
}: {
  title: string;
  stats: UsageStats;
  styles: Styles;
  locale: Locale;
  messages: Messages;
}) {
  const rows = [
    [messages.requests, formatNumber(stats.requests, locale)],
    [messages.inputTokens, formatNumber(stats.inputTokens, locale)],
    [messages.outputTokens, formatNumber(stats.outputTokens, locale)],
    [messages.totalTokens, formatNumber(stats.totalTokens, locale)],
    [messages.cacheRead, formatNumber(stats.cacheReadTokens, locale)],
    [messages.actualCost, formatUsd(stats.actualCost, locale)],
  ];

  return (
    <View style={[styles.card, styles.statsCard]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.statsGrid}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.statCell}>
            <Text style={styles.mutedText}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function UsageContent({
  usage,
  styles,
  theme,
  locale,
  messages,
}: {
  usage: Sub2ApiUsage;
  styles: Styles;
  theme: PluginTheme;
  locale: Locale;
  messages: Messages;
}) {
  const statusColor = usage.isValid ? theme.colors.statusSuccess : theme.colors.statusDanger;
  const summary = [
    usage.balance !== null
      ? {
          icon: "WalletCards",
          label: messages.walletBalance,
          value: formatUsd(usage.balance, locale),
          detail: messages.availableBalance,
        }
      : null,
    usage.remaining !== null && usage.balance === null
      ? {
          icon: "CircleDollarSign",
          label: messages.remainingQuota,
          value: formatUsd(usage.remaining, locale),
          detail: usage.planName ?? messages.subscriptionQuota,
        }
      : null,
    usage.rpm !== null
      ? {
          icon: "Gauge",
          label: messages.currentRate,
          value: `${formatNumber(usage.rpm, locale)} RPM`,
          detail:
            usage.tpm === null
              ? messages.requestThroughput
              : `${formatNumber(usage.tpm, locale)} TPM`,
        }
      : null,
    usage.averageDurationMs !== null
      ? {
          icon: "Timer",
          label: messages.averageLatency,
          value: `${formatNumber(usage.averageDurationMs, locale)} ms`,
          detail: messages.averageLatencyDetail,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <>
      <View style={styles.statusLine}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.statusText}>{statusLabel(usage.status, messages)}</Text>
        <Text style={styles.mutedText}>
          {usage.mode === "quota_limited" ? messages.modeQuotaLimited : messages.modeUnrestricted}
        </Text>
      </View>

      {summary.length > 0 ? (
        <View style={styles.summaryGrid}>
          {summary.map((item) => (
            <SummaryCard key={item.label} {...item} styles={styles} />
          ))}
        </View>
      ) : null}

      {usage.quota || usage.windows.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="ChartNoAxesCombined" size={18} color={theme.colors.foregroundMuted} />
            <Text style={styles.sectionTitle}>{messages.limits}</Text>
          </View>
          {usage.quota ? (
            <ProgressRow
              item={usage.quota}
              styles={styles}
              theme={theme}
              locale={locale}
              messages={messages}
            />
          ) : null}
          {usage.windows.map((window) => (
            <ProgressRow
              key={window.id}
              item={window}
              styles={styles}
              theme={theme}
              locale={locale}
              messages={messages}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.statsColumns}>
        {usage.today ? (
          <StatsSection
            title={messages.today}
            stats={usage.today}
            styles={styles}
            locale={locale}
            messages={messages}
          />
        ) : null}
        {usage.total ? (
          <StatsSection
            title={messages.allTime}
            stats={usage.total}
            styles={styles}
            locale={locale}
            messages={messages}
          />
        ) : null}
      </View>

      {usage.modelStats.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{messages.usageByModel}</Text>
          {usage.modelStats.map((model, index) => (
            <View key={`${model.model}-${index}`} style={styles.modelRow}>
              <View style={styles.modelName}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {model.model || messages.unknownModel}
                </Text>
                <Text style={styles.mutedText}>
                  {formatNumber(model.requests, locale)} {messages.requests.toLowerCase()}
                </Text>
              </View>
              <View style={styles.modelMetric}>
                <Text style={styles.rowValue}>{formatNumber(model.totalTokens, locale)}</Text>
                <Text style={styles.mutedText}>{messages.tokens}</Text>
              </View>
              <View style={styles.modelMetric}>
                <Text style={styles.rowValue}>{formatUsd(model.actualCost, locale)}</Text>
                <Text style={styles.mutedText}>{messages.cost}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.footerText}>
        {usage.sourceLabel} · {messages.updatedAt}{" "}
        {new Date(usage.fetchedAt).toLocaleString(localeTag(locale))}
        {usage.expiresAt
          ? ` · ${messages.expiresAt} ${new Date(usage.expiresAt).toLocaleDateString(localeTag(locale))}`
          : ""}
      </Text>
    </>
  );
}

function LanguageSelector({
  locale,
  messages,
  styles,
  onChange,
}: {
  locale: Locale;
  messages: Messages;
  styles: Styles;
  onChange(locale: Locale): void;
}) {
  const options: Array<{ locale: Locale; label: string; accessibilityLabel: string }> = [
    { locale: "zh", label: "中文", accessibilityLabel: messages.languageChinese },
    { locale: "en", label: "EN", accessibilityLabel: messages.languageEnglish },
  ];

  return (
    <View style={styles.languageControl}>
      {options.map((option) => {
        const selected = option.locale === locale;
        return (
          <Pressable
            key={option.locale}
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.locale)}
            style={({ pressed }) => [
              styles.languageOption,
              selected && styles.languageOptionSelected,
              pressed && styles.languageOptionPressed,
            ]}
          >
            <Text style={[styles.languageOptionText, selected && styles.languageOptionTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainSurface({ theme, layout }: PluginSurfaceProps) {
  const [locale, setLocale] = useState<Locale>(() => detectLocale(layout.platform));
  const fetchUsage = useRpc(getSub2ApiUsage);
  const styles = useMemo(() => createStyles(theme, layout.compact), [theme, layout.compact]);
  const messages = messagesByLocale[locale];
  const query = useQuery({
    queryKey: ["sub2api", "usage", locale],
    queryFn: () => fetchUsage({ locale }),
    staleTime: 60_000,
    retry: 1,
  });

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    rememberLocale(nextLocale, layout.platform);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      alwaysBounceVertical={false}
    >
      <View style={styles.header}>
        <LanguageSelector
          locale={locale}
          messages={messages}
          styles={styles}
          onChange={changeLocale}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.refreshAccessibility}
          disabled={query.isFetching}
          onPress={() => void query.refetch()}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshButtonPressed,
            query.isFetching && styles.refreshButtonDisabled,
          ]}
        >
          <Icon name="RefreshCw" size={18} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {query.isPending ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.stateTitle}>{messages.loadingTitle}</Text>
          <Text style={styles.mutedText}>{messages.loadingDescription}</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.errorContainer}>
          <Icon name="TriangleAlert" size={24} color={theme.colors.statusDanger} />
          <Text style={styles.stateTitle}>{messages.errorTitle}</Text>
          <Text style={styles.errorText}>
            {query.error instanceof Error ? query.error.message : messages.errorFallback}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void query.refetch()}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          >
            <Icon name="RefreshCw" size={16} color={theme.colors.accentForeground} />
            <Text style={styles.retryButtonText}>{messages.retry}</Text>
          </Pressable>
        </View>
      ) : query.data ? (
        <UsageContent
          usage={query.data}
          styles={styles}
          theme={theme}
          locale={locale}
          messages={messages}
        />
      ) : null}
    </ScrollView>
  );
}

function createStyles(theme: PluginTheme, compact: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.surface0,
    },
    content: {
      width: "100%",
      maxWidth: 1040,
      alignSelf: "center",
      padding: compact ? 16 : 24,
      gap: 16,
    },
    header: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 16,
    },
    languageControl: {
      height: 34,
      flexDirection: "row",
      alignItems: "center",
      padding: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface1,
    },
    languageOption: {
      minWidth: 46,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 9,
      borderRadius: 4,
    },
    languageOptionSelected: {
      backgroundColor: theme.colors.accent,
    },
    languageOptionPressed: {
      opacity: 0.82,
    },
    languageOptionText: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    languageOptionTextSelected: {
      color: theme.colors.accentForeground,
    },
    refreshButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface1,
    },
    refreshButtonPressed: {
      backgroundColor: theme.colors.surface2,
    },
    refreshButtonDisabled: {
      opacity: 0.55,
    },
    stateContainer: {
      minHeight: 280,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    errorContainer: {
      minHeight: 280,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 24,
    },
    stateTitle: {
      color: theme.colors.foreground,
      fontSize: 16,
      fontWeight: "600",
    },
    errorText: {
      maxWidth: 560,
      color: theme.colors.foregroundMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },
    retryButton: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 6,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: theme.colors.accent,
    },
    retryButtonPressed: {
      opacity: 0.82,
    },
    retryButtonText: {
      color: theme.colors.accentForeground,
      fontSize: 13,
      fontWeight: "600",
    },
    statusLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      minHeight: 24,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      color: theme.colors.foreground,
      fontSize: 13,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    mutedText: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
    },
    summaryGrid: {
      flexDirection: compact ? "column" : "row",
      flexWrap: "wrap",
      gap: 12,
    },
    summaryCard: {
      flexGrow: 1,
      flexBasis: compact ? "auto" : 220,
      minHeight: 128,
      padding: 16,
      gap: 5,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface1,
    },
    summaryIcon: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
    },
    summaryIconText: {
      color: theme.colors.accent,
    },
    summaryLabel: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
    },
    summaryValue: {
      color: theme.colors.foreground,
      fontSize: 20,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    card: {
      minWidth: 0,
      padding: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface1,
    },
    statsCard: {
      flexGrow: compact ? 0 : 1,
      flexShrink: compact ? 0 : 1,
      flexBasis: compact ? "auto" : 0,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.foreground,
      fontSize: 15,
      fontWeight: "600",
    },
    progressRow: {
      gap: 7,
      paddingVertical: 4,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 8,
    },
    rowLabel: {
      flexShrink: 1,
      color: theme.colors.foreground,
      fontSize: 13,
      fontWeight: "500",
    },
    rowValue: {
      color: theme.colors.foreground,
      fontSize: 13,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    progressTrack: {
      height: 8,
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: theme.colors.surface2,
    },
    progressFill: {
      height: 8,
      borderRadius: 4,
    },
    statsColumns: {
      flexDirection: compact ? "column" : "row",
      gap: 12,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    statCell: {
      flexGrow: 1,
      flexBasis: compact ? 140 : 130,
      minWidth: 110,
      gap: 4,
      paddingVertical: 4,
    },
    statValue: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    modelRow: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    modelName: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    modelMetric: {
      width: compact ? 76 : 112,
      alignItems: "flex-end",
      gap: 3,
    },
    footerText: {
      color: theme.colors.foregroundMuted,
      fontSize: 11,
      textAlign: "center",
      paddingVertical: 6,
    },
  });
}
