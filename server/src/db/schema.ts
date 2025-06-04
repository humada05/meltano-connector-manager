
import { serial, text, pgTable, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Define the run status enum
export const runStatusEnum = pgEnum('run_status', ['success', 'failure', 'running', 'not run yet']);

export const connectorsTable = pgTable('connectors', {
  id: serial('id').primaryKey(),
  connector_name: text('connector_name').notNull().unique(),
  source_tap: text('source_tap').notNull(),
  target: text('target').notNull(),
  configuration: jsonb('configuration').notNull().default('{}'),
  last_run_status: runStatusEnum('last_run_status').notNull().default('not run yet'),
  last_run_timestamp: timestamp('last_run_timestamp'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// TypeScript types for the table schema
export type Connector = typeof connectorsTable.$inferSelect;
export type NewConnector = typeof connectorsTable.$inferInsert;

// Export all tables for proper query building
export const tables = { connectors: connectorsTable };
