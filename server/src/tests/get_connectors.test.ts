
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { getConnectors } from '../handlers/get_connectors';

describe('getConnectors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no connectors exist', async () => {
    const result = await getConnectors();

    expect(result).toEqual([]);
  });

  it('should return all connectors', async () => {
    // Create test connectors
    await db.insert(connectorsTable)
      .values([
        {
          connector_name: 'Test Connector 1',
          source_tap: 'tap-salesforce',
          target: 'target-postgres',
          configuration: { api_key: 'test123' },
          last_run_status: 'success'
        },
        {
          connector_name: 'Test Connector 2',
          source_tap: 'tap-mysql',
          target: 'target-snowflake',
          configuration: { host: 'localhost', port: 3306 },
          last_run_status: 'failure'
        }
      ])
      .execute();

    const result = await getConnectors();

    expect(result).toHaveLength(2);
    
    // Check first connector
    const connector1 = result.find(c => c.connector_name === 'Test Connector 1');
    expect(connector1).toBeDefined();
    expect(connector1!.source_tap).toEqual('tap-salesforce');
    expect(connector1!.target).toEqual('target-postgres');
    expect(connector1!.configuration).toEqual({ api_key: 'test123' });
    expect(connector1!.last_run_status).toEqual('success');
    expect(connector1!.id).toBeDefined();
    expect(connector1!.created_at).toBeInstanceOf(Date);
    expect(connector1!.updated_at).toBeInstanceOf(Date);

    // Check second connector
    const connector2 = result.find(c => c.connector_name === 'Test Connector 2');
    expect(connector2).toBeDefined();
    expect(connector2!.source_tap).toEqual('tap-mysql');
    expect(connector2!.target).toEqual('target-snowflake');
    expect(connector2!.configuration).toEqual({ host: 'localhost', port: 3306 });
    expect(connector2!.last_run_status).toEqual('failure');
  });

  it('should handle connectors with null last_run_timestamp', async () => {
    await db.insert(connectorsTable)
      .values({
        connector_name: 'Never Run Connector',
        source_tap: 'tap-github',
        target: 'target-bigquery',
        configuration: {},
        last_run_status: 'not run yet',
        last_run_timestamp: null
      })
      .execute();

    const result = await getConnectors();

    expect(result).toHaveLength(1);
    expect(result[0].last_run_timestamp).toBeNull();
    expect(result[0].last_run_status).toEqual('not run yet');
    expect(result[0].configuration).toEqual({});
  });

  it('should handle connectors with complex configuration objects', async () => {
    const complexConfig = {
      database: {
        host: 'localhost',
        port: 5432,
        name: 'mydb'
      },
      auth: {
        username: 'user',
        password: 'pass'
      },
      options: ['ssl', 'compress'],
      timeout: 30000
    };

    await db.insert(connectorsTable)
      .values({
        connector_name: 'Complex Config Connector',
        source_tap: 'tap-postgres',
        target: 'target-s3',
        configuration: complexConfig,
        last_run_status: 'running'
      })
      .execute();

    const result = await getConnectors();

    expect(result).toHaveLength(1);
    expect(result[0].configuration).toEqual(complexConfig);
    expect(result[0].last_run_status).toEqual('running');
  });
});
