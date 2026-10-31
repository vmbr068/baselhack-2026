import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { ScannerService } from './scanner.service.js';
import { SynthesizerService } from './synthesizer.service.js';
import { ExecutorService } from './executor.service.js';
import { WordpressEnricherService } from './enrichers/wordpress-enricher.service.js';
import { GithubEnricherService } from './enrichers/github-enricher.service.js';
import {
  MCPServerConfig,
  WebScanResult,
  GenerateResponse,
  ToolCallResponse,
  EnrichResponse,
  AuthSessionData,
} from './mcp-creator.types.js';

@Injectable()
export class McpCreatorService implements OnModuleInit {
  private readonly logger = new Logger(McpCreatorService.name);
  private readonly serversStore = new Map<string, MCPServerConfig>();
  private readonly serversDir = path.resolve(
    process.cwd(),
    'generated_servers',
  );

  constructor(
    private readonly scanner: ScannerService,
    private readonly synthesizer: SynthesizerService,
    private readonly executor: ExecutorService,
    private readonly wpEnricher: WordpressEnricherService,
    private readonly ghEnricher: GithubEnricherService,
  ) {}

  async onModuleInit() {
    await fs.mkdir(this.serversDir, { recursive: true });
    await this.loadPersistedServers();
  }

  private async loadPersistedServers() {
    try {
      const files = await fs.readdir(this.serversDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.serversDir, file);
          const raw = await fs.readFile(filePath, 'utf-8');
          const config: MCPServerConfig = JSON.parse(raw);
          this.serversStore.set(config.serverId, config);
        }
      }
      this.logger.log(
        `Loaded ${this.serversStore.size} persisted MCP servers from disk`,
      );
    } catch (err: any) {
      this.logger.warn(`Could not load servers from disk: ${err.message}`);
    }
  }

  private async persistServer(config: MCPServerConfig) {
    this.serversStore.set(config.serverId, config);
    const filePath = path.join(this.serversDir, `${config.serverId}.json`);
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
  }

  async scanWebsite(
    url: string,
    authSession?: AuthSessionData | string,
  ): Promise<WebScanResult> {
    return this.scanner.scanWebsite(url, authSession);
  }

  async generate(
    url: string,
    authSession?: AuthSessionData | string,
  ): Promise<GenerateResponse> {
    const scanResult = await this.scanner.scanWebsite(url, authSession);
    const config = this.synthesizer.synthesizeMCPServer(scanResult);

    if (authSession) {
      config.authSession =
        typeof authSession === 'string' ? JSON.parse(authSession) : authSession;
    }

    await this.persistServer(config);

    return {
      server_id: config.serverId,
      hotel_name: config.hotelName,
      target_url: config.targetUrl,
      tools: config.tools,
      call_endpoint: `/api/v1/servers/${config.serverId}/call`,
      has_auth_session: Boolean(config.authSession),
      mcp_schema: {
        name: config.hotelName,
        server_id: config.serverId,
        tools: config.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.parameters,
        })),
      },
    };
  }

  listServers(): MCPServerConfig[] {
    return Array.from(this.serversStore.values());
  }

  getServer(serverId: string): MCPServerConfig {
    if (this.serversStore.has(serverId)) {
      return this.serversStore.get(serverId)!;
    }

    if (serverId === 'latest' && this.serversStore.size > 0) {
      const all = Array.from(this.serversStore.values());
      return all[all.length - 1];
    }

    // Try substring matching
    for (const [key, val] of this.serversStore.entries()) {
      if (key.includes(serverId)) return val;
    }

    throw new NotFoundException(
      `Server ID '${serverId}' not found. Available servers: ${Array.from(this.serversStore.keys()).join(', ') || 'None (run /api/v1/generate first)'}`,
    );
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, any> = {},
    confirmedByHuman?: boolean,
    confirmationToken?: string,
    authSession?: AuthSessionData | string,
  ): Promise<ToolCallResponse> {
    const config = this.getServer(serverId);
    return this.executor.executeTool(
      config,
      toolName,
      args,
      confirmedByHuman,
      confirmationToken,
      authSession,
    );
  }

  async enrichWithWordpress(
    serverId: string,
    customWpUrl?: string,
  ): Promise<EnrichResponse> {
    const config = this.getServer(serverId);
    const { enrichedConfig, summary } =
      await this.wpEnricher.enrichWithWordpress(config, customWpUrl);
    await this.persistServer(enrichedConfig);

    return {
      server_id: enrichedConfig.serverId,
      hotel_name: enrichedConfig.hotelName,
      source: 'wordpress',
      enriched_tools_count: enrichedConfig.tools.length,
      tools: enrichedConfig.tools,
      summary,
    };
  }

  async enrichWithGithub(
    serverId: string,
    repoUrl: string,
    branch = 'main',
    githubToken?: string,
  ): Promise<EnrichResponse> {
    const config = this.getServer(serverId);
    const { enrichedConfig, summary } = await this.ghEnricher.enrichWithGithub(
      config,
      repoUrl,
      branch,
      githubToken,
    );
    await this.persistServer(enrichedConfig);

    return {
      server_id: enrichedConfig.serverId,
      hotel_name: enrichedConfig.hotelName,
      source: 'github',
      enriched_tools_count: enrichedConfig.tools.length,
      tools: enrichedConfig.tools,
      summary,
    };
  }
}
