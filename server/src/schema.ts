
import { z } from 'zod';

// Enum for last run status
export const runStatusSchema = z.enum(['success', 'failure', 'running', 'not run yet']);
export type RunStatus = z.infer<typeof runStatusSchema>;

// Connector schema
export const connectorSchema = z.object({
  id: z.number(),
  connector_name: z.string(),
  source_tap: z.string(),
  target: z.string(),
  configuration: z.record(z.any()), // JSON object
  last_run_status: runStatusSchema,
  last_run_timestamp: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Connector = z.infer<typeof connectorSchema>;

// Input schema for creating connectors
export const createConnectorInputSchema = z.object({
  connector_name: z.string().min(1, "Connector name is required"),
  source_tap: z.string().min(1, "Source tap is required"),
  target: z.string().min(1, "Target is required"),
  configuration: z.record(z.any()).default({})
});

export type CreateConnectorInput = z.infer<typeof createConnectorInputSchema>;

// Input schema for updating connectors
export const updateConnectorInputSchema = z.object({
  id: z.number(),
  connector_name: z.string().min(1).optional(),
  source_tap: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  configuration: z.record(z.any()).optional(),
  last_run_status: runStatusSchema.optional(),
  last_run_timestamp: z.coerce.date().nullable().optional()
});

export type UpdateConnectorInput = z.infer<typeof updateConnectorInputSchema>;

// Input schema for deleting connectors
export const deleteConnectorInputSchema = z.object({
  id: z.number()
});

export type DeleteConnectorInput = z.infer<typeof deleteConnectorInputSchema>;

// Input schema for triggering manual sync
export const triggerSyncInputSchema = z.object({
  id: z.number()
});

export type TriggerSyncInput = z.infer<typeof triggerSyncInputSchema>;

// Response schema for sync trigger
export const syncResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export type SyncResponse = z.infer<typeof syncResponseSchema>;
