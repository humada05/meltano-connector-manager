
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

    // Convert the database result to match our schema type
    const connector = result[0];
    return {
      ...connector,
      configuration: connector.configuration as Record<string, any>
    };
  } catch (error) {
    console.error('Connector creation failed:', error);
    throw error;
  }
};
