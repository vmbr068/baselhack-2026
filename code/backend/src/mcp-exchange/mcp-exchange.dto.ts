import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublishRequestDto {
  @ApiProperty({
    description: 'ID of a generated MCP server to publish, or "latest"',
    example: 'latest',
  })
  server_id!: string;

  @ApiPropertyOptional({
    description: 'Short description shown in the Exchange catalogue',
    example: 'Search and book rooms at the Grand Hotel Basel',
  })
  description?: string;
}
