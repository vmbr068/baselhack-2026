import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { McpCreatorService } from './mcp-creator.service.js';

@Injectable()
export class McpAgentTransportService {
  private readonly logger = new Logger(McpAgentTransportService.name);
  private readonly sessions = new Map<
    string,
    {
      transport: SSEServerTransport;
      server: Server;
      serverId: string;
    }
  >();

  constructor(
    @Inject(forwardRef(() => McpCreatorService))
    private readonly mcpCreatorService: McpCreatorService,
  ) {}

  async handleSseConnection(
    serverId: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const config = this.mcpCreatorService.getServer(serverId);
    this.logger.log(
      `Establishing MCP SSE connection for server '${config.serverId}' (${config.hotelName})`,
    );

    const transport = new SSEServerTransport(
      `/api/v1/servers/${encodeURIComponent(config.serverId)}/mcp/messages`,
      res,
    );

    const server = new Server(
      {
        name: config.hotelName,
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // ListTools handler: returns the dynamically generated tools with schemas
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const currentConfig = this.mcpCreatorService.getServer(serverId);
      return {
        tools: currentConfig.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        })),
      };
    });

    // CallTool handler: routes tool calls to McpCreatorService and formats MCP response
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: rawArgs = {} } = request.params;
      const args = (rawArgs || {}) as Record<string, any>;
      this.logger.log(
        `MCP Agent calling tool '${name}' on server '${config.serverId}'`,
      );

      const confirmedByHuman =
        typeof args.confirmed_by_human === 'boolean'
          ? args.confirmed_by_human
          : undefined;
      const confirmationToken =
        typeof args.confirmation_token === 'string'
          ? args.confirmation_token
          : undefined;

      const result = await this.mcpCreatorService.callTool(
        config.serverId,
        name,
        args,
        confirmedByHuman,
        confirmationToken,
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !result.success && result.status === 'rejected',
      };
    });

    transport.onclose = () => {
      this.logger.log(
        `MCP SSE session '${transport.sessionId}' closed for '${config.serverId}'`,
      );
      this.sessions.delete(transport.sessionId);
    };

    transport.onerror = (err) => {
      this.logger.warn(
        `MCP SSE session error for '${config.serverId}': ${err.message}`,
      );
    };

    this.sessions.set(transport.sessionId, {
      transport,
      server,
      serverId: config.serverId,
    });

    await server.connect(transport);
  }

  async handlePostMessage(
    serverId: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const sessionId = (req.query.sessionId as string) || '';
    const session = this.sessions.get(sessionId);

    if (!session) {
      res.status(404).send(`MCP Session '${sessionId}' not found or closed`);
      return;
    }

    await session.transport.handlePostMessage(req, res, req.body);
  }
}
