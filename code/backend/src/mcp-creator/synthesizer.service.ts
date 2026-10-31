import { Injectable } from '@nestjs/common';
import {
  WebScanResult,
  MCPServerConfig,
  MCPToolDefinition,
} from './mcp-creator.types.js';

@Injectable()
export class SynthesizerService {
  private cleanSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  synthesizeMCPServer(scan: WebScanResult): MCPServerConfig {
    const hotelName = scan.title || 'Hotel Booking';
    const serverId = `mcp_${this.cleanSlug(hotelName)}_${Date.now()}`;

    let checkInSel: string | null = null;
    let checkOutSel: string | null = null;
    let guestsSel: string | null = null;
    let searchBtnSel: string | null = null;

    let guestNameSel: string | null = null;
    let guestEmailSel: string | null = null;
    let guestPhoneSel: string | null = null;
    let specialRequestsSel: string | null = null;
    let confirmBtnSel: string | null = null;

    for (const f of scan.inputs) {
      const ident =
        `${f.id || ''} ${f.name || ''} ${f.label || ''} ${f.placeholder || ''}`.toLowerCase();

      // Prioritize special requests to avoid placeholder collisions
      if (
        ['request', 'note', 'comment', 'message'].some((k) => ident.includes(k))
      ) {
        if (!specialRequestsSel) specialRequestsSel = f.selector;
      } else if (
        !checkInSel &&
        (f.fieldType === 'date' ||
          ['check-in', 'checkin', 'arrival', 'start', 'from'].some((k) =>
            ident.includes(k),
          ))
      ) {
        checkInSel = f.selector;
      } else if (
        !checkOutSel &&
        (f.fieldType === 'date' ||
          ['check-out', 'checkout', 'departure', 'end', 'to'].some((k) =>
            ident.includes(k),
          ))
      ) {
        checkOutSel = f.selector;
      } else if (
        !guestsSel &&
        ['guest', 'adult', 'person', 'pax', 'people'].some((k) =>
          ident.includes(k),
        )
      ) {
        guestsSel = f.selector;
      } else if (
        !guestEmailSel &&
        (f.fieldType === 'email' ||
          ident.includes('email') ||
          ident.includes('mail'))
      ) {
        guestEmailSel = f.selector;
      } else if (
        !guestPhoneSel &&
        (f.fieldType === 'tel' ||
          ['phone', 'tel', 'mobile'].some((k) => ident.includes(k)))
      ) {
        guestPhoneSel = f.selector;
      } else if (
        !guestNameSel &&
        ['name', 'fullname', 'firstname'].some((k) => ident.includes(k)) &&
        !['user', 'login'].some((k) => ident.includes(k))
      ) {
        guestNameSel = f.selector;
      }
    }

    // Button matching
    for (const b of scan.buttons) {
      const txt = b.text.toLowerCase();
      if (
        ['search', 'check availability', 'find room', 'check rates'].some((k) =>
          txt.includes(k),
        ) &&
        !searchBtnSel
      ) {
        searchBtnSel = b.selector;
      } else if (
        ['confirm', 'complete', 'finish', 'book now', 'reserve now'].some((k) =>
          txt.includes(k),
        ) &&
        !confirmBtnSel
      ) {
        confirmBtnSel = b.selector;
      }
    }

    if (!searchBtnSel && scan.buttons.length > 0) {
      searchBtnSel = scan.buttons[0].selector;
    }
    if (!confirmBtnSel) {
      confirmBtnSel =
        "button[type='submit'], .btn-confirm, #btn-confirm-reservation";
    }

    const tools: MCPToolDefinition[] = [
      {
        name: 'check_availability',
        description: `Search available hotel rooms and rates on ${hotelName} for given dates and guest count.`,
        parameters: {
          type: 'object',
          properties: {
            check_in: {
              type: 'string',
              description:
                'Check-in date in YYYY-MM-DD format (e.g. 2026-11-01)',
            },
            check_out: {
              type: 'string',
              description:
                'Check-out date in YYYY-MM-DD format (e.g. 2026-11-04)',
            },
            guests: {
              type: 'integer',
              description: 'Number of guests (default: 2)',
              default: 2,
            },
          },
          required: ['check_in', 'check_out'],
        },
        executionStep: 'check_availability',
        requires_confirmation: false,
        is_irreversible: false,
        selectorsMapping: {
          check_in_input: checkInSel || '#check-in',
          check_out_input: checkOutSel || '#check-out',
          guests_input: guestsSel || '#guests',
          search_button: searchBtnSel || '#btn-search-rooms',
        },
      },
      {
        name: 'reserve_room',
        description: `[IRREVERSIBLE ACTION - REQUIRES HUMAN CONFIRMATION] Book a specific room at ${hotelName} with guest contact details. This action creates a real booking and requires explicit human approval before execution.`,
        parameters: {
          type: 'object',
          properties: {
            check_in: {
              type: 'string',
              description: 'Check-in date in YYYY-MM-DD format',
            },
            check_out: {
              type: 'string',
              description: 'Check-out date in YYYY-MM-DD format',
            },
            guests: {
              type: 'integer',
              description: 'Number of guests (default: 2)',
              default: 2,
            },
            room_title: {
              type: 'string',
              description:
                "Name or title of the room to book (e.g. 'Deluxe Rhine View Suite')",
            },
            guest_name: {
              type: 'string',
              description: 'Full name of the primary guest',
            },
            guest_email: {
              type: 'string',
              description: 'Email address for booking confirmation',
            },
            guest_phone: {
              type: 'string',
              description: 'Contact phone number (optional)',
            },
            special_requests: {
              type: 'string',
              description: 'Any special preferences or requests (optional)',
            },
            confirmed_by_human: {
              type: 'boolean',
              description:
                'Explicit confirmation flag. Must be true to execute this irreversible booking action.',
              default: false,
            },
            confirmation_token: {
              type: 'string',
              description:
                'Token provided by the pending confirmation request when confirmation is asked.',
            },
          },
          required: [
            'room_title',
            'check_in',
            'check_out',
            'guest_name',
            'guest_email',
          ],
        },
        executionStep: 'reserve_room',
        requires_confirmation: true,
        is_irreversible: true,
        selectorsMapping: {
          guest_name_input: guestNameSel || '#guest-name',
          guest_email_input: guestEmailSel || '#guest-email',
          guest_phone_input: guestPhoneSel || '#guest-phone',
          special_requests_input: specialRequestsSel || '#special-requests',
          confirm_button: confirmBtnSel,
        },
      },
      {
        name: 'get_current_status',
        description: `Capture the current live webpage state and screenshot for ${hotelName}.`,
        parameters: {
          type: 'object',
          properties: {},
        },
        executionStep: 'get_screenshot',
        requires_confirmation: false,
        is_irreversible: false,
        selectorsMapping: {},
      },
    ];

    return {
      serverId,
      hotelName,
      targetUrl: scan.url,
      createdAt: new Date().toISOString(),
      tools,
      scanSummary: {
        inputsDetected: scan.inputs.length,
        buttonsDetected: scan.buttons.length,
        roomsDetected: scan.detectedRooms.length,
        screenshotPath: scan.screenshotPath,
      },
    };
  }
}
