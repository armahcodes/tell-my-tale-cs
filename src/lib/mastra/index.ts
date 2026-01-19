import { Mastra } from '@mastra/core';
import { customerSuccessAgent } from './agents/customer-success-agent';

export const mastra = new Mastra({
  agents: {
    customerSuccess: customerSuccessAgent,
  },
});
