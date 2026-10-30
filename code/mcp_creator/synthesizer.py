import os
import re
import json
from datetime import datetime
from typing import Dict, Any, Optional
try:
    from .models import WebScanResult, MCPServerConfig, MCPToolDefinition, FormField, ActionButton
except ImportError:
    from models import WebScanResult, MCPServerConfig, MCPToolDefinition, FormField, ActionButton

def _clean_slug(text: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9_]', '_', text.lower())
    return re.sub(r'_+', '_', cleaned).strip('_')

def synthesize_mcp_server(scan: WebScanResult) -> MCPServerConfig:
    """
    Transforms scanned website data into an actionable Model Context Protocol (MCP) server
    specification with structured tools for hotel availability and booking.
    """
    hotel_name = scan.title or "Hotel Booking"
    server_id = f"mcp_{_clean_slug(hotel_name)}_{int(datetime.now().timestamp())}"

    # Heuristic matching for Search / Availability fields
    check_in_sel = None
    check_out_sel = None
    guests_sel = None
    search_btn_sel = None

    # Heuristic matching for Reservation / Guest form fields
    guest_name_sel = None
    guest_email_sel = None
    guest_phone_sel = None
    special_requests_sel = None
    confirm_btn_sel = None

    for f in scan.inputs:
        ident = f"{f.id or ''} {f.name or ''} {f.label or ''} {f.placeholder or ''}".lower()

        # Check special requests / notes first to avoid placeholder phrase collisions
        if any(k in ident for k in ['request', 'note', 'comment', 'message']):
            if not special_requests_sel:
                special_requests_sel = f.selector
        # Check-in date
        elif not check_in_sel and (f.field_type == 'date' or any(k in ident for k in ['check-in', 'checkin', 'arrival', 'start', 'from'])):
            check_in_sel = f.selector
        # Check-out date
        elif not check_out_sel and (f.field_type == 'date' or any(k in ident for k in ['check-out', 'checkout', 'departure', 'end', 'to'])):
            check_out_sel = f.selector
        # Guests count
        elif not guests_sel and any(k in ident for k in ['guest', 'adult', 'person', 'pax', 'people']):
            guests_sel = f.selector
        # Email
        elif not guest_email_sel and (f.field_type == 'email' or 'email' in ident or 'mail' in ident):
            guest_email_sel = f.selector
        # Phone
        elif not guest_phone_sel and (f.field_type == 'tel' or any(k in ident for k in ['phone', 'tel', 'mobile'])):
            guest_phone_sel = f.selector
        # Guest Name
        elif not guest_name_sel and any(k in ident for k in ['name', 'fullname', 'firstname']) and not any(k in ident for k in ['user', 'login']):
            guest_name_sel = f.selector

    # Button matching
    for b in scan.buttons:
        txt = b.text.lower()
        if any(k in txt for k in ['search', 'check availability', 'find room', 'check rates']) and not search_btn_sel:
            search_btn_sel = b.selector
        elif any(k in txt for k in ['confirm', 'complete', 'finish', 'book now', 'reserve now']) and not confirm_btn_sel:
            confirm_btn_sel = b.selector

    # Fallbacks if some buttons were not detected
    if not search_btn_sel and scan.buttons:
        search_btn_sel = scan.buttons[0].selector
    if not confirm_btn_sel:
        confirm_btn_sel = "button[type='submit'], .btn-confirm, #btn-confirm-reservation"

    # Define MCP Tools
    tools = []

    # Tool 1: Check Availability
    tools.append(MCPToolDefinition(
        name="check_availability",
        description=f"Search available hotel rooms and rates on {hotel_name} for given dates and guest count.",
        parameters={
            "type": "object",
            "properties": {
                "check_in": {
                    "type": "string",
                    "description": "Check-in date in YYYY-MM-DD format (e.g. 2026-11-01)"
                },
                "check_out": {
                    "type": "string",
                    "description": "Check-out date in YYYY-MM-DD format (e.g. 2026-11-04)"
                },
                "guests": {
                    "type": "integer",
                    "description": "Number of guests (default: 2)",
                    "default": 2
                }
            },
            "required": ["check_in", "check_out"]
        },
        execution_step="check_availability",
        selectors_mapping={
            "check_in_input": check_in_sel or "#check-in",
            "check_out_input": check_out_sel or "#check-out",
            "guests_input": guests_sel or "#guests",
            "search_button": search_btn_sel or "#btn-search-rooms"
        }
    ))

    # Tool 2: Reserve Room
    tools.append(MCPToolDefinition(
        name="reserve_room",
        description=f"Book a specific room at {hotel_name} with guest contact details and confirmation.",
        parameters={
            "type": "object",
            "properties": {
                "room_title": {
                    "type": "string",
                    "description": "Name or title of the room to book (e.g. 'Deluxe Rhine View Suite')"
                },
                "guest_name": {
                    "type": "string",
                    "description": "Full name of the primary guest"
                },
                "guest_email": {
                    "type": "string",
                    "description": "Email address for booking confirmation"
                },
                "guest_phone": {
                    "type": "string",
                    "description": "Contact phone number (optional)"
                },
                "special_requests": {
                    "type": "string",
                    "description": "Any special preferences or requests (optional)"
                }
            },
            "required": ["room_title", "guest_name", "guest_email"]
        },
        execution_step="reserve_room",
        selectors_mapping={
            "guest_name_input": guest_name_sel or "#guest-name",
            "guest_email_input": guest_email_sel or "#guest-email",
            "guest_phone_input": guest_phone_sel or "#guest-phone",
            "special_requests_input": special_requests_sel or "#special-requests",
            "confirm_button": confirm_btn_sel
        }
    ))

    # Tool 3: Get Status / Screenshot
    tools.append(MCPToolDefinition(
        name="get_current_status",
        description=f"Capture the current live webpage state and screenshot for {hotel_name}.",
        parameters={
            "type": "object",
            "properties": {}
        },
        execution_step="get_screenshot",
        selectors_mapping={}
    ))

    return MCPServerConfig(
        server_id=server_id,
        hotel_name=hotel_name,
        target_url=scan.url,
        created_at=datetime.utcnow().isoformat(),
        tools=tools,
        scan_summary={
            "inputs_detected": len(scan.inputs),
            "buttons_detected": len(scan.buttons),
            "rooms_detected": len(scan.detected_rooms)
        }
    )
