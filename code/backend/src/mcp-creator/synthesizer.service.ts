import { Injectable } from '@nestjs/common';
import {
  WebScanResult,
  MCPServerConfig,
  MCPToolDefinition,
  FormField,
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
    const siteTitle = scan.title || 'Web Service';
    const serverId = `mcp_${this.cleanSlug(siteTitle)}_${Date.now()}`;

    // Decide whether to synthesize standard Hotel demo tools or generic web service tools
    const isHotelSite = this.detectHotelSite(scan);

    const tools: MCPToolDefinition[] = isHotelSite
      ? this.synthesizeHotelTools(scan, siteTitle)
      : this.synthesizeGenericTools(scan, siteTitle);

    return {
      serverId,
      hotelName: siteTitle,
      targetUrl: scan.url,
      createdAt: new Date().toISOString(),
      tools,
      scanSummary: {
        inputsDetected: scan.inputs.length,
        buttonsDetected: scan.buttons.length,
        roomsDetected: scan.detectedRooms.length,
        screenshotPath: scan.screenshotPath,
        isHotelSite,
      },
    };
  }

  /**
   * Detects if the scanned website is an accommodation/hotel booking service.
   * Ensures 100% backward compatibility with demo sites and E2E test suites.
   */
  private detectHotelSite(scan: WebScanResult): boolean {
    // Specific markers for the demo mock hotel and Rheinblick
    if (
      scan.url.includes('mock-hotel') ||
      scan.url.includes('mock_hotel') ||
      scan.url.includes('hotel.bh2026') ||
      scan.url.includes('hotel') ||
      scan.title.toLowerCase().includes('hotel') ||
      scan.detectedRooms.length > 0
    ) {
      return true;
    }

    // Check for check-in / check-out date presence
    const hasCheckIn = scan.inputs.some((i) =>
      ['check-in', 'checkin', 'arrival'].some((k) =>
        `${i.id || ''} ${i.name || ''} ${i.label || ''}`.toLowerCase().includes(k),
      ),
    );
    const hasCheckOut = scan.inputs.some((i) =>
      ['check-out', 'checkout', 'departure'].some((k) =>
        `${i.id || ''} ${i.name || ''} ${i.label || ''}`.toLowerCase().includes(k),
      ),
    );

    return hasCheckIn && hasCheckOut;
  }

  private synthesizeHotelTools(
    scan: WebScanResult,
    hotelName: string,
  ): MCPToolDefinition[] {
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

    return [
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
  }

  /**
   * Synthesizes generic web tools based on actual DOM inputs, routes, and buttons detected on non-hotel sites.
   */
  private synthesizeGenericTools(
    scan: WebScanResult,
    siteTitle: string,
  ): MCPToolDefinition[] {
    const tools: MCPToolDefinition[] = [];

    // 1. Check if the site has a Login / Authentication form
    const hasPasswordField = scan.inputs.some((i) => i.fieldType === 'password');
    const hasExplicitLoginButton = scan.buttons.some((b) =>
      ['log in', 'login', 'connexion', 'sign in', 'se connecter'].some((k) =>
        b.text.toLowerCase().includes(k),
      ),
    );

    if (hasPasswordField || hasExplicitLoginButton) {
      const loginProps: Record<string, any> = {};
      const loginSelectors: Record<string, string> = {};
      const requiredProps: string[] = [];

      const pwdField = scan.inputs.find((i) => i.fieldType === 'password');
      const userField = scan.inputs.find(
        (i) =>
          i.fieldType !== 'password' &&
          (i.fieldType === 'email' ||
            ['user', 'username', 'login', 'email', 'identifiant'].some((k) =>
              `${i.id || ''} ${i.name || ''} ${i.label || ''}`.toLowerCase().includes(k),
            )),
      );

      if (userField) {
        loginProps['identifier'] = {
          type: 'string',
          description: userField.label || userField.placeholder || 'Username or email',
        };
        loginSelectors['identifier'] =
          userField.id && userField.id.startsWith('mantine-')
            ? 'input[type="email"], input[type="text"]:not([type="hidden"])'
            : userField.selector;
        requiredProps.push('identifier');
      }

      if (pwdField) {
        loginProps['password'] = {
          type: 'string',
          description: pwdField.label || 'Password',
        };
        loginSelectors['password'] =
          pwdField.id && pwdField.id.startsWith('mantine-')
            ? 'input[type="password"]'
            : pwdField.selector;
        requiredProps.push('password');
      }

      const loginBtn =
        scan.buttons.find((b) =>
          ['log in', 'login', 'connexion', 'sign in', 'connecter'].some((k) =>
            b.text.toLowerCase().includes(k),
          ),
        ) || scan.buttons.find((b) => b.buttonType === 'submit') || scan.buttons[0];

      if (loginBtn) {
        loginSelectors['submit_button'] = loginBtn.selector;
      }

      if (Object.keys(loginProps).length > 0) {
        tools.push({
          name: 'login',
          description: `Authenticate or log in to ${siteTitle}.`,
          parameters: {
            type: 'object',
            properties: loginProps,
            required: requiredProps,
          },
          executionStep: 'submit_form',
          requires_confirmation: false,
          is_irreversible: false,
          selectorsMapping: loginSelectors,
        });
      }
    }

    // 2. Check if the site has a Newsletter / Subscribe form (e.g. BaselHack)
    const isNewsletter =
      !hasPasswordField &&
      scan.inputs.some(
        (i) => i.fieldType === 'email' || (i.name || '').toLowerCase().includes('email'),
      ) &&
      scan.buttons.some((b) =>
        ['subscribe', 'newsletter', 'join', 'abonner', "s'inscrire"].some((k) =>
          b.text.toLowerCase().includes(k),
        ),
      );

    if (isNewsletter) {
      const emailField = scan.inputs.find(
        (i) => i.fieldType === 'email' || (i.name || '').toLowerCase().includes('email'),
      );
      const subscribeBtn = scan.buttons.find((b) =>
        ['subscribe', 'newsletter', 'join', 'abonner', "s'inscrire"].some((k) =>
          b.text.toLowerCase().includes(k),
        ),
      );

      if (emailField) {
        tools.push({
          name: 'subscribe_newsletter',
          description: `Subscribe to the newsletter or community announcements on ${siteTitle}.`,
          parameters: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'E-mail address for newsletter subscription',
              },
            },
            required: ['email'],
          },
          executionStep: 'submit_form',
          requires_confirmation: false,
          is_irreversible: false,
          selectorsMapping: {
            email: emailField.selector,
            submit_button: subscribeBtn ? subscribeBtn.selector : 'button[type="submit"]',
          },
        });
      }
    }

    // 3. Navigation Routes Tool (e.g. /event, /challenges, /about, /sponsors on BaselHack)
    if (scan.routes && scan.routes.length > 0) {
      const routeList = scan.routes.map((r) => `${r.path} (${r.label})`).join(', ');
      tools.push({
        name: 'navigate_route',
        description: `Navigate or inspect pages and sections of ${siteTitle}. Available routes: ${routeList}.`,
        parameters: {
          type: 'object',
          properties: {
            route: {
              type: 'string',
              description: 'The internal route or page path to visit (e.g. /event, /challenges, /about)',
              enum: scan.routes.map((r) => r.path),
            },
          },
          required: ['route'],
        },
        executionStep: 'navigate_route',
        requires_confirmation: false,
        is_irreversible: false,
        selectorsMapping: {},
      });
    }

    // 4. Generic interaction / form submission tool for remaining inputs (excluding honeypots)
    const otherInputs = scan.inputs.filter((i) => {
      const idOrName = `${i.id || ''} ${i.name || ''} ${i.label || ''}`.toLowerCase();
      return (
        !idOrName.includes('honeypot') &&
        !idOrName.includes('leave this field blank') &&
        i.fieldType !== 'password' &&
        !(isNewsletter && i.fieldType === 'email')
      );
    });

    if (otherInputs.length > 0) {
      const formProps: Record<string, any> = {};
      const formSelectors: Record<string, string> = {};

      otherInputs.slice(0, 8).forEach((f) => {
        const key = this.fieldToParamKey(f);
        formProps[key] = {
          type: f.fieldType === 'number' ? 'number' : 'string',
          description: f.label || f.placeholder || key,
        };
        formSelectors[key] = f.selector;
      });

      const submitBtn =
        scan.buttons.find((b) => b.buttonType === 'submit') || scan.buttons[0];
      if (submitBtn) {
        formSelectors['submit_button'] = submitBtn.selector;
      }

      tools.push({
        name: 'submit_data',
        description: `Submit data or interact with form elements on ${siteTitle}.`,
        parameters: {
          type: 'object',
          properties: formProps,
        },
        executionStep: 'submit_form',
        requires_confirmation: true,
        is_irreversible: true,
        selectorsMapping: formSelectors,
      });
    }

    // 5. Always provide get_current_status (universal tool)
    tools.push({
      name: 'get_current_status',
      description: `Capture the current live webpage state and screenshot for ${siteTitle}.`,
      parameters: {
        type: 'object',
        properties: {},
      },
      executionStep: 'get_screenshot',
      requires_confirmation: false,
      is_irreversible: false,
      selectorsMapping: {},
    });

    return tools;
  }

  private fieldToParamKey(f: FormField): string {
    if (f.name) return this.cleanSlug(f.name);
    if (f.id) return this.cleanSlug(f.id);
    if (f.label) return this.cleanSlug(f.label);
    if (f.placeholder) return this.cleanSlug(f.placeholder);
    return `field_${f.fieldType || 'input'}`;
  }
}
