/**
 * System Health API
 * Comprehensive health monitoring endpoint for production operations
 */

import { NextRequest } from 'next/server';
import { agentManager, getObservabilityService, getRequestQueueService } from '@/lib/mastra';
import { dbService } from '@/lib/db/service';

export const runtime = 'nodejs';

/**
 * GET /api/system/health
 * Returns comprehensive system health status
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Gather health data from all components
    const [
      agentHealth,
      observabilitySnapshot,
      queueMetrics,
      dbHealth,
    ] = await Promise.all([
      agentManager.getHealth(),
      Promise.resolve(getObservabilityService().getSnapshot()),
      Promise.resolve(getRequestQueueService().getMetrics()),
      checkDatabaseHealth(),
    ]);

    const checkLatency = Date.now() - startTime;

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (agentHealth.status === 'unhealthy' || !dbHealth.healthy) {
      overallStatus = 'unhealthy';
    } else if (agentHealth.status === 'degraded' || dbHealth.latencyMs > 1000) {
      overallStatus = 'degraded';
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checkLatencyMs: checkLatency,
      
      components: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          latencyMs: dbHealth.latencyMs,
          gorgiasTickets: dbHealth.gorgiasStats?.totalTickets,
          gorgiasCustomers: dbHealth.gorgiasStats?.totalCustomers,
        },
        agents: {
          status: agentHealth.status,
          poolSize: agentHealth.components.agents.poolSize,
          storageAvailable: agentHealth.components.storage.available,
        },
        queue: {
          status: queueMetrics.currentQueueSize < 8000 ? 'healthy' : 
                  queueMetrics.currentQueueSize < 9000 ? 'degraded' : 'unhealthy',
          currentSize: queueMetrics.currentQueueSize,
          processing: queueMetrics.currentProcessing,
          byPriority: queueMetrics.queuesByPriority,
        },
        streaming: {
          status: 'healthy',
          activeStreams: agentHealth.components.streaming.activeStreams,
        },
      },

      metrics: {
        requests: {
          perMinute: agentHealth.metrics.requestsPerMinute,
          total: queueMetrics.totalReceived,
          processed: queueMetrics.totalProcessed,
          rejected: queueMetrics.totalRejected,
          timedOut: queueMetrics.totalTimedOut,
        },
        latency: {
          avgMs: Math.round(agentHealth.metrics.avgLatencyMs),
          p50Ms: observabilitySnapshot.systemMetrics.p50LatencyMs,
          p95Ms: observabilitySnapshot.systemMetrics.p95LatencyMs,
          p99Ms: observabilitySnapshot.systemMetrics.p99LatencyMs,
        },
        performance: {
          successRate: `${(agentHealth.metrics.successRate * 100).toFixed(1)}%`,
          errorRate: `${(agentHealth.metrics.errorRate * 100).toFixed(1)}%`,
        },
        tokens: {
          perMinute: observabilitySnapshot.systemMetrics.tokensPerMinute,
        },
      },

      alerts: {
        active: observabilitySnapshot.alerts.length,
        critical: observabilitySnapshot.alerts.filter(a => a.severity === 'critical').length,
        warning: observabilitySnapshot.alerts.filter(a => a.severity === 'warning').length,
        recent: observabilitySnapshot.alerts.slice(0, 5).map(a => ({
          severity: a.severity,
          message: a.message,
          timestamp: new Date(a.timestamp).toISOString(),
        })),
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[Health API] Error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  gorgiasStats?: {
    totalTickets: number;
    totalCustomers: number;
  };
}> {
  const start = Date.now();
  
  try {
    if (!dbService.isAvailable()) {
      return { healthy: false, latencyMs: Date.now() - start };
    }

    // Quick health check with Gorgias stats
    const stats = await dbService.gorgiasWarehouse.getWarehouseStats();
    
    return {
      healthy: true,
      latencyMs: Date.now() - start,
      gorgiasStats: {
        totalTickets: stats.totalTickets,
        totalCustomers: stats.totalCustomers,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
    };
  }
}
