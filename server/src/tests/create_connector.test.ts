
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput } from '../schema';
import { createConnector } from '../handlers/create_connector';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateConnectorInput = {
  connector_name: 'Test Connector',
  source_tap: 'tap-postgres',
  target: 'target-snowflake',
  configuration: { host: 'localhost', port: 5432 }
};

describe('createConnector', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a connector', async () => {
    const result = await createConnector(testInput);

    // Basic field validation
    expect(result.connector_name).toEqual('Test Connector');
    expect(result.source_tap).toEqual('tap-postgres');
    expect(result.target).toEqual('target-snowflake');
    expect(result.configuration).toEqual({ host: 'localhost', port: 5432 });
    expect(result.last_run_status).toEqual('not run yet');
    expect(result.last_run_timestamp).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save connector to database', async () => {
    const result = await createConnector(testInput);

    // Query using proper drizzle syntax
    const connectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, result.id))
      .execute();

    expect(connectors).toHaveLength(1);
    expect(connectors[0].connector_name).toEqual('Test Connector');
    expect(connectors[0].source_tap).toEqual('tap-postgres');
    expect(connectors[0].target).toEqual('target-snowflake');
    expect(connectors[0].configuration).toEqual({ host: 'localhost', port: 5432 });
    expect(connectors[0].last_run_status).toEqual('not run yet');
    expect(connectors[0].created_at).toBeInstanceOf(Date);
    expect(connectors[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create connector with default empty configuration', async () => {
    const inputWithoutConfig: CreateConnectorInput = {
      connector_name: 'Simple Connector',
      source_tap: 'tap-csv',
      target: 'target-postgres',
      configuration: {} // Zod default
    };

    const result = await createConnector(inputWithoutConfig);

    expect(result.connector_name).toEqual('Simple Connector');
    expect(result.configuration).toEqual({});
  });

  it('should enforce unique connector names', async () => {
    // Create first connector
    await createConnector(testInput);

    // Try to create another with same name
    await expect(createConnector(testInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});
