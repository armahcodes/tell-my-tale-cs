#!/usr/bin/env npx tsx
/**
 * Gorgias Data Warehouse Sync - TURBO MODE
 *
 * Usage:
 *   npx tsx scripts/sync-warehouse.ts [command] [options]
 *
 * Commands:
 *   full       - TURBO full sync (parallel where possible)
 *   users      - Sync only users
 *   tags       - Sync only tags
 *   customers  - Sync only customers  
 *   tickets    - Sync only tickets
 *   messages   - Sync only messages (10x parallel)
 *   status     - Show current warehouse status
 *
 * Options:
 *   --batch=N       - Batch size (default: 100)
 *   --concurrency=N - Parallel connections for messages (default: 10)
 */

import 'dotenv/config';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function createProgressBar(percentage: number, width = 30): string {
  const filled = Math.round((percentage / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '100');
  const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '10');

  console.log();
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ⚡ GORGIAS DATA WAREHOUSE SYNC - TURBO MODE ⚡               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();

  // Check environment
  const domain = process.env.GORGIAS_DOMAIN;
  const email = process.env.GORGIAS_EMAIL;
  const apiKey = process.env.GORGIAS_API_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!domain || !email || !apiKey) {
    console.error('❌ Missing Gorgias credentials');
    process.exit(1);
  }

  if (!dbUrl) {
    console.error('❌ Missing DATABASE_URL');
    process.exit(1);
  }

  console.log('✓ Environment configured');
  console.log(`  Domain: ${domain}`);
  console.log(`  Batch: ${batchSize} | Concurrency: ${concurrency}`);
  console.log();

  const { gorgiasWarehouseSync } = await import('../src/lib/gorgias/warehouse-sync');

  if (!gorgiasWarehouseSync.isAvailable()) {
    console.error('❌ Sync not available');
    process.exit(1);
  }

  const onProgress = (p: { entityType: string; percentage: number; created: number; currentBatch: number }) => {
    const bar = createProgressBar(p.percentage);
    process.stdout.write(`\r  ${p.entityType.padEnd(10)} ${bar} ${p.percentage}% | ${p.created.toLocaleString()} records    `);
  };

  const printResult = (r: { success: boolean; entityType: string; totalRecords: number; duration: number; error?: string }) => {
    console.log();
    const icon = r.success ? '✓' : '✗';
    console.log(`  ${icon} ${r.entityType}: ${r.totalRecords.toLocaleString()} records in ${formatDuration(r.duration)}`);
    if (r.error) console.log(`    Error: ${r.error}`);
  };

  const startTime = Date.now();

  try {
    switch (command) {
      case 'status': {
        console.log('📊 Warehouse Status');
        console.log('─'.repeat(50));

        const [stats, syncStatus] = await Promise.all([
          gorgiasWarehouseSync.getWarehouseStats(),
          gorgiasWarehouseSync.getSyncStatus(),
        ]);

        console.log('\nData Counts:');
        console.log(`  Users:     ${stats.totalUsers.toLocaleString()}`);
        console.log(`  Tags:      ${stats.totalTags.toLocaleString()}`);
        console.log(`  Customers: ${stats.totalCustomers.toLocaleString()}`);
        console.log(`  Tickets:   ${stats.totalTickets.toLocaleString()} (${stats.openTickets} open, ${stats.closedTickets} closed)`);
        console.log(`  Messages:  ${stats.totalMessages.toLocaleString()}`);

        if (syncStatus.length > 0) {
          console.log('\nLast Synced:');
          for (const s of syncStatus) {
            const time = s.lastSyncedAt ? s.lastSyncedAt.toISOString() : 'Never';
            console.log(`  ${s.entityType.padEnd(10)}: ${time}`);
          }
        }
        break;
      }

      case 'full': {
        console.log('⚡ TURBO FULL SYNC');
        console.log('─'.repeat(50));
        
        const results = await gorgiasWarehouseSync.fullSync({ batchSize, concurrency, onProgress });
        
        console.log('\n');
        console.log('═'.repeat(50));
        console.log('SUMMARY:');
        
        let totalRecords = 0;
        for (const r of results) {
          printResult(r);
          totalRecords += r.totalRecords;
        }

        console.log();
        console.log('─'.repeat(50));
        console.log(`✓ Total: ${totalRecords.toLocaleString()} records in ${formatDuration(Date.now() - startTime)}`);
        break;
      }

      case 'users': {
        console.log('📥 Syncing Users');
        const r = await gorgiasWarehouseSync.syncUsers({ batchSize, onProgress });
        printResult(r);
        break;
      }

      case 'tags': {
        console.log('📥 Syncing Tags');
        const r = await gorgiasWarehouseSync.syncTags({ batchSize, onProgress });
        printResult(r);
        break;
      }

      case 'customers': {
        console.log('📥 Syncing Customers');
        const r = await gorgiasWarehouseSync.syncCustomers({ batchSize, onProgress });
        printResult(r);
        break;
      }

      case 'tickets': {
        console.log('📥 Syncing Tickets');
        const r = await gorgiasWarehouseSync.syncTickets({ batchSize, onProgress });
        printResult(r);
        break;
      }

      case 'messages': {
        console.log('📥 Syncing Messages (10x parallel)');
        const r = await gorgiasWarehouseSync.syncMessages({ batchSize, concurrency, onProgress });
        printResult(r);
        break;
      }

      default:
        console.log('Commands: full | users | tags | customers | tickets | messages | status');
        console.log('Options:  --batch=N --concurrency=N');
    }
  } catch (error) {
    console.error('\n❌ Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log();
  process.exit(0);
}

main();
