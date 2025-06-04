
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type TriggerSyncInput, type CreateConnectorInput } from '../schema';
import { triggerSync } from '../handlers/trigger_sync';
import { eq } from 'drizzle-orm';

// Test input
const testTriggerInput: TriggerSyncInput = {
  id: 1
};

const testConnectorInput: CreateConnectorInput = {
  connector_name: 'Test Connector',
  source_tap: 'tap-test',
  target: 'target-test',
  configuration: { key: 'value' }
};

describe('triggerSync', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should trigger sync for existing connector', async () => {
    // Create test connector
    await db.insert(connectorsTable)
      .values({
        connector_name: testConnectorInput.connector_name,
        source_tap: testConnectorInput.source_tap,
        target: testConnectorInput.target,
        configuration: testConnectorInput.configuration,
        last_run_status: 'not run yet'
      })
      .execute();

    const result = await triggerSync(testTriggerInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Sync triggered successfully');
  });

  it('should update connector status to running', async () => {
    // Create test connector
    await db.insert(connectorsTable)
      .values({
        connector_name: testConnectorInput.connector_name,
        source_tap: testConnectorInput.source_tap,
        target: testConnectorInput.target,
        configuration: testConnectorInput.configuration,
        last_run_status: 'success'
      })
      .execute();

    await triggerSync(testTriggerInput);

    // Verify status updated
    const connectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, testTriggerInput.id))
      .execute();

    expect(connectors).toHaveLength(1);
    expect(connectors[0].last_run_status).toEqual('running');
    expect(connectors[0].last_run_timestamp).toBeInstanceOf(Date);
    expect(connectors[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return error for non-existent connector', async () => {
    const result = await triggerSync({ id: 999 });

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Connector not found');
  });

  it('should return error if connector is already running', async () => {
    // Create test connector with running status
    await db.insert(connectorsTable)
      .values({
        connector_name: testConnectorInput.connector_name,
        source_tap: testConnectorInput.source_tap,
        target: testConnectorInput.target,
        configuration: testConnectorInput.configuration,
        last_run_status: 'running'
      })
      .execute();

    const result = await triggerSync(testTriggerInput);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Connector is already running');
  });

  it('should trigger sync from any non-running status', async () => {
    const statuses = ['success', 'failure', 'not run yet'] as const;

    for (const status of statuses) {
      // Create connector with specific status
      const connector = await db.insert(connectorsTable)
        .values({
          connector_name: `Test Connector ${status}`,
          source_tap: testConnectorInput.source_tap,
          target: testConnectorInput.target,
          configuration: testConnectorInput.configuration,
          last_run_status: status
        })
        .returning()
        .execute();

      const result = await triggerSync({ id: connector[0].id });

      expect(result.success).toBe(true);
      expect(result.message).toEqual('Sync triggered successfully');

      // Verify status changed to running
      const updatedConnectors = await db.select()
        .from(connectorsTable)
        .where(eq(connectorsTable.id, connector[0].id))
        .execute();

      expect(updatedConnectors[0].last_run_status).toEqual('running');
    }
  });
});
