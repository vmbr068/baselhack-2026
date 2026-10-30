import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateRequestDto {
  @ApiProperty({
    description: 'Target hotel website URL to scan and create an MCP server for',
    example: 'http://localhost:3000/mock-hotel',
  })
  url!: string;
}

export class ScanRequestDto {
  @ApiProperty({
    description: 'Target website URL to extract forms and inputs from',
    example: 'http://localhost:3000/mock-hotel',
  })
  url!: string;
}

export class ToolCallRequestDto {
  @ApiProperty({
    description: 'Name of the tool to execute',
    example: 'check_availability',
    enum: ['check_availability', 'reserve_room', 'get_current_status'],
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
}
