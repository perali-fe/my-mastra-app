
import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
// import { LibSQLStore } from '@mastra/libsql';
import { crAgent } from "./agents/crAgent";
import { CloudflareDeployer } from '@mastra/deployer-cloudflare';

import { weatherAgent } from './agents';

export const mastra = new Mastra({
  agents: { weatherAgent, crAgent },
  // storage: new LibSQLStore({
  //   // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
  //   url: ":memory:",
  // }),
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
  deployer: new CloudflareDeployer({
    scope: process.env.CLOUDFLARE_ACCOUNT_ID || '',  // 您的 Cloudflare 账户 ID
    projectName: 'mastra-workers',     // 您的项目名称
    auth: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      apiEmail: 'lipeijuan0520@gmail.com',
    }
  }),
});
