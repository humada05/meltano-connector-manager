
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type DeleteConnectorInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteConnector = async (input: DeleteConnectorInput): Promise<{ success: boolean }> => {
  try {
    // Delete the connector record
    const result = await db.delete(connectorsTable)
      .where(eq(connectorsTable.id, input.id))
      .execute();

    // Check if any rows were affected (connector existed and was deleted)
    return { success: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    console.error('Connector deletion failed:', error);
    throw error;
  }
};
