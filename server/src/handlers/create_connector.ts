
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type CreateConnectorInput, type Connector } from '../schema';

export const createConnector = async (input: CreateConnectorInput): Promise<Connector> => {
  try {
    // Insert connector record
    const result = await db.insert(connectorsTable)
      .values({
        connector_name: input.connector_name,
        source_tap: input.source_tap,
        target: input.target,
        configuration: input.configuration
      })
      .returning()
      .execute();

    // Type assertion to handle the configuration field type mismatch
    return {
      ...result[0],
      configuration: result[0].configuration as Record<string, any>
    };
  } catch (error) {
    console.error('Connector creation failed:', error);
    throw error;
  }
};
