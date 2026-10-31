import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { chromium } from 'playwright';
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
          config.enabled ??= true;
          config.tools = config.tools.map((tool) => ({ ...tool, enabled: tool.enabled ?? true }));
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
    config.enabled ??= true;
    config.tools = config.tools.map((tool) => ({ ...tool, enabled: tool.enabled ?? true }));
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

  async interactiveLogin(
    url: string,
    timeoutMs = 120000,
  ): Promise<{ auth_session: AuthSessionData; message: string }> {
    const isHeadless =
      process.env.PLAYWRIGHT_HEADLESS === 'true' ||
      (process.platform !== 'darwin' && !process.env.DISPLAY);

    this.logger.log(
      `Launching interactive login for ${url} (headless: ${isHeadless})`,
    );

    const browser = await chromium.launch({
      headless: isHeadless,
      executablePath: process.env.CHROMIUM_PATH,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Inject a top banner informing the user with a button to validate
    await page.addInitScript(() => {
      window.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('mcpex-login-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'mcpex-login-banner';
        banner.style.cssText =
          'position:fixed;top:0;left:0;right:0;background:#0f172a;color:#f8fafc;padding:12px 24px;text-align:center;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;z-index:2147483647;box-shadow:0 4px 20px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #3b82f6;';
        banner.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-weight:700;color:#60a5fa;letter-spacing:0.5px;">MCPEX SANDBOX</span>
            <span style="color:#64748b;">|</span>
            <span style="color:#e2e8f0;font-size:13px;">Connectez-vous sur ce site avec vos identifiants ou SSO. Une fois connecté, cliquez sur le bouton vert :</span>
          </div>
          <button id="mcpex-done-btn" style="background:#22c55e;color:white;border:none;border-radius:20px;padding:8px 20px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(34,197,94,0.4);transition:all 0.2s;">
            <span>Valider ma connexion & Continuer ✓</span>
          </button>
        `;
        document.body.prepend(banner);

        document.getElementById('mcpex-done-btn')?.addEventListener('click', () => {
          (window as any).__mcpex_auth_done = true;
          const btn = document.getElementById('mcpex-done-btn');
          if (btn) {
            btn.style.background = '#15803d';
            btn.innerText = 'Connexion validée ! Capture en cours...';
          }
        });
      });
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e: any) {
      this.logger.warn(`Interactive login navigation error: ${e.message}`);
    }

    const start = Date.now();
    let authenticated = false;

    while (Date.now() - start < timeoutMs) {
      if (page.isClosed()) {
        authenticated = true;
        break;
      }

      // Check if user clicked the "Valider ma connexion" button
      const userClickedDone = await page
        .evaluate(() => (window as any).__mcpex_auth_done === true)
        .catch(() => false);

      if (userClickedDone) {
        this.logger.log(`User clicked Valider for ${url}`);
        authenticated = true;
        await page.waitForTimeout(1000);
        break;
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    const storageState = (await context
      .storageState()
      .catch(() => ({}))) as AuthSessionData;
    await browser.close().catch(() => {});

    return {
      auth_session: storageState,
      message: authenticated
        ? 'Authentication captured successfully'
        : 'Session captured',
    };
  }

  async generateInteractive(
    url: string,
    timeoutMs = 60000,
  ): Promise<GenerateResponse> {
    const { auth_session } = await this.interactiveLogin(url, timeoutMs);
    return this.generate(url, auth_session);
  }

  async generate(
    url: string,
    authSession?: AuthSessionData | string,
  ): Promise<GenerateResponse> {
    const scanResult = await this.scanner.scanWebsite(url, authSession);
    const config = this.synthesizer.synthesizeMCPServer(scanResult);

    if (scanResult.screenshotPath) {
      config.scanSummary.screenshotPath = scanResult.screenshotPath;
      config.scanSummary.screenshot_url = `/static/screenshots/${scanResult.screenshotPath}`;
    }

    // If a server already exists for this exact target URL, replace it inplace
    const normalizedTargetUrl = url.replace(/\/+$/, '').toLowerCase();
    const existingEntry = Array.from(this.serversStore.entries()).find(
      ([, server]) =>
        server.targetUrl?.replace(/\/+$/, '').toLowerCase() ===
        normalizedTargetUrl,
    );

    if (existingEntry) {
      const [existingServerId, existingServer] = existingEntry;
      // Retain the existing serverId so existing connections & bookmarks remain valid
      config.serverId = existingServerId;
      config.enabled = existingServer.enabled ?? true;
      if (existingServer.codebaseEnrichment) {
        config.codebaseEnrichment = existingServer.codebaseEnrichment;
      }
      this.logger.log(
        `Replacing existing MCP server '${existingServerId}' for target URL '${url}'`,
      );
    }

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
      screenshot_url: scanResult.screenshotPath
        ? `/static/screenshots/${scanResult.screenshotPath}`
        : null,
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
    if (config.enabled === false) {
      return { tool_name: toolName, success: false, data: {}, error: `MCP server '${config.hotelName}' is disabled` };
    }
    return this.executor.executeTool(
      config,
      toolName,
      args,
      confirmedByHuman,
      confirmationToken,
      authSession,
    );
  }

  async setServerEnabled(serverId: string, enabled: boolean): Promise<MCPServerConfig> {
    const config = this.getServer(serverId);
    config.enabled = enabled;
    await this.persistServer(config);
    return config;
  }

  async setToolEnabled(serverId: string, toolName: string, enabled: boolean): Promise<MCPServerConfig> {
    const config = this.getServer(serverId);
    const tool = config.tools.find((item) => item.name === toolName);
    if (!tool) {
      throw new NotFoundException(`Tool '${toolName}' not found in MCP server '${config.hotelName}'`);
    }
    tool.enabled = enabled;
    await this.persistServer(config);
    return config;
  }

  async enrichWithWordpress(
    serverId: string,
    customWpUrl?: string,
    accessToken?: string,
    wpSiteId?: string,
  ): Promise<EnrichResponse> {
    const config = this.getServer(serverId);
    const { enrichedConfig, summary } =
      await this.wpEnricher.enrichWithWordpress(config, customWpUrl, accessToken, wpSiteId);
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
