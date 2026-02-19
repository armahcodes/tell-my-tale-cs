/**
 * Observability and Performance Monitoring Service
 * Tracks agent performance, errors, and system health
 * 
 * Based on: https://mastra.ai/docs/observability/overview
 */

export interface AgentMetrics {
  requestId: string;
  agentId: string;
  startTime: number;
  endTime?: number;
  latencyMs?: number;
  tokensUsed?: number;
  toolsUsed: string[];
  modelUsed: string;
  success: boolean;
  errorMessage?: string;
  intent?: string;
  customerId?: string;
}

export interface SystemMetrics {
  timestamp: number;
  activeRequests: number;
  queuedRequests: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
  errorRate: number;
  tokensPerMinute: number;
  requestsPerMinute: number;
}

export interface PerformanceSnapshot {
  agentMetrics: AgentMetrics[];
  systemMetrics: SystemMetrics;
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}

/**
 * Observability Service
 * Monitors and tracks agent performance
 */
export class ObservabilityService {
  private metricsBuffer: AgentMetrics[] = [];
  private latencyBuffer: number[] = [];
  private systemMetrics: SystemMetrics;
  private alerts: Alert[] = [];
  private readonly bufferSize: number;
  private readonly alertThresholds: {
    latencyWarningMs: number;
    latencyCriticalMs: number;
    errorRateWarning: number;
    errorRateCritical: number;
    queueSizeWarning: number;
    queueSizeCritical: number;
  };

  constructor(options?: {
    bufferSize?: number;
    latencyWarningMs?: number;
    latencyCriticalMs?: number;
    errorRateWarning?: number;
    errorRateCritical?: number;
  }) {
    this.bufferSize = options?.bufferSize || 1000;
    this.alertThresholds = {
      latencyWarningMs: options?.latencyWarningMs || 5000,
      latencyCriticalMs: options?.latencyCriticalMs || 15000,
      errorRateWarning: options?.errorRateWarning || 0.05,
      errorRateCritical: options?.errorRateCritical || 0.1,
      queueSizeWarning: 5000,
      queueSizeCritical: 8000,
    };
    this.systemMetrics = this.initializeSystemMetrics();

    // Start metrics aggregation
    setInterval(() => this.aggregateMetrics(), 10000);
  }

  /**
   * Initialize system metrics
   */
  private initializeSystemMetrics(): SystemMetrics {
    return {
      timestamp: Date.now(),
      activeRequests: 0,
      queuedRequests: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      successRate: 1,
      errorRate: 0,
      tokensPerMinute: 0,
      requestsPerMinute: 0,
    };
  }

  /**
   * Start tracking a request
   */
  startRequest(agentId: string, modelUsed: string, customerId?: string): AgentMetrics {
    const metrics: AgentMetrics = {
      requestId: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      agentId,
      startTime: Date.now(),
      toolsUsed: [],
      modelUsed,
      success: false,
      customerId,
    };

    this.systemMetrics.activeRequests++;
    return metrics;
  }

  /**
   * Complete a request
   */
  completeRequest(
    metrics: AgentMetrics,
    options: {
      success: boolean;
      tokensUsed?: number;
      toolsUsed?: string[];
      intent?: string;
      errorMessage?: string;
    }
  ): AgentMetrics {
    metrics.endTime = Date.now();
    metrics.latencyMs = metrics.endTime - metrics.startTime;
    metrics.success = options.success;
    metrics.tokensUsed = options.tokensUsed;
    metrics.toolsUsed = options.toolsUsed || [];
    metrics.intent = options.intent;
    metrics.errorMessage = options.errorMessage;

    this.systemMetrics.activeRequests = Math.max(0, this.systemMetrics.activeRequests - 1);

    // Add to buffers
    this.metricsBuffer.push(metrics);
    if (metrics.latencyMs) {
      this.latencyBuffer.push(metrics.latencyMs);
    }

    // Trim buffers
    if (this.metricsBuffer.length > this.bufferSize) {
      this.metricsBuffer.shift();
    }
    if (this.latencyBuffer.length > this.bufferSize) {
      this.latencyBuffer.shift();
    }

    // Check for alerts
    this.checkAlerts(metrics);

    return metrics;
  }

  /**
   * Record a tool usage
   */
  recordToolUsage(metrics: AgentMetrics, toolName: string): void {
    if (!metrics.toolsUsed.includes(toolName)) {
      metrics.toolsUsed.push(toolName);
    }
  }

  /**
   * Update queue metrics
   */
  updateQueueMetrics(queuedRequests: number): void {
    this.systemMetrics.queuedRequests = queuedRequests;
    
    // Check queue size alerts
    if (queuedRequests >= this.alertThresholds.queueSizeCritical) {
      this.createAlert('critical', `Queue size critical: ${queuedRequests} requests`);
    } else if (queuedRequests >= this.alertThresholds.queueSizeWarning) {
      this.createAlert('warning', `Queue size warning: ${queuedRequests} requests`);
    }
  }

