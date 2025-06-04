
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput, type UpdateConnectorInput } from '../schema';
import { updateConnector } from '../handlers/update_connector';
import { eq } from 'drizzle-orm';

// Helper function to create a test connector
const createTestConnector = async (): Promise<number> => {
  const testConnector: CreateConnectorInput = {
    connector_name: 'Test Connector',
    source_tap: 'tap-mysql',
    target: 'target-postgresql',
    configuration: { host: 'localhost', port: 3306 }
  };

  const result = await db.insert(connectorsTable)
    .values({
      connector_name: testConnector.connector_name,
      source_tap: testConnector.source_tap,
      target: testConnector.target,
      configuration: testConnector.configuration
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateConnector', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update connector name', async () => {
    const connectorId = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connectorId,
      connector_name: 'Updated Connector Name'
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connectorId);
    expect(result.connector_name).toEqual('Updated Connector Name');
    expect(result.source_tap).toEqual('tap-mysql'); // Unchanged
    expect(result.target).toEqual('target-postgresql'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const connectorId = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connectorId,
      connector_name: 'Multi Update Test',
      source_tap: 'tap-postgres',
      target: 'target-snowflake',
      configuration: { host: 'new-host', port: 5432 },
      last_run_status: 'success' as const
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connectorId);
    expect(result.connector_name).toEqual('Multi Update Test');
    expect(result.source_tap).toEqual('tap-postgres');
    expect(result.target).toEqual('target-snowflake');
    expect(result.configuration).toEqual({ host: 'new-host', port: 5432 });
    expect(result.last_run_status).toEqual('success');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update last_run_timestamp', async () => {
    const connectorId = await createTestConnector();
    const testDate = new Date('2024-01-15T10:30:00Z');
    
    const updateInput: UpdateConnectorInput = {
      id: connectorId,
      last_run_timestamp: testDate,
      last_run_status: 'running' as const
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connectorId);
    expect(result.last_run_timestamp).toEqual(testDate);
    expect(result.last_run_status).toEqual('running');
  });

  it('should set last_run_timestamp to null', async () => {
    const connectorId = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connectorId,
      last_run_timestamp: null
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connectorId);
    expect(result.last_run_timestamp).toBeNull();
  });

  it('should save updates to database', async () => {
    const connectorId = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connectorId,
      connector_name: 'Database Test Update',
      configuration: { updated: true }
    };

    await updateConnector(updateInput);

    // Verify changes were persisted
    const connectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connectorId))
      .execute();

    expect(connectors).toHaveLength(1);
    expect(connectors[0].connector_name).toEqual('Database Test Update');
    expect(connectors[0].configuration).toEqual({ updated: true });
    expect(connectors[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent connector', async () => {
    const updateInput: UpdateConnectorInput = {
      id: 99999,
      connector_name: 'Non-existent'
    };

    await expect(updateConnector(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const connectorId = await createTestConnector();
    
    // Get original connector
    const originalConnector = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connectorId))
      .execute();

    const updateInput: UpdateConnectorInput = {
      id: connectorId
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connectorId);
    expect(result.connector_name).toEqual(originalConnector[0].connector_name);
    expect(result.source_tap).toEqual(originalConnector[0].source_tap);
    expect(result.target).toEqual(originalConnector[0].target);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalConnector[0].updated_at).toBe(true);
  });
});
