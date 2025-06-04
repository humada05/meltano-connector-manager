
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput, type DeleteConnectorInput } from '../schema';
import { deleteConnector } from '../handlers/delete_connector';
import { eq } from 'drizzle-orm';

// Test input for creating a connector to delete
const testConnectorInput: CreateConnectorInput = {
  connector_name: 'Test Connector',
  source_tap: 'tap-postgres',
  target: 'target-snowflake',
  configuration: { host: 'localhost', port: 5432 }
};

describe('deleteConnector', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing connector', async () => {
    // Create a connector first
    const createdConnectors = await db.insert(connectorsTable)
      .values({
        connector_name: testConnectorInput.connector_name,
        source_tap: testConnectorInput.source_tap,
        target: testConnectorInput.target,
        configuration: testConnectorInput.configuration
      })
      .returning()
      .execute();

    const connectorId = createdConnectors[0].id;

    // Delete the connector
    const deleteInput: DeleteConnectorInput = { id: connectorId };
    const result = await deleteConnector(deleteInput);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify connector no longer exists in database
    const remainingConnectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connectorId))
      .execute();

    expect(remainingConnectors).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent connector', async () => {
    const deleteInput: DeleteConnectorInput = { id: 999 };
    const result = await deleteConnector(deleteInput);

    // Should return false since no connector was deleted
    expect(result.success).toBe(false);
  });

  it('should not affect other connectors when deleting one', async () => {
    // Create two connectors
    const connector1 = await db.insert(connectorsTable)
      .values({
        connector_name: 'Connector 1',
        source_tap: 'tap-postgres',
        target: 'target-snowflake',
        configuration: {}
      })
      .returning()
      .execute();

    const connector2 = await db.insert(connectorsTable)
      .values({
        connector_name: 'Connector 2',
        source_tap: 'tap-mysql',
        target: 'target-redshift',
        configuration: {}
      })
      .returning()
      .execute();

    // Delete first connector
    const deleteInput: DeleteConnectorInput = { id: connector1[0].id };
    const result = await deleteConnector(deleteInput);

    expect(result.success).toBe(true);

    // Verify second connector still exists
    const remainingConnectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, connector2[0].id))
      .execute();

    expect(remainingConnectors).toHaveLength(1);
    expect(remainingConnectors[0].connector_name).toEqual('Connector 2');
  });
});
