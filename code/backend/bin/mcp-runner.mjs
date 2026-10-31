#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const baseUrl = process.env.MCP_BACKEND_URL || 'http://localhost:3000';
const serverId = process.argv[2] || process.env.MCP_SERVER_ID || 'latest';

async function fetchServerConfig() {
  const res = await fetch(
    `${baseUrl}/api/v1/servers/${encodeURIComponent(serverId)}`,
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch MCP config from ${baseUrl}: ${res.statusText}`,
    );
  }
  return res.json();
}

async function main() {
  const server = new Server(
    {
      name: `MCP Runner (${serverId})`,
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const config = await fetchServerConfig();
    return {
      tools: (config.tools || []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.parameters || { type: 'object', properties: {} },
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const res = await fetch(
      `${baseUrl}/api/v1/servers/${encodeURIComponent(serverId)}/call`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: request.params.name,
          arguments: request.params.arguments || {},
          confirmed_by_human:
            request.params.arguments?.confirmed_by_human ?? true,
          confirmation_token: request.params.arguments?.confirmation_token,
        }),
      },
    );

    const data = await res.json();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
      isError: !data.success && data.status === 'rejected',
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Failed to start MCP Stdio runner:', err);
  process.exit(1);
});
