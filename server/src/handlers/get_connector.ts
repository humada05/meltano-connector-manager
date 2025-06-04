
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type Connector } from '../schema';
import { eq } from 'drizzle-orm';

export const getConnector = async (id: number): Promise<Connector | null> => {
  try {
    const result = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const connector = result[0];
    return {
      ...connector,
      configuration: connector.configuration as Record<string, any>,
      last_run_timestamp: connector.last_run_timestamp
    };
  } catch (error) {
    console.error('Get connector failed:', error);
    throw error;
  }
};
