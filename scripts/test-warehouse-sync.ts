/**
 * Test script for Gorgias Data Warehouse Sync
 * Run with: npx tsx scripts/test-warehouse-sync.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🏭 Testing Gorgias Data Warehouse Sync\n');
  console.log('='.repeat(50));

  // Dynamically import after env vars are set
  const { gorgiasWarehouseSync } = await import('../src/lib/gorgias');

  if (!gorgiasWarehouseSync.isAvailable()) {
    console.error('❌ Warehouse sync is not available');
    console.error('   Check your database and Gorgias configuration');
    process.exit(1);
  }

  console.log('✅ Warehouse sync is available\n');

  // Get current stats
  console.log('📊 Current warehouse stats:');
  const stats = await gorgiasWarehouseSync.getWarehouseStats();
  console.log(`   Tickets: ${stats.totalTickets} (${stats.openTickets} open, ${stats.closedTickets} closed)`);
  console.log(`   Customers: ${stats.totalCustomers}`);
  console.log(`   Messages: ${stats.totalMessages}`);
  console.log(`   Users: ${stats.totalUsers}`);
  console.log(`   Tags: ${stats.totalTags}`);

  // Get sync status
  console.log('\n📅 Sync status:');
  const syncStatus = await gorgiasWarehouseSync.getSyncStatus();
  if (syncStatus.length === 0) {
    console.log('   No previous syncs recorded');
  } else {
    for (const status of syncStatus) {
      console.log(`   ${status.entityType}: Last synced ${status.lastSyncedAt?.toISOString() || 'never'} (${status.totalSynced} total)`);
    }
  }

  // Ask user if they want to run a sync
  const args = process.argv.slice(2);
  const syncType = args[0]; // 'full', 'users', 'tags', 'customers', 'tickets'

  if (!syncType) {
    console.log('\n💡 To run a sync, use:');
    console.log('   npx tsx scripts/test-warehouse-sync.ts full      - Full sync of all data');
    console.log('   npx tsx scripts/test-warehouse-sync.ts users     - Sync users only');
    console.log('   npx tsx scripts/test-warehouse-sync.ts tags      - Sync tags only');
    console.log('   npx tsx scripts/test-warehouse-sync.ts customers - Sync customers only');
    console.log('   npx tsx scripts/test-warehouse-sync.ts tickets   - Sync tickets (includes messages)');
    process.exit(0);
  }

  console.log(`\n🔄 Starting ${syncType} sync...`);
  const startTime = Date.now();

  try {
    let results;

    if (syncType === 'full') {
      results = await gorgiasWarehouseSync.fullSync({
        batchSize: 50,
        onProgress: (progress) => {
          process.stdout.write(`\r   ${progress.entityType}: ${progress.processed} processed (${progress.created} created, ${progress.updated} updated)`);
        },
      });
    } else {
      let result;
      switch (syncType) {
        case 'users':
          result = await gorgiasWarehouseSync.syncUsers({ batchSize: 50 });
          break;
        case 'tags':
          result = await gorgiasWarehouseSync.syncTags({ batchSize: 50 });
          break;
        case 'customers':
          result = await gorgiasWarehouseSync.syncCustomers({ batchSize: 50 });
          break;
        case 'tickets':
          result = await gorgiasWarehouseSync.syncTickets({ batchSize: 25 });
          break;
        default:
          console.error(`\n❌ Unknown sync type: ${syncType}`);
          process.exit(1);
      }
      results = [result];
    }

    console.log('\n');
    console.log('='.repeat(50));
    console.log('\n📋 Sync Results:');

    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`\n${status} ${result.entityType}:`);
      console.log(`   Total: ${result.totalRecords}`);
      console.log(`   Created: ${result.createdRecords}`);
      console.log(`   Updated: ${result.updatedRecords}`);
      console.log(`   Failed: ${result.failedRecords}`);
      console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️  Total time: ${totalDuration.toFixed(1)}s`);

    // Show updated stats
    console.log('\n📊 Updated warehouse stats:');
    const newStats = await gorgiasWarehouseSync.getWarehouseStats();
    console.log(`   Tickets: ${newStats.totalTickets} (${newStats.openTickets} open, ${newStats.closedTickets} closed)`);
    console.log(`   Customers: ${newStats.totalCustomers}`);
    console.log(`   Messages: ${newStats.totalMessages}`);
    console.log(`   Users: ${newStats.totalUsers}`);
    console.log(`   Tags: ${newStats.totalTags}`);

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
