
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput } from '../schema';
import { getConnectors } from '../handlers/get_connectors';

const testConnector1: CreateConnectorInput = {
  connector_name: 'Test Connector 1',
  source_tap: 'tap-postgres',
  target: 'target-postgres',
  configuration: { host: 'localhost', port: 5432 }
};

const testConnector2: CreateConnectorInput = {
  connector_name: 'Test Connector 2',
  source_tap: 'tap-mysql',
  target: 'target-mysql',
  configuration: { host: 'mysql.example.com', port: 3306 }
};

describe('getConnectors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no connectors exist', async () => {
    const result = await getConnectors();
    
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(0);
  });

  it('should return all connectors', async () => {
    // Create test connectors
    await db.insert(connectorsTable)
      .values([
        {
          connector_name: testConnector1.connector_name,
          source_tap: testConnector1.source_tap,
          target: testConnector1.target,
          configuration: testConnector1.configuration
        },
        {
          connector_name: testConnector2.connector_name,
          source_tap: testConnector2.source_tap,
          target: testConnector2.target,
          configuration: testConnector2.configuration
        }
      ])
      .execute();

    const result = await getConnectors();

    expect(result).toHaveLength(2);
    
    // Check first connector
    const connector1 = result.find(c => c.connector_name === 'Test Connector 1');
    expect(connector1).toBeDefined();
    expect(connector1!.source_tap).toEqual('tap-postgres');
    expect(connector1!.target).toEqual('target-postgres');
    expect(connector1!.configuration).toEqual({ host: 'localhost', port: 5432 });
    expect(connector1!.last_run_status).toEqual('not run yet');
    expect(connector1!.last_run_timestamp).toBeNull();
    expect(connector1!.id).toBeDefined();
    expect(connector1!.created_at).toBeInstanceOf(Date);
    expect(connector1!.updated_at).toBeInstanceOf(Date);

    // Check second connector
    const connector2 = result.find(c => c.connector_name === 'Test Connector 2');
    expect(connector2).toBeDefined();
    expect(connector2!.source_tap).toEqual('tap-mysql');
    expect(connector2!.target).toEqual('target-mysql');
    expect(connector2!.configuration).toEqual({ host: 'mysql.example.com', port: 3306 });
    expect(connector2!.last_run_status).toEqual('not run yet');
    expect(connector2!.last_run_timestamp).toBeNull();
  });

  it('should return connectors with different run statuses', async () => {
    const now = new Date();
    
    // Create connectors with different statuses
    await db.insert(connectorsTable)
      .values([
        {
          connector_name: 'Success Connector',
          source_tap: 'tap-csv',
          target: 'target-postgres',
          configuration: {},
          last_run_status: 'success',
          last_run_timestamp: now
        },
        {
          connector_name: 'Failed Connector',
          source_tap: 'tap-api',
          target: 'target-snowflake',
          configuration: {},
          last_run_status: 'failure',
          last_run_timestamp: now
        },
        {
          connector_name: 'Running Connector',
          source_tap: 'tap-salesforce',
          target: 'target-bigquery',
          configuration: {},
          last_run_status: 'running',
          last_run_timestamp: now
        }
      ])
      .execute();

    const result = await getConnectors();

    expect(result).toHaveLength(3);
    
    const successConnector = result.find(c => c.connector_name === 'Success Connector');
    expect(successConnector!.last_run_status).toEqual('success');
    expect(successConnector!.last_run_timestamp).toBeInstanceOf(Date);

    const failedConnector = result.find(c => c.connector_name === 'Failed Connector');
    expect(failedConnector!.last_run_status).toEqual('failure');
    expect(failedConnector!.last_run_timestamp).toBeInstanceOf(Date);

    const runningConnector = result.find(c => c.connector_name === 'Running Connector');
    expect(runningConnector!.last_run_status).toEqual('running');
    expect(runningConnector!.last_run_timestamp).toBeInstanceOf(Date);
  });
});
