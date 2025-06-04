
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type UpdateConnectorInput, type Connector } from '../schema';
import { eq } from 'drizzle-orm';

export const updateConnector = async (input: UpdateConnectorInput): Promise<Connector> => {
  try {
    // Build update values object, excluding id and only including defined fields
    const updateValues: any = {};
    
    if (input.connector_name !== undefined) {
      updateValues.connector_name = input.connector_name;
    }
    
    if (input.source_tap !== undefined) {
      updateValues.source_tap = input.source_tap;
    }
    
    if (input.target !== undefined) {
      updateValues.target = input.target;
    }
    
    if (input.configuration !== undefined) {
      updateValues.configuration = input.configuration;
    }
    
    if (input.last_run_status !== undefined) {
      updateValues.last_run_status = input.last_run_status;
    }
    
    if (input.last_run_timestamp !== undefined) {
      updateValues.last_run_timestamp = input.last_run_timestamp;
    }

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // Update the connector record
    const result = await db.update(connectorsTable)
      .set(updateValues)
      .where(eq(connectorsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Connector with id ${input.id} not found`);
    }

    // Transform the result to match the Connector schema type
    const connector = result[0];
    return {
      ...connector,
      configuration: connector.configuration as Record<string, any>
    };
  } catch (error) {
    console.error('Connector update failed:', error);
    throw error;
  }
};
