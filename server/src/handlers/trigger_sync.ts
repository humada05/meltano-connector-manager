
import { db } from '../db';
import { connectorsTable } from '../db/schema';
import { type TriggerSyncInput, type SyncResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const triggerSync = async (input: TriggerSyncInput): Promise<SyncResponse> => {
  try {
    // Check if connector exists
    const connectors = await db.select()
      .from(connectorsTable)
      .where(eq(connectorsTable.id, input.id))
      .execute();

    if (connectors.length === 0) {
      return {
        success: false,
        message: 'Connector not found'
      };
    }

    const connector = connectors[0];

    // Check if connector is already running
    if (connector.last_run_status === 'running') {
      return {
        success: false,
        message: 'Connector is already running'
      };
    }

    // Update connector status to running
    await db
      .update(connectorsTable)
      .set({
        last_run_status: 'running',
        last_run_timestamp: new Date(),
        updated_at: new Date()
      })
      .where(eq(connectorsTable.id, input.id))
      .execute();

    return {
      success: true,
      message: 'Sync triggered successfully'
    };
  } catch (error) {
    console.error('Sync trigger failed:', error);
    throw error;
  }
};
