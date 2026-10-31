import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InteractiveLoginDto {
  @ApiProperty({
    description: 'Target website URL to open for user login',
    example: 'http://localhost:3000/mock-hotel/vip',
  })
  url!: string;

  @ApiPropertyOptional({
    description: 'Timeout in milliseconds to wait for the user to authenticate',
    example: 60000,
    default: 60000,
  })
  timeoutMs?: number;
}

export class GenerateRequestDto {
  @ApiProperty({
    description:
      'Target hotel website URL to scan and create an MCP server for',
    example: 'http://localhost:3000/mock-hotel',
  })
  url!: string;

  @ApiPropertyOptional({
    description:
      'Optional delegated session data (cookies, storageState or headers) for scanning authenticated member areas',
    example: {
      cookies: [
        {
          name: 'session_id',
          value: 'vip_session_token_123',
          domain: 'localhost',
        },
      ],
    },
  })
  auth_session?: any;
}

export class ScanRequestDto {
  @ApiProperty({
    description: 'Target website URL to extract forms and inputs from',
    example: 'http://localhost:3000/mock-hotel',
  })
  url!: string;

  @ApiPropertyOptional({
    description:
      'Optional delegated session data (cookies, storageState or headers) for scanning authenticated member areas',
    example: {
      cookies: [
        {
          name: 'session_id',
          value: 'vip_session_token_123',
          domain: 'localhost',
        },
      ],
    },
  })
  auth_session?: any;
}

export class ToolCallRequestDto {
  @ApiProperty({
    description: 'Name of the tool to execute',
    example: 'check_availability',
  })
  tool_name!: string;

  @ApiPropertyOptional({
    description: 'Arguments required by the tool',
    example: {
      check_in: '2026-11-05',
      check_out: '2026-11-08',
      guests: 2,
    },
  })
  arguments?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Explicit human confirmation flag required before executing irreversible tools (e.g. reserve_room)',
    example: true,
    default: false,
  })
  confirmed_by_human?: boolean;

  @ApiPropertyOptional({
    description:
      'Unique confirmation token issued by the pending confirmation request',
    example: 'conf_tok_1710000000000_abc123',
  })
  confirmation_token?: string;

  @ApiPropertyOptional({
    description:
      'Optional delegated session data (cookies or headers) to override authentication for this execution',
  })
  auth_session?: any;
}

export class EnrichWordpressDto {
  @ApiPropertyOptional({
    description:
      'WordPress site URL or REST API root (defaults to the target URL of the MCP server)',
    example: 'https://hotel-basel-demo.ch/wp-json',
  })
  wpUrl?: string;

  @ApiPropertyOptional({ description: 'WordPress.com OAuth access token; keep this in memory and send only for the enrichment request' })
  accessToken?: string;

  @ApiPropertyOptional({ description: 'WordPress.com blog ID returned by the OAuth exchange' })
  wpSiteId?: string;
}

export class EnrichGithubDto {
  @ApiProperty({
    description:
      'Public or private GitHub repository URL containing the website codebase',
    example: 'https://github.com/basel-hackathon/hotel-booking-service',
  })
  repoUrl!: string;

  @ApiPropertyOptional({
    description: 'Git branch to analyze (default: main)',
    example: 'main',
    default: 'main',
  })
  branch?: string;

  @ApiPropertyOptional({
    description:
      'GitHub Personal Access Token for private repositories or higher rate limits',
    example: 'ghp_xxxxxxxxxxxxxxxxxxxx',
  })
  githubToken?: string;
}

export class SetEnabledDto {
  @ApiProperty({ description: 'Whether the MCP server or tool is enabled', example: false })
  enabled!: boolean;
}

export class OAuthTicketDto {
  @ApiProperty({ description: 'One-time OAuth ticket returned to the frontend' })
  ticket!: string;

  @ApiProperty({ description: 'MCP server ID associated with the authorization' })
  serverId!: string;
}
