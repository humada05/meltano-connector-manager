
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type TriggerSyncInput, type CreateConnectorInput } from '../schema';
import { triggerSync } from '../handlers/trigger_sync';
import { eq } from 'drizzle-orm';

// Helper function to create a test connector
const createTestConnector = async (overrides?: Partial<CreateConnectorInput>) => {
  const defaultInput: CreateConnectorInput = {
    connector_name: 'Test Connector',
    source_tap: 'tap-postgres',
    target: 'target-postgres',
    configuration: { host: 'localhost', port: 5432 }
  };

  const input = { ...defaultInput, ...overrides };

  const result = await db.insert(connectorsTable)
    .values({
      connector_name: input.connector_name,
      source_tap: input.source_tap,
      target: input.target,
      configuration: input.configuration
    })
    .returning()
    .execute();

  return result[0];
};

describe('triggerSync', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should trigger sync for existing connector', async () => {
    const connector = await createTestConnector();
    const input: TriggerSyncInput = { id: connector.id };

    const result = await triggerSync(input);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Sync triggered successfully');

    // Verify connector status was updated
    const updatedConnectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connector.id))
      .execute();

    expect(updatedConnectors).toHaveLength(1);
    expect(updatedConnectors[0].last_run_status).toBe('running');
    expect(updatedConnectors[0].last_run_timestamp).toBeInstanceOf(Date);
    expect(updatedConnectors[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return error for non-existent connector', async () => {
    const input: TriggerSyncInput = { id: 999 };

    const result = await triggerSync(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Connector not found');
  });

  it('should return error when connector is already running', async () => {
    // Create connector and set it to running status
    const connector = await createTestConnector();
    await db
      .update(connectorsTable)
      .set({ last_run_status: 'running' })
      .where(eq(connectorsTable.id, connector.id))
      .execute();

    const input: TriggerSyncInput = { id: connector.id };

    const result = await triggerSync(input);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Connector is already running');

    // Verify status wasn't changed
    const updatedConnectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connector.id))
      .execute();

    expect(updatedConnectors[0].last_run_status).toBe('running');
  });

  it('should trigger sync for connector with different statuses', async () => {
    const statuses = ['success', 'failure', 'not run yet'] as const;

    for (const status of statuses) {
      // Create connector with specific status
      const connector = await createTestConnector({
        connector_name: `Test Connector ${status}`
      });
      
      await db
        .update(connectorsTable)
        .set({ last_run_status: status })
        .where(eq(connectorsTable.id, connector.id))
        .execute();

      const input: TriggerSyncInput = { id: connector.id };

      const result = await triggerSync(input);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Sync triggered successfully');

      // Verify status was updated to running
      const updatedConnectors = await db.select()
        .from(connectorsTable)
        .where(eq(connectorsTable.id, connector.id))
        .execute();

      expect(updatedConnectors[0].last_run_status).toBe('running');
    }
  });

  it('should update timestamp and updated_at when triggering sync', async () => {
    const connector = await createTestConnector();
    const originalUpdatedAt = connector.updated_at;
    
    // Wait a tiny bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: TriggerSyncInput = { id: connector.id };

    const result = await triggerSync(input);

    expect(result.success).toBe(true);

    const updatedConnectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connector.id))
      .execute();

    const updatedConnector = updatedConnectors[0];
    
    expect(updatedConnector.last_run_timestamp).toBeInstanceOf(Date);
    expect(updatedConnector.updated_at).toBeInstanceOf(Date);
    expect(updatedConnector.updated_at > originalUpdatedAt).toBe(true);
  });
});
