/**
 * System Metrics API
 * Detailed metrics for monitoring and alerting
 */

import { NextRequest } from 'next/server';
import { getObservabilityService, getRequestQueueService, agentManager } from '@/lib/mastra';

export const runtime = 'nodejs';

/**
 * GET /api/system/metrics
 * Returns detailed system metrics in Prometheus-compatible format
 */
export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format') || 'json';

  const observability = getObservabilityService();
  const queue = getRequestQueueService();
  const systemMetrics = observability.getSystemMetrics();
  const queueMetrics = queue.getMetrics();
  const recentAgentMetrics = observability.getRecentMetrics(100);

  // Calculate additional metrics
  const toolUsageCounts: Record<string, number> = {};
  const intentCounts: Record<string, number> = {};
  
  for (const metric of recentAgentMetrics) {
    for (const tool of metric.toolsUsed) {
      toolUsageCounts[tool] = (toolUsageCounts[tool] || 0) + 1;
    }
    if (metric.intent) {
      intentCounts[metric.intent] = (intentCounts[metric.intent] || 0) + 1;
    }
  }

  const metrics = {
    timestamp: new Date().toISOString(),

    // Request metrics
    requests: {
      total_received: queueMetrics.totalReceived,
      total_processed: queueMetrics.totalProcessed,
      total_rejected: queueMetrics.totalRejected,
      total_timed_out: queueMetrics.totalTimedOut,
      per_minute: systemMetrics.requestsPerMinute,
      current_active: systemMetrics.activeRequests,
      current_queued: systemMetrics.queuedRequests,
    },

    // Latency metrics (in milliseconds)
    latency: {
      avg_ms: Math.round(systemMetrics.avgLatencyMs),
      p50_ms: Math.round(systemMetrics.p50LatencyMs),
      p95_ms: Math.round(systemMetrics.p95LatencyMs),
      p99_ms: Math.round(systemMetrics.p99LatencyMs),
      queue_avg_ms: Math.round(queueMetrics.avgProcessingTimeMs),
    },

    // Performance metrics
    performance: {
      success_rate: systemMetrics.successRate,
      error_rate: systemMetrics.errorRate,
    },

    // Token usage
    tokens: {
      per_minute: systemMetrics.tokensPerMinute,
    },

    // Queue breakdown
    queue: {
      total: queueMetrics.currentQueueSize,
      urgent: queueMetrics.queuesByPriority.urgent,
      high: queueMetrics.queuesByPriority.high,
      medium: queueMetrics.queuesByPriority.medium,
      low: queueMetrics.queuesByPriority.low,
      processing: queueMetrics.currentProcessing,
    },

    // Tool usage (from recent requests)
    tool_usage: toolUsageCounts,

    // Intent distribution (from recent requests)
    intent_distribution: intentCounts,

    // Alerts summary
    alerts: {
      active_count: observability.getActiveAlerts().length,
      critical_count: observability.getActiveAlerts().filter(a => a.severity === 'critical').length,
    },
  };

  if (format === 'prometheus') {
    // Return Prometheus-compatible text format
    const prometheusLines = [
      `# HELP tmt_requests_total Total number of requests`,
      `# TYPE tmt_requests_total counter`,
      `tmt_requests_total{status="received"} ${metrics.requests.total_received}`,
      `tmt_requests_total{status="processed"} ${metrics.requests.total_processed}`,
      `tmt_requests_total{status="rejected"} ${metrics.requests.total_rejected}`,
      `tmt_requests_total{status="timed_out"} ${metrics.requests.total_timed_out}`,
      ``,
      `# HELP tmt_requests_per_minute Requests per minute`,
      `# TYPE tmt_requests_per_minute gauge`,
      `tmt_requests_per_minute ${metrics.requests.per_minute}`,
      ``,
      `# HELP tmt_latency_ms Request latency in milliseconds`,
      `# TYPE tmt_latency_ms summary`,
      `tmt_latency_ms{quantile="0.5"} ${metrics.latency.p50_ms}`,
      `tmt_latency_ms{quantile="0.95"} ${metrics.latency.p95_ms}`,
      `tmt_latency_ms{quantile="0.99"} ${metrics.latency.p99_ms}`,
      `tmt_latency_ms_avg ${metrics.latency.avg_ms}`,
      ``,
      `# HELP tmt_success_rate Request success rate`,
      `# TYPE tmt_success_rate gauge`,
      `tmt_success_rate ${metrics.performance.success_rate}`,
      ``,
      `# HELP tmt_queue_size Current queue size by priority`,
      `# TYPE tmt_queue_size gauge`,
      `tmt_queue_size{priority="urgent"} ${metrics.queue.urgent}`,
      `tmt_queue_size{priority="high"} ${metrics.queue.high}`,
      `tmt_queue_size{priority="medium"} ${metrics.queue.medium}`,
      `tmt_queue_size{priority="low"} ${metrics.queue.low}`,
      `tmt_queue_processing ${metrics.queue.processing}`,
      ``,
      `# HELP tmt_tokens_per_minute Tokens consumed per minute`,
      `# TYPE tmt_tokens_per_minute gauge`,
      `tmt_tokens_per_minute ${metrics.tokens.per_minute}`,
      ``,
      `# HELP tmt_alerts_active Active alert count`,
      `# TYPE tmt_alerts_active gauge`,
      `tmt_alerts_active{severity="critical"} ${metrics.alerts.critical_count}`,
      `tmt_alerts_active{severity="all"} ${metrics.alerts.active_count}`,
    ];

    // Add tool usage metrics
    for (const [tool, count] of Object.entries(metrics.tool_usage)) {
      prometheusLines.push(`tmt_tool_usage{tool="${tool}"} ${count}`);
    }

    return new Response(prometheusLines.join('\n'), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Default JSON format
  return new Response(JSON.stringify(metrics, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
