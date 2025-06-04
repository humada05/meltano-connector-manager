
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type Connector } from '../schema';

export const getConnectors = async (): Promise<Connector[]> => {
  try {
    const results = await db.select()
      .from(connectorsTable)
      .execute();

    // Transform results to match the expected schema type
    return results.map(result => ({
      ...result,
      configuration: result.configuration as Record<string, any>
    }));
  } catch (error) {
    console.error('Get connectors failed:', error);
    throw error;
  }
};
