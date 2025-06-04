
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput } from '../schema';
import { getConnector } from '../handlers/get_connector';

// Test connector data
const testConnector: CreateConnectorInput = {
  connector_name: 'Test Connector',
  source_tap: 'tap-mysql',
  target: 'target-postgres',
  configuration: { host: 'localhost', port: 3306 }
};

describe('getConnector', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return connector when it exists', async () => {
    // Create test connector
    const created = await db.insert(connectorsTable)
      .values({
        connector_name: testConnector.connector_name,
        source_tap: testConnector.source_tap,
        target: testConnector.target,
        configuration: testConnector.configuration
      })
      .returning()
      .execute();

    const createdConnector = created[0];

    // Get the connector
    const result = await getConnector(createdConnector.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdConnector.id);
    expect(result!.connector_name).toEqual('Test Connector');
    expect(result!.source_tap).toEqual('tap-mysql');
    expect(result!.target).toEqual('target-postgres');
    expect(result!.configuration).toEqual({ host: 'localhost', port: 3306 });
    expect(result!.last_run_status).toEqual('not run yet');
    expect(result!.last_run_timestamp).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when connector does not exist', async () => {
    const result = await getConnector(999);
    expect(result).toBeNull();
  });

  it('should return connector with all timestamp fields properly handled', async () => {
    // Create connector with timestamp
    const testDate = new Date('2024-01-01T10:00:00Z');
    
    const created = await db.insert(connectorsTable)
      .values({
        connector_name: testConnector.connector_name,
        source_tap: testConnector.source_tap,
        target: testConnector.target,
        configuration: testConnector.configuration,
        last_run_timestamp: testDate,
        last_run_status: 'success'
      })
      .returning()
      .execute();

    const result = await getConnector(created[0].id);

    expect(result).not.toBeNull();
    expect(result!.last_run_timestamp).toBeInstanceOf(Date);
    expect(result!.last_run_status).toEqual('success');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});
