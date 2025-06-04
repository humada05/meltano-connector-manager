
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type UpdateConnectorInput, type Connector } from '../schema';
import { eq } from 'drizzle-orm';

export const updateConnector = async (input: UpdateConnectorInput): Promise<Connector> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.connector_name !== undefined) {
      updateData.connector_name = input.connector_name;
    }
    
    if (input.source_tap !== undefined) {
      updateData.source_tap = input.source_tap;
    }
    
    if (input.target !== undefined) {
      updateData.target = input.target;
    }
    
    if (input.configuration !== undefined) {
      updateData.configuration = input.configuration;
    }
    
    if (input.last_run_status !== undefined) {
      updateData.last_run_status = input.last_run_status;
    }
    
    if (input.last_run_timestamp !== undefined) {
      updateData.last_run_timestamp = input.last_run_timestamp;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update connector record
    const result = await db.update(connectorsTable)
      .set(updateData)
      .where(eq(connectorsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Connector with id ${input.id} not found`);
    }

    // Type assertion to handle the configuration type mismatch
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
