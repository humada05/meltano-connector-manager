
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput } from '../schema';
import { getConnector } from '../handlers/get_connector';

// Test connector data
const testConnector: CreateConnectorInput = {
  connector_name: 'Test Connector',
  source_tap: 'tap-salesforce',
  target: 'target-postgres',
  configuration: { api_key: 'test123', endpoint: 'https://api.test.com' }
};

describe('getConnector', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a connector by id', async () => {
    // Create test connector
    const inserted = await db.insert(connectorsTable)
      .values({
        connector_name: testConnector.connector_name,
        source_tap: testConnector.source_tap,
        target: testConnector.target,
        configuration: testConnector.configuration
      })
      .returning()
      .execute();

    const connectorId = inserted[0].id;

    // Get the connector
    const result = await getConnector(connectorId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(connectorId);
    expect(result!.connector_name).toEqual('Test Connector');
    expect(result!.source_tap).toEqual('tap-salesforce');
    expect(result!.target).toEqual('target-postgres');
    expect(result!.configuration).toEqual({ api_key: 'test123', endpoint: 'https://api.test.com' });
    expect(result!.last_run_status).toEqual('not run yet');
    expect(result!.last_run_timestamp).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent connector', async () => {
    const result = await getConnector(999);
    expect(result).toBeNull();
  });

  it('should return connector with last_run_timestamp when present', async () => {
    const testTimestamp = new Date('2024-01-15T10:30:00Z');
    
    // Create connector with timestamp
    const inserted = await db.insert(connectorsTable)
      .values({
        connector_name: testConnector.connector_name,
        source_tap: testConnector.source_tap,
        target: testConnector.target,
        configuration: testConnector.configuration,
        last_run_status: 'success',
        last_run_timestamp: testTimestamp
      })
      .returning()
      .execute();

    const connectorId = inserted[0].id;

    // Get the connector
    const result = await getConnector(connectorId);

    expect(result).not.toBeNull();
    expect(result!.last_run_status).toEqual('success');
    expect(result!.last_run_timestamp).toBeInstanceOf(Date);
    expect(result!.last_run_timestamp!.getTime()).toEqual(testTimestamp.getTime());
  });
});
