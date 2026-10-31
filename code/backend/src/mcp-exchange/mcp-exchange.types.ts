import type {
  MCPServerConfig,
  MCPToolDefinition,
} from '../mcp-creator/mcp-creator.types.js';

export interface ExchangeVersion {
  version: number;
  publishedAt: string;
  description?: string;
  server: MCPServerConfig;
}

export interface ExchangeEntry {
  entryId: string;
  sourceUrl: string;
  siteTitle: string;
  createdAt: string;
  versions: ExchangeVersion[];
}

export interface PublishedVersionSummary {
  version: number;
  published_at: string;
  description?: string;
  server_id: string;
  tools: MCPToolDefinition[];
  call_endpoint: string;
}

export interface PublishResponse {
  entry_id: string;
  source_url: string;
  site_title: string;
  latest_version: number;
  versions: PublishedVersionSummary[];
}

export interface ExchangeEntrySummary {
  entry_id: string;
  source_url: string;
  site_title: string;
  description?: string;
  latest_version: number;
  versions_count: number;
  published_at: string;
  tool_names: string[];
}

export interface ExchangeVersionResponse extends PublishedVersionSummary {
  entry_id: string;
  source_url: string;
  site_title: string;
}

export interface ExchangeConnectionResponse {
  entry_id: string;
  version: number;
  server_id: string;
  site_title: string;
  available: boolean;
  transports: {
    sse_url: string;
    messages_url: string;
    stdio: {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  };
  claude_config: {
    mcpServers: Record<string, { type: 'sse'; url: string }>;
  };
}
