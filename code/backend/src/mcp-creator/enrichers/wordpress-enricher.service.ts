import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MCPServerConfig, MCPToolDefinition } from '../mcp-creator.types.js';
import { assertAllowedSite } from '../site-allowlist.js';

interface WpRouteEndpoint {
  methods: string[];
  args?: Record<
    string,
    {
      type?: string;
      required?: boolean;
      description?: string;
      default?: any;
      enum?: any[];
    }
  >;
}

@Injectable()
export class WordpressEnricherService {
  private readonly logger = new Logger(WordpressEnricherService.name);

  async enrichWithWordpress(
    config: MCPServerConfig,
    customWpUrl?: string,
  ): Promise<{
    enrichedConfig: MCPServerConfig;
    summary: Record<string, any>;
  }> {
    let baseUrl = customWpUrl || config.targetUrl;
    baseUrl = baseUrl.replace(/\/+$/, '');
    assertAllowedSite(baseUrl);

    const wpJsonUrl = baseUrl.endsWith('/wp-json')
      ? baseUrl
      : `${baseUrl}/wp-json`;

    this.logger.log(
      `Enriching MCP server '${config.serverId}' using WordPress API: ${wpJsonUrl}`,
    );

    let indexData: any;
    try {
      const res = await fetch(wpJsonUrl, {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(
          `WordPress REST API responded with status ${res.status}`,
        );
      }
      indexData = await res.json();
    } catch (err: any) {
      this.logger.warn(
        `Failed to connect to WordPress REST API at ${wpJsonUrl}: ${err.message}`,
      );
      throw new BadRequestException(
        `Unable to reach WordPress REST API at ${wpJsonUrl}. Please ensure the site is running WordPress with the REST API enabled. Error: ${err.message}`,
      );
    }

    const namespaces: string[] = indexData.namespaces || [];
    const routes: Record<string, { endpoints: WpRouteEndpoint[] }> =
      indexData.routes || {};

    const discoveredEndpoints: Array<{
      route: string;
      method: string;
      args: Record<string, any>;
      category: 'search' | 'booking' | 'room_info';
    }> = [];

    // Keywords to detect hotel/booking related routes
    const bookingKeywords = [
      'book',
      'reservation',
      'reserve',
      'checkout',
      'mphb',
      'hotel',
      'room',
      'accommodation',
      'stay',
      'check-availability',
      'availability',
    ];

    for (const [routePath, routeInfo] of Object.entries(routes)) {
      const lowerRoute = routePath.toLowerCase();
      const hasBookingKeyword = bookingKeywords.some((kw) =>
        lowerRoute.includes(kw),
      );

      if (hasBookingKeyword && routeInfo.endpoints) {
        for (const ep of routeInfo.endpoints) {
          const methods = ep.methods || [];
          const method = methods[0] || 'GET';
          const args = ep.args || {};

          let category: 'search' | 'booking' | 'room_info' = 'room_info';
          if (lowerRoute.includes('search') || lowerRoute.includes('availab')) {
            category = 'search';
          } else if (
            lowerRoute.includes('book') ||
            lowerRoute.includes('reserve')
          ) {
            category = 'booking';
          }

          discoveredEndpoints.push({
            route: routePath,
            method,
            args,
            category,
          });
        }
      }
    }

    const newTools: MCPToolDefinition[] = [];

    for (const ep of discoveredEndpoints) {
      const cleanName = ep.route
        .replace(/^\//, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();

      const toolName = `wp_${cleanName}_${ep.method.toLowerCase()}`;

      // Convert WP arguments schema to JSON Schema for MCP
      const properties: Record<string, any> = {};
      const requiredFields: string[] = [];

      for (const [argName, argDef] of Object.entries(ep.args)) {
        properties[argName] = {
          type: argDef.type || 'string',
          description: argDef.description || `Parameter ${argName}`,
        };
        if (argDef.enum) {
          properties[argName].enum = argDef.enum;
        }
        if (argDef.required) {
          requiredFields.push(argName);
        }
      }

      newTools.push({
        name: toolName,
        description: `Direct WordPress REST API endpoint [${ep.method}] ${ep.route} discovered on ${config.hotelName}.`,
        parameters: {
          type: 'object',
          properties:
            Object.keys(properties).length > 0
              ? properties
              : { payload: { type: 'object' } },
          required: requiredFields,
        },
        executionStep:
          ep.category === 'booking' ? 'reserve_room' : 'check_availability',
        selectorsMapping: {},
        executionMode: 'hybrid',
        apiEndpoint: `${baseUrl}${ep.route}`,
        apiMethod: ep.method as 'GET' | 'POST',
        sourceOrigin: 'wordpress',
      });
    }

    // Upgrade existing tools with API metadata if matching endpoints were found
    const bookingApi = discoveredEndpoints.find(
      (e) => e.category === 'booking',
    );
    const searchApi = discoveredEndpoints.find((e) => e.category === 'search');

    const updatedTools = config.tools.map((tool) => {
      if (tool.name === 'check_availability' && searchApi) {
        return {
          ...tool,
          executionMode: 'hybrid' as const,
          apiEndpoint: `${baseUrl}${searchApi.route}`,
          apiMethod: searchApi.method as 'GET' | 'POST',
          sourceOrigin: 'wordpress' as const,
          description: `${tool.description} (Enhanced with WordPress API ${searchApi.route})`,
        };
      }
      if (tool.name === 'reserve_room' && bookingApi) {
        return {
          ...tool,
          executionMode: 'hybrid' as const,
          apiEndpoint: `${baseUrl}${bookingApi.route}`,
          apiMethod: bookingApi.method as 'GET' | 'POST',
          sourceOrigin: 'wordpress' as const,
          description: `${tool.description} (Enhanced with WordPress API ${bookingApi.route})`,
        };
      }
      return tool;
    });

    const finalTools = [...updatedTools, ...newTools];

    const enrichedConfig: MCPServerConfig = {
      ...config,
      tools: finalTools,
      codebaseEnrichment: {
        source: 'wordpress',
        details: {
          wpJsonUrl,
          namespacesCount: namespaces.length,
          discoveredRoutesCount: discoveredEndpoints.length,
          routes: discoveredEndpoints.map((d) => `${d.method} ${d.route}`),
        },
        enrichedAt: new Date().toISOString(),
      },
    };

    return {
      enrichedConfig,
      summary: {
        namespacesDetected: namespaces,
        discoveredBookingEndpoints: discoveredEndpoints.map(
          (e) => `${e.method} ${e.route}`,
        ),
        toolsAdded: newTools.length,
        totalTools: finalTools.length,
      },
    };
  }
}
