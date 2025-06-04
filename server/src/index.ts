
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

import { 
  createConnectorInputSchema, 
  updateConnectorInputSchema, 
  deleteConnectorInputSchema,
  triggerSyncInputSchema
} from './schema';

import { getConnectors } from './handlers/get_connectors';
import { createConnector } from './handlers/create_connector';
import { updateConnector } from './handlers/update_connector';
import { deleteConnector } from './handlers/delete_connector';
import { getConnector } from './handlers/get_connector';
import { triggerSync } from './handlers/trigger_sync';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Get all connectors
  getConnectors: publicProcedure
    .query(() => getConnectors()),
  
  // Get single connector by ID
  getConnector: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getConnector(input.id)),
  
  // Create new connector
  createConnector: publicProcedure
    .input(createConnectorInputSchema)
    .mutation(({ input }) => createConnector(input)),
  
  // Update existing connector
  updateConnector: publicProcedure
    .input(updateConnectorInputSchema)
    .mutation(({ input }) => updateConnector(input)),
  
  // Delete connector
  deleteConnector: publicProcedure
    .input(deleteConnectorInputSchema)
    .mutation(({ input }) => deleteConnector(input)),
  
  // Trigger manual sync
  triggerSync: publicProcedure
    .input(triggerSyncInputSchema)
    .mutation(({ input }) => triggerSync(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
