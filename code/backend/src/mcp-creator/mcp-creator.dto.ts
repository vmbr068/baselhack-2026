export class GenerateRequestDto {
  url!: string;
}

export class ScanRequestDto {
  url!: string;
}

export class ToolCallRequestDto {
  tool_name!: string;
  arguments?: Record<string, any>;
}
