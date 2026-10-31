import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { McpCreatorService } from '../mcp-creator/mcp-creator.service.js';
import type { MCPServerConfig } from '../mcp-creator/mcp-creator.types.js';
import type {
  ExchangeEntry,
  ExchangeEntrySummary,
  ExchangeVersion,
  ExchangeVersionResponse,
  PublishedVersionSummary,
  PublishResponse,
} from './mcp-exchange.types.js';

@Injectable()
export class McpExchangeService implements OnModuleInit {
  private readonly logger = new Logger(McpExchangeService.name);
  private readonly entriesStore = new Map<string, ExchangeEntry>();
  private readonly exchangeDir = path.resolve(process.cwd(), 'exchange_store');

  constructor(private readonly mcpCreator: McpCreatorService) {}

  async onModuleInit() {
    await fs.mkdir(this.exchangeDir, { recursive: true });
    await this.loadPersistedEntries();
  }

  private async loadPersistedEntries() {
    try {
      const files = await fs.readdir(this.exchangeDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const raw = await fs.readFile(
            path.join(this.exchangeDir, file),
            'utf-8',
          );
          const entry: ExchangeEntry = JSON.parse(raw);
          this.entriesStore.set(entry.entryId, entry);
        }
      }
      this.logger.log(
        `Loaded ${this.entriesStore.size} published Exchange entries from disk`,
      );
    } catch (err: any) {
      this.logger.warn(`Could not load Exchange entries from disk: ${err.message}`);
    }
  }

  private async persistEntry(entry: ExchangeEntry) {
    this.entriesStore.set(entry.entryId, entry);
    const filePath = path.join(this.exchangeDir, `${entry.entryId}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  private entryIdForSource(sourceUrl: string): string {
    const slug = sourceUrl
      .toLowerCase()
      .replace(/^[a-z+]+:\/\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const hash = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 8);
    return `ex_${slug}_${hash}`;
  }

  async publish(serverId: string, description?: string): Promise<PublishResponse> {
    const config = this.mcpCreator.getServer(serverId);
    // Snapshot so later enrichments of the live server don't mutate what was published
    const snapshot: MCPServerConfig = JSON.parse(JSON.stringify(config));

    const entryId = this.entryIdForSource(snapshot.targetUrl);
    let entry = this.entriesStore.get(entryId);
    if (!entry) {
      entry = {
        entryId,
        sourceUrl: snapshot.targetUrl,
        siteTitle: snapshot.hotelName,
        createdAt: new Date().toISOString(),
        versions: [],
      };
    }

    const nextVersion =
      entry.versions.length > 0
        ? Math.max(...entry.versions.map((v) => v.version)) + 1
        : 1;
    entry.versions.push({
      version: nextVersion,
      publishedAt: new Date().toISOString(),
      description,
      server: snapshot,
    });
    entry.siteTitle = snapshot.hotelName;

    await this.persistEntry(entry);
    this.logger.log(
      `Published '${snapshot.hotelName}' as ${entryId} v${nextVersion} (${snapshot.tools.length} tools)`,
    );
    return this.toResponse(entry);
  }

  listEntries(query?: string): ExchangeEntrySummary[] {
    let entries = Array.from(this.entriesStore.values());
    const q = query?.trim().toLowerCase();
    if (q) {
      entries = entries.filter((entry) => this.matchesQuery(entry, q));
    }
    return entries
      .map((entry) => this.toSummary(entry))
      .sort((a, b) => b.published_at.localeCompare(a.published_at));
  }

  getEntry(entryId: string): PublishResponse {
    return this.toResponse(this.findEntry(entryId));
  }

  getVersion(entryId: string, version: number): ExchangeVersionResponse {
    const entry = this.findEntry(entryId);
    const found = entry.versions.find((v) => v.version === version);
    if (!found) {
      throw new NotFoundException(
        `Version ${version} not found for entry '${entryId}'. Available versions: ${entry.versions.map((v) => v.version).join(', ')}`,
      );
    }
    return {
      entry_id: entry.entryId,
      source_url: entry.sourceUrl,
      site_title: entry.siteTitle,
      ...this.toVersionSummary(found),
    };
  }

  private findEntry(entryId: string): ExchangeEntry {
    const entry = this.entriesStore.get(entryId);
    if (!entry) {
      throw new NotFoundException(
        `Exchange entry '${entryId}' not found. Available entries: ${Array.from(this.entriesStore.keys()).join(', ') || 'None (publish an MCP first)'}`,
      );
    }
    return entry;
  }

  private latestVersion(entry: ExchangeEntry): ExchangeVersion {
    return entry.versions.reduce((a, b) => (b.version > a.version ? b : a));
  }

  private matchesQuery(entry: ExchangeEntry, q: string): boolean {
    if (
      entry.siteTitle.toLowerCase().includes(q) ||
      entry.sourceUrl.toLowerCase().includes(q)
    ) {
      return true;
    }
    return this.latestVersion(entry).server.tools.some(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q),
    );
  }

  private toSummary(entry: ExchangeEntry): ExchangeEntrySummary {
    const latest = this.latestVersion(entry);
    return {
      entry_id: entry.entryId,
      source_url: entry.sourceUrl,
      site_title: entry.siteTitle,
      description: latest.description,
      latest_version: latest.version,
      versions_count: entry.versions.length,
      published_at: latest.publishedAt,
      tool_names: latest.server.tools.map((t) => t.name),
    };
  }

  private toVersionSummary(v: ExchangeVersion): PublishedVersionSummary {
    return {
      version: v.version,
      published_at: v.publishedAt,
      description: v.description,
      server_id: v.server.serverId,
      tools: v.server.tools,
      call_endpoint: `/api/v1/servers/${v.server.serverId}/call`,
    };
  }

  private toResponse(entry: ExchangeEntry): PublishResponse {
    return {
      entry_id: entry.entryId,
      source_url: entry.sourceUrl,
      site_title: entry.siteTitle,
      latest_version: this.latestVersion(entry).version,
      versions: entry.versions.map((v) => this.toVersionSummary(v)),
    };
  }
}
