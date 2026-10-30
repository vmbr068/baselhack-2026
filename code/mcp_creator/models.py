from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class FormField(BaseModel):
    tag: str = "input"
    field_type: str = "text"
    id: Optional[str] = None
    name: Optional[str] = None
    label: Optional[str] = None
    placeholder: Optional[str] = None
    selector: str
    options: List[Dict[str, str]] = []  # For select elements

class ActionButton(BaseModel):
    text: str
    button_type: str = "button"
    selector: str

class ScannedRoomOption(BaseModel):
    title: str
    description: Optional[str] = None
    price: Optional[str] = None
    book_selector: Optional[str] = None

class WebScanResult(BaseModel):
    url: str
    title: str
    inputs: List[FormField] = []
    buttons: List[ActionButton] = []
    detected_rooms: List[ScannedRoomOption] = []
    screenshot_path: Optional[str] = None

class MCPToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema
    execution_step: str         # 'check_availability' | 'reserve_room' | 'get_screenshot'
    selectors_mapping: Dict[str, str] = {}

class MCPServerConfig(BaseModel):
    server_id: str
    hotel_name: str
    target_url: str
    created_at: str
    tools: List[MCPToolDefinition] = []
    scan_summary: Dict[str, Any] = {}

class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = {}

class ToolCallResponse(BaseModel):
    tool_name: str
    success: bool
    data: Dict[str, Any] = {}
    screenshot_url: Optional[str] = None
    error: Optional[str] = None
