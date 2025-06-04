
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type Connector } from '../schema';

export const getConnectors = async (): Promise<Connector[]> => {
  try {
    const results = await db.select()
      .from(connectorsTable)
      .execute();

    return results.map(connector => ({
      ...connector,
      // Ensure configuration is properly handled as JSON object
      configuration: connector.configuration || {}
    }));
  } catch (error) {
    console.error('Failed to fetch connectors:', error);
    throw error;
  }
};
