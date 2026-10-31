export interface FormField {
  tag: string;
  fieldType: string;
  id?: string | null;
  name?: string | null;
  label?: string | null;
  placeholder?: string | null;
  selector: string;
  options?: Array<{ value: string; text: string }>;
}

export interface ActionButton {
  text: string;
  buttonType: string;
  selector: string;
}

export interface ScannedRoomOption {
  title: string;
  description?: string | null;
  price?: string | null;
  bookSelector?: string | null;
}

export interface WebScanResult {
  url: string;
  title: string;
  inputs: FormField[];
  buttons: ActionButton[];
  detectedRooms: ScannedRoomOption[];
  screenshotPath?: string;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  enabled?: boolean;
  parameters: Record<string, any>;
  executionStep: 'check_availability' | 'reserve_room' | 'get_screenshot';
  selectorsMapping: Record<string, string>;
  executionMode?: 'browser' | 'api' | 'hybrid';
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT';
  sourceOrigin?: 'dom' | 'wordpress' | 'github';
}

export interface MCPServerConfig {
  serverId: string;
  enabled?: boolean;
  hotelName: string;
  targetUrl: string;
  createdAt: string;
  tools: MCPToolDefinition[];
  scanSummary: Record<string, any>;
  codebaseEnrichment?: {
    source: 'wordpress' | 'github';
    details: Record<string, any>;
    enrichedAt: string;
  };
}

export interface ToolCallRequest {
  tool_name: string;
  arguments?: Record<string, any>;
}

export interface ToolCallResponse {
  tool_name: string;
  success: boolean;
  data: Record<string, any>;
  screenshot_url?: string | null;
  error?: string | null;
  executedVia?: 'browser' | 'api';
}

export interface GenerateResponse {
  server_id: string;
  hotel_name: string;
  target_url: string;
  tools: MCPToolDefinition[];
  call_endpoint: string;
  mcp_schema: {
    name: string;
    server_id: string;
    tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, any>;
    }>;
  };
}

export interface EnrichResponse {
  server_id: string;
  hotel_name: string;
  source: 'wordpress' | 'github';
  enriched_tools_count: number;
  tools: MCPToolDefinition[];
  summary: Record<string, any>;
}
