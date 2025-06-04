
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput, type UpdateConnectorInput } from '../schema';
import { updateConnector } from '../handlers/update_connector';
import { eq } from 'drizzle-orm';

// Test data
const createTestConnector = async () => {
  const result = await db.insert(connectorsTable)
    .values({
      connector_name: 'Test Connector',
      source_tap: 'tap-mysql',
      target: 'target-postgres',
      configuration: { host: 'localhost', port: 3306 },
      last_run_status: 'not run yet',
      last_run_timestamp: null
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateConnector', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update connector name', async () => {
    const connector = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connector.id,
      connector_name: 'Updated Connector Name'
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connector.id);
    expect(result.connector_name).toEqual('Updated Connector Name');
    expect(result.source_tap).toEqual('tap-mysql'); // Should remain unchanged
    expect(result.target).toEqual('target-postgres'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > connector.updated_at).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const connector = await createTestConnector();
    
    const newTimestamp = new Date('2023-01-01T00:00:00Z');
    const updateInput: UpdateConnectorInput = {
      id: connector.id,
      connector_name: 'Multi-field Update',
      source_tap: 'tap-postgres',
      target: 'target-snowflake',
      configuration: { host: 'remote.server.com', port: 5432, ssl: true },
      last_run_status: 'success',
      last_run_timestamp: newTimestamp
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connector.id);
    expect(result.connector_name).toEqual('Multi-field Update');
    expect(result.source_tap).toEqual('tap-postgres');
    expect(result.target).toEqual('target-snowflake');
    expect(result.configuration).toEqual({ host: 'remote.server.com', port: 5432, ssl: true });
    expect(result.last_run_status).toEqual('success');
    expect(result.last_run_timestamp).toEqual(newTimestamp);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update configuration only', async () => {
    const connector = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connector.id,
      configuration: { database: 'new_db', schema: 'public' }
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connector.id);
    expect(result.connector_name).toEqual('Test Connector'); // Should remain unchanged
    expect(result.configuration).toEqual({ database: 'new_db', schema: 'public' });
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update last_run_timestamp to null', async () => {
    const connector = await createTestConnector();
    
    // First set a timestamp
    await updateConnector({
      id: connector.id,
      last_run_timestamp: new Date()
    });

    // Then set it to null
    const updateInput: UpdateConnectorInput = {
      id: connector.id,
      last_run_timestamp: null
    };

    const result = await updateConnector(updateInput);

    expect(result.id).toEqual(connector.id);
    expect(result.last_run_timestamp).toBeNull();
  });

  it('should save updated connector to database', async () => {
    const connector = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connector.id,
      connector_name: 'Database Test Update',
      last_run_status: 'failure'
    };

    const result = await updateConnector(updateInput);

    // Verify in database
    const dbConnectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connector.id))
      .execute();

    expect(dbConnectors).toHaveLength(1);
    expect(dbConnectors[0].connector_name).toEqual('Database Test Update');
    expect(dbConnectors[0].last_run_status).toEqual('failure');
    expect(dbConnectors[0].updated_at).toBeInstanceOf(Date);
    expect(dbConnectors[0].updated_at > connector.updated_at).toBe(true);
  });

  it('should throw error for non-existent connector', async () => {
    const updateInput: UpdateConnectorInput = {
      id: 99999,
      connector_name: 'Non-existent Connector'
    };

    await expect(updateConnector(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const connector = await createTestConnector();
    
    const updateInput: UpdateConnectorInput = {
      id: connector.id
    };

    const result = await updateConnector(updateInput);

    // Should only update the updated_at timestamp
    expect(result.id).toEqual(connector.id);
    expect(result.connector_name).toEqual(connector.connector_name);
    expect(result.source_tap).toEqual(connector.source_tap);
    expect(result.target).toEqual(connector.target);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > connector.updated_at).toBe(true);
  });
});