  /**
   * Aggregate metrics periodically
   */
  private aggregateMetrics(): void {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    // Filter to recent metrics
    const recentMetrics = this.metricsBuffer.filter(
      m => m.endTime && now - m.endTime < windowMs
    );

    if (recentMetrics.length === 0) {
      return;
    }

    // Calculate success/error rates
    const successful = recentMetrics.filter(m => m.success).length;
    const total = recentMetrics.length;
    this.systemMetrics.successRate = successful / total;
    this.systemMetrics.errorRate = 1 - this.systemMetrics.successRate;

    // Calculate requests per minute
    this.systemMetrics.requestsPerMinute = total;

    // Calculate tokens per minute
    const totalTokens = recentMetrics.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    this.systemMetrics.tokensPerMinute = totalTokens;

    // Calculate latency percentiles
    const recentLatencies = this.latencyBuffer.slice(-total).sort((a, b) => a - b);
    if (recentLatencies.length > 0) {
      this.systemMetrics.avgLatencyMs = 
        recentLatencies.reduce((sum, l) => sum + l, 0) / recentLatencies.length;
      this.systemMetrics.p50LatencyMs = this.percentile(recentLatencies, 50);
      this.systemMetrics.p95LatencyMs = this.percentile(recentLatencies, 95);
      this.systemMetrics.p99LatencyMs = this.percentile(recentLatencies, 99);
    }

    this.systemMetrics.timestamp = now;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Check and create alerts
   */
  private checkAlerts(metrics: AgentMetrics): void {
    // Latency alerts
    if (metrics.latencyMs) {
      if (metrics.latencyMs >= this.alertThresholds.latencyCriticalMs) {
        this.createAlert('critical', `High latency detected: ${metrics.latencyMs}ms for request ${metrics.requestId}`);
      } else if (metrics.latencyMs >= this.alertThresholds.latencyWarningMs) {
        this.createAlert('warning', `Elevated latency: ${metrics.latencyMs}ms for request ${metrics.requestId}`);
      }
    }

    // Error rate alerts (check aggregated)
    if (this.systemMetrics.errorRate >= this.alertThresholds.errorRateCritical) {
      this.createAlert('critical', `Error rate critical: ${(this.systemMetrics.errorRate * 100).toFixed(1)}%`);
    } else if (this.systemMetrics.errorRate >= this.alertThresholds.errorRateWarning) {
      this.createAlert('warning', `Error rate elevated: ${(this.systemMetrics.errorRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * Create an alert
   */
  private createAlert(severity: Alert['severity'], message: string): void {
    // Check for duplicate recent alert
    const recentSimilar = this.alerts.find(
      a => a.message === message && 
           Date.now() - a.timestamp < 60000 && 
           !a.resolved
    );

    if (recentSimilar) {
      return; // Don't duplicate
    }

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      severity,
      message,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Log alert
    console.log(`[ALERT][${severity.toUpperCase()}] ${message}`);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get recent agent metrics
   */
  getRecentMetrics(limit: number = 50): AgentMetrics[] {
    return this.metricsBuffer.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Get full performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    return {
      agentMetrics: this.getRecentMetrics(100),
      systemMetrics: this.getSystemMetrics(),
      alerts: this.getActiveAlerts(),
    };
  }

  /**
   * Get health status
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: { name: string; status: string; message: string }[];
  } {
    const checks = [
      {
        name: 'Error Rate',
        status: this.systemMetrics.errorRate < 0.05 ? 'pass' : 
                this.systemMetrics.errorRate < 0.1 ? 'warn' : 'fail',
        message: `${(this.systemMetrics.errorRate * 100).toFixed(1)}% errors`,
      },
      {
        name: 'Latency',
        status: this.systemMetrics.p95LatencyMs < 5000 ? 'pass' :
                this.systemMetrics.p95LatencyMs < 15000 ? 'warn' : 'fail',
        message: `P95: ${this.systemMetrics.p95LatencyMs}ms`,
      },
      {
        name: 'Queue',
        status: this.systemMetrics.queuedRequests < 5000 ? 'pass' :
                this.systemMetrics.queuedRequests < 8000 ? 'warn' : 'fail',
        message: `${this.systemMetrics.queuedRequests} queued`,
      },
      {
        name: 'Active Alerts',
        status: this.getActiveAlerts().filter(a => a.severity === 'critical').length === 0 ? 'pass' : 'fail',
        message: `${this.getActiveAlerts().length} active alerts`,
      },
    ];

    const failedCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;

    return {
      status: failedCount > 0 ? 'unhealthy' : warnCount > 0 ? 'degraded' : 'healthy',
      checks,
    };
  }
}

// Singleton instance
let _observabilityService: ObservabilityService | null = null;

export const getObservabilityService = (): ObservabilityService => {
  if (!_observabilityService) {
    _observabilityService = new ObservabilityService();
  }
  return _observabilityService;
};
