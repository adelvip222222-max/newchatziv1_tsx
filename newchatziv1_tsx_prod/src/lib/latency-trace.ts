export type LatencyTrace = Record<string, unknown>;

const durationPairs: Array<[string, string, string]> = [
  ["receivedAt", "outboundSentAt", "totalMs"],
  ["aiStartedAt", "aiCompletedAt", "aiMs"],
  ["knowledgeStartedAt", "knowledgeCompletedAt", "knowledgeMs"],
  ["modelStartedAt", "modelCompletedAt", "modelMs"],
  ["egressStartedAt", "egressCompletedAt", "egressMs"],
  ["outboundStartedAt", "outboundSentAt", "outboundMs"],
  ["fastResponderStartedAt", "fastResponderCompletedAt", "fastResponderMs"],
  ["ingressStartedAt", "ingressCompletedAt", "ingressMs"],
  ["coreRoutingStartedAt", "coreRoutingCompletedAt", "coreRoutingMs"],
];

const totalFallbackFields = [
  "outboundSentAt",
  "outboundQueuedAt",
  "egressQueuedAt",
  "realtimePublishedAt",
  "assistantSavedAt",
  "aiCompletedAt",
  "modelCompletedAt",
  "knowledgeCompletedAt",
  "fastResponderCompletedAt",
  "coreRoutingCompletedAt",
  "ingressCompletedAt",
];

export function nowIso(date = new Date()) {
  return date.toISOString();
}

export function mergeLatencyTrace(...traces: Array<LatencyTrace | null | undefined>) {
  return traces.reduce<LatencyTrace>((merged, trace) => {
    if (!trace || typeof trace !== "object") return merged;
    return { ...merged, ...trace };
  }, {});
}

export function markLatencyTrace(trace: LatencyTrace | null | undefined, key: string, date = new Date()) {
  return computeLatencyDurations({
    ...mergeLatencyTrace(trace),
    [key]: nowIso(date),
  });
}

export function computeLatencyDurations(trace: LatencyTrace | null | undefined) {
  const next = mergeLatencyTrace(trace);

  for (const [startKey, endKey, durationKey] of durationPairs) {
    const duration = diffMs(next[startKey], next[endKey]);
    if (duration !== undefined) next[durationKey] = duration;
  }

  if (next.receivedAt) {
    const latestEnd = totalFallbackFields
      .map((field) => toTime(next[field]))
      .filter((time): time is number => typeof time === "number")
      .sort((a, b) => b - a)[0];
    const start = toTime(next.receivedAt);
    if (start !== undefined && latestEnd !== undefined && latestEnd >= start) {
      const fallbackTotalMs = latestEnd - start;
      next.totalMs = Math.max(Number(next.totalMs || 0), fallbackTotalMs);
    }
  }

  return next;
}

export function latencyTraceMongoSet(trace: LatencyTrace | null | undefined, prefix = "metadata.trace") {
  const set: Record<string, unknown> = {};
  const normalized = computeLatencyDurations(trace);

  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined) continue;
    set[`${prefix}.${key}`] = value;
  }

  return set;
}

export function latencyTraceSummary(trace: LatencyTrace | null | undefined) {
  const normalized = computeLatencyDurations(trace);
  return {
    traceId: normalized.traceId,
    totalMs: normalized.totalMs,
    aiMs: normalized.aiMs,
    knowledgeMs: normalized.knowledgeMs,
    modelMs: normalized.modelMs,
    fastResponderMs: normalized.fastResponderMs,
    egressMs: normalized.egressMs,
    outboundMs: normalized.outboundMs,
  };
}

function diffMs(startValue: unknown, endValue: unknown) {
  const start = toTime(startValue);
  const end = toTime(endValue);
  if (start === undefined || end === undefined || end < start) return undefined;
  return end - start;
}

function toTime(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
}
