import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MCPServerConfig, MCPToolDefinition } from '../mcp-creator.types.js';

interface GitTreeItem {
  path: string;
  type: 'blob' | 'tree';
  url: string;
}

@Injectable()
export class GithubEnricherService {
  private readonly logger = new Logger(GithubEnricherService.name);

  private parseRepoUrl(rawUrl: string): { owner: string; repo: string } {
    try {
      const parsed = new URL(rawUrl);
      const parts = parsed.pathname
        .replace(/^\//, '')
        .replace(/\.git$/, '')
        .split('/');
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] };
      }
    } catch {}
    throw new BadRequestException(
      `Invalid GitHub repository URL: '${rawUrl}'. Expected format: 'https://github.com/owner/repository'`,
    );
  }

  async enrichWithGithub(
    config: MCPServerConfig,
    repoUrl: string,
    branch = 'main',
    githubToken?: string,
  ): Promise<{
    enrichedConfig: MCPServerConfig;
    summary: Record<string, any>;
  }> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    this.logger.log(
      `Enriching MCP server '${config.serverId}' with GitHub codebase: ${owner}/${repo} (${branch})`,
    );

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'MCP-Creator-NestJS',
    };
    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`;
    }

    // 1. Fetch git tree recursively
    let treeItems: GitTreeItem[] = [];
    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers, signal: AbortSignal.timeout(12000) },
      );

      if (!treeRes.ok) {
        // Fallback to 'master' if 'main' was not found
        if (branch === 'main') {
          const masterRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`,
            { headers, signal: AbortSignal.timeout(12000) },
          );
          if (masterRes.ok) {
            const data = await masterRes.json();
            treeItems = data.tree || [];
          } else {
            throw new Error(`GitHub API returned status ${treeRes.status}`);
          }
        } else {
          throw new Error(`GitHub API returned status ${treeRes.status}`);
        }
      } else {
        const data = await treeRes.json();
        treeItems = data.tree || [];
      }
    } catch (err: any) {
      this.logger.warn(
        `Could not fetch GitHub repository tree: ${err.message}`,
      );
      throw new BadRequestException(
        `Unable to fetch repository '${owner}/${repo}'. Ensure the repository is public or provide a valid githubToken. Error: ${err.message}`,
      );
    }

    // 2. Look for OpenAPI / Swagger specs
    const specFiles = treeItems.filter(
      (item) =>
        item.type === 'blob' &&
        /^(.*\/)?(openapi|swagger)\.(json|yaml|yml)$/i.test(item.path),
    );

    let parsedOpenApiTools: MCPToolDefinition[] = [];
    let detectedSpecPath: string | null = null;

    if (specFiles.length > 0) {
      const specItem = specFiles[0];
      detectedSpecPath = specItem.path;
      this.logger.log(
        `Found OpenAPI specification in codebase: ${detectedSpecPath}`,
      );

      try {
        const rawSpecRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${specItem.path}`,
          { headers, signal: AbortSignal.timeout(10000) },
        );
        if (rawSpecRes.ok) {
          const content = await rawSpecRes.text();
          if (specItem.path.endsWith('.json')) {
            const specJson = JSON.parse(content);
            parsedOpenApiTools = this.convertOpenApiToMcpTools(
              specJson,
              config.targetUrl,
            );
          }
        }
      } catch (specErr: any) {
        this.logger.warn(`Failed to parse OpenAPI spec: ${specErr.message}`);
      }
    }

    // 3. Scan codebase files for routes and models
    const relevantCodeFiles = treeItems
      .filter((item) => {
        if (item.type !== 'blob') return false;
        const p = item.path.toLowerCase();
        return (
          p.includes('route') ||
          p.includes('controller') ||
          p.includes('booking') ||
          p.includes('hotel') ||
          p.includes('reservation') ||
          p.includes('api') ||
          p.endsWith('.prisma') ||
          p.endsWith('schema.sql')
        );
      })
      .slice(0, 15);

    const discoveredCodeEndpoints: Array<{
      file: string;
      detectedRoute: string;
      method: string;
    }> = [];

    for (const fileItem of relevantCodeFiles.slice(0, 5)) {
      try {
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileItem.path}`,
          { headers, signal: AbortSignal.timeout(8000) },
        );
        if (rawRes.ok) {
          const code = await rawRes.text();

          // Regex for NestJS / Express / FastAPI / WordPress routes
          const routeRegex =
            /(?:@Post|@Get|app\.post|app\.get|register_rest_route|@router\.post|@router\.get)\s*\(\s*['"]([^'"]+)['"]/g;
          let match: RegExpExecArray | null;
          while ((match = routeRegex.exec(code)) !== null) {
            const routeStr = match[1];
            if (
              [
                'book',
                'reserve',
                'room',
                'availability',
                'search',
                'hotel',
              ].some((k) => routeStr.toLowerCase().includes(k))
            ) {
              const method = match[0].toLowerCase().includes('get')
                ? 'GET'
                : 'POST';
              discoveredCodeEndpoints.push({
                file: fileItem.path,
                detectedRoute: routeStr,
                method,
              });
            }
          }
        }
      } catch {}
    }

    // 4. Merge & Upgrade tools
    const updatedTools = [...config.tools];

    // Enrich existing check_availability and reserve_room
    for (const tool of updatedTools) {
      if (
        tool.name === 'check_availability' &&
        (parsedOpenApiTools.length > 0 || discoveredCodeEndpoints.length > 0)
      ) {
        tool.description = `${tool.description} (Enriched with GitHub codebase analysis from ${owner}/${repo})`;
        tool.sourceOrigin = 'github';
        tool.executionMode = 'hybrid';
      }
      if (
        tool.name === 'reserve_room' &&
        (parsedOpenApiTools.length > 0 || discoveredCodeEndpoints.length > 0)
      ) {
        tool.description = `${tool.description} (Enriched with GitHub codebase analysis from ${owner}/${repo})`;
        tool.sourceOrigin = 'github';
        tool.executionMode = 'hybrid';
      }
    }

    // Append newly parsed OpenAPI tools
    for (const apiTool of parsedOpenApiTools) {
      if (!updatedTools.some((t) => t.name === apiTool.name)) {
        updatedTools.push(apiTool);
      }
    }

    const enrichedConfig: MCPServerConfig = {
      ...config,
      tools: updatedTools,
      codebaseEnrichment: {
        source: 'github',
        details: {
          repository: `${owner}/${repo}`,
          branch,
          filesScannedCount: relevantCodeFiles.length,
          openApiSpecFound: detectedSpecPath,
          endpointsFromCode: discoveredCodeEndpoints,
        },
        enrichedAt: new Date().toISOString(),
      },
    };

    return {
      enrichedConfig,
      summary: {
        repository: `${owner}/${repo}`,
        branch,
        filesAnalyzed: relevantCodeFiles.map((f) => f.path),
        openApiSpecFound: detectedSpecPath,
        codebaseEndpointsDiscovered: discoveredCodeEndpoints,
        totalTools: updatedTools.length,
      },
    };
  }

  private convertOpenApiToMcpTools(
    spec: any,
    baseUrl: string,
  ): MCPToolDefinition[] {
    const tools: MCPToolDefinition[] = [];
    const paths = spec.paths || {};

    for (const [pathStr, methods] of Object.entries<any>(paths)) {
      for (const [method, op] of Object.entries<any>(methods)) {
        const lowerPath = pathStr.toLowerCase();
        if (
          !['book', 'reserve', 'room', 'hotel', 'availability'].some((k) =>
            lowerPath.includes(k),
          )
        ) {
          continue;
        }

        const cleanName = pathStr
          .replace(/^\//, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .toLowerCase();

        const toolName = `api_${cleanName}_${method.toLowerCase()}`;
        const description =
          op.description ||
          op.summary ||
          `OpenAPI endpoint [${method.toUpperCase()}] ${pathStr}`;

        // Schema extraction
        let parameters: Record<string, any> = {
          type: 'object',
          properties: {},
        };
        if (op.requestBody?.content?.['application/json']?.schema) {
          parameters = op.requestBody.content['application/json'].schema;
        }

        const isBooking =
          lowerPath.includes('book') || lowerPath.includes('reserve');

        tools.push({
          name: toolName,
          description,
          parameters,
          executionStep: isBooking ? 'reserve_room' : 'check_availability',
          requires_confirmation: isBooking,
          is_irreversible: isBooking,
          selectorsMapping: {},
          executionMode: 'hybrid',
          apiEndpoint: `${baseUrl.replace(/\/+$/, '')}${pathStr}`,
          apiMethod: method.toUpperCase() as 'GET' | 'POST',
          sourceOrigin: 'github',
        });
      }
    }

    return tools;
  }
}
