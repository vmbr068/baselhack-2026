import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { randomBytes } from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { ApprovalRequest } from './approval-page.js';
import {
  MCPServerConfig,
  ToolCallResponse,
  AuthSessionData,
} from './mcp-creator.types.js';
import { normalizeAuthSession } from './auth-session.helper.js';
import {
  assertAllowedSite,
  blockDisallowedNavigation,
} from './site-allowlist.js';
import { appendAuditEntry } from './audit-log.js';

const CONFIRMATION_TTL_MS = 15 * 60 * 1000;
const publicBaseUrl = () =>
  (
    process.env.PUBLIC_BASE_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`
  ).replace(/\/$/, '');

const ROOM_CARD_SELECTOR = '.room-card, .room-item, [data-room-id], article';
const MAX_BOOKING_STEPS = 6;

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);
  private readonly screenshotDir = path.resolve(
    process.cwd(),
    'static/screenshots',
  );
  private readonly pendingConfirmations = new Map<
    string,
    {
      serverId: string;
      toolName: string;
      hotel: string;
      targetUrl: string;
      args: Record<string, any>;
      expiresAt: number;
      approved: boolean;
    }
  >();

  constructor() {
    fs.mkdir(this.screenshotDir, { recursive: true }).catch(() => {});
  }

  async executeTool(
    config: MCPServerConfig,
    toolName: string,
    args: Record<string, any> = {},
    confirmationToken?: string,
    authSessionOverride?: AuthSessionData | string,
    headless = true,
  ): Promise<ToolCallResponse> {
    const entry = {
      server_id: config.serverId,
      hotel: config.hotelName,
      tool: toolName,
      arguments: args,
    };
    let res: ToolCallResponse;
    try {
      res = await this.run(
        config,
        toolName,
        args,
        confirmationToken,
        authSessionOverride,
        headless,
      );
    } catch (err: any) {
      await this.audit({ ...entry, status: 'error', error: err.message });
      throw err;
    }
    await this.audit({
      ...entry,
      confirmed_by_human: Boolean(
        (confirmationToken || args.confirmation_token) && res.success,
      ),
      status: res.status,
      success: res.success,
      error: res.error,
      executed_via: res.executedVia,
      data: res.data,
    });
    return res;
  }

  // An audit write failure must not break the agent's tool call.
  private async audit(entry: Record<string, unknown>): Promise<void> {
    await appendAuditEntry(entry).catch((e) =>
      this.logger.error(`Audit log write failed: ${e.message}`),
    );
  }

  private async run(
    config: MCPServerConfig,
    toolName: string,
    args: Record<string, any>,
    confirmationToken?: string,
    authSessionOverride?: AuthSessionData | string,
    headless = true,
  ): Promise<ToolCallResponse> {
    const toolDef = config.tools.find((t) => t.name === toolName);
    if (!toolDef) {
      return {
        tool_name: toolName,
        success: false,
        status: 'rejected',
        data: {},
        error: `Tool '${toolName}' not found in configuration for ${config.hotelName}`,
      };
    }

    // Servers persisted on disk may predate the allowlist, so check on every call.
    assertAllowedSite(config.targetUrl);

    const sessionToUse =
      authSessionOverride || args.auth_session || config.authSession;
    const { storageState, extraHeaders } = normalizeAuthSession(
      sessionToUse,
      config.targetUrl,
    );

    // Only reads skip approval: any API call that can write (not GET) needs a
    // human, whatever the generator guessed about the tool.
    const isIrreversible = Boolean(
      toolDef.is_irreversible ||
      toolDef.requires_confirmation ||
      toolDef.executionStep === 'reserve_room' ||
      (toolDef.apiEndpoint &&
        (toolDef.apiMethod || 'POST').toUpperCase() !== 'GET') ||
      /reserv|book|pay|order|checkout|purchase|cancel/i.test(toolName),
    );

    // Safety Guardrail: only a human, on the approval page, can unlock this.
    if (isIrreversible) {
      const token = confirmationToken || args.confirmation_token;
      if (!token) {
        if (
          toolDef.executionStep === 'reserve_room' &&
          (!args.check_in || !args.check_out)
        ) {
          return {
            tool_name: toolName,
            success: false,
            status: 'rejected',
            data: { hotel: config.hotelName, room_title: args.room_title },
            error: 'check_in and check_out are required. Nothing was booked.',
          };
        }
        const generatedToken = `conf_tok_${randomBytes(24).toString('base64url').replace(/-/g, '_')}`;
        const { confirmed_by_human: _ignored, ...requestedArgs } = args;
        this.pendingConfirmations.set(generatedToken, {
          serverId: config.serverId,
          toolName,
          hotel: config.hotelName,
          targetUrl: config.targetUrl,
          args: requestedArgs,
          expiresAt: Date.now() + CONFIRMATION_TTL_MS,
          approved: false,
        });
        this.logger.warn(
          `[GUARDRAIL] Execution blocked for irreversible action '${toolName}' on '${config.hotelName}'.`,
        );
        return this.pendingResponse(generatedToken);
      }

      const pending = this.pendingConfirmations.get(token);
      if (
        !pending ||
        pending.expiresAt < Date.now() ||
        pending.serverId !== config.serverId ||
        pending.toolName !== toolName
      ) {
        return {
          tool_name: toolName,
          success: false,
          status: 'rejected',
          data: {},
          error:
            'This confirmation token is invalid, expired or already used. Call the tool again without a token to request a new approval.',
        };
      }
      if (!pending.approved) {
        return this.pendingResponse(token);
      }

      // Single use, and it runs exactly what the human approved.
      this.pendingConfirmations.delete(token);
      args = pending.args;
      this.logger.log(
        `[GUARDRAIL AUDIT] Human approval verified for irreversible tool '${toolName}' on '${config.hotelName}'.`,
      );
    }

    // Direct API Execution (if tool was enriched with a direct backend API endpoint)
    if (toolDef.apiEndpoint) {
      assertAllowedSite(toolDef.apiEndpoint);
      try {
        this.logger.log(
          `Executing tool '${toolName}' via direct API: ${toolDef.apiMethod || 'POST'} ${toolDef.apiEndpoint}`,
        );
        const method = toolDef.apiMethod || 'POST';
        const isGet = method.toUpperCase() === 'GET';
        let url = toolDef.apiEndpoint;
        if (isGet && Object.keys(args).length > 0) {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null) params.append(k, String(v));
          }
          url += (url.includes('?') ? '&' : '?') + params.toString();
        }

        const apiHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...extraHeaders,
        };
        if (storageState?.cookies?.length) {
          apiHeaders['Cookie'] = storageState.cookies
            .map((c) => `${c.name}=${c.value}`)
            .join('; ');
        }

        const apiRes = await fetch(url, {
          method,
          headers: apiHeaders,
          body: !isGet ? JSON.stringify(args) : undefined,
          redirect: 'error',
          signal: AbortSignal.timeout(6000),
        });

        if (apiRes.ok) {
          const apiData = await apiRes
            .json()
            .catch(() => ({ status: 'success' }));
          return {
            tool_name: toolName,
            success: true,
            status: 'executed',
            data: apiData,
            executedVia: 'api',
          };
        }
        this.logger.warn(
          `Direct API call returned status ${apiRes.status}, seamlessly falling back to Playwright browser automation`,
        );
      } catch (apiErr: any) {
        this.logger.warn(
          `Direct API call encountered error: ${apiErr.message}, falling back to Playwright`,
        );
      }
    }

    const selectors = toolDef.selectorsMapping;
    const browser: Browser = await chromium.launch({
      headless,
      executablePath: process.env.CHROMIUM_PATH,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      storageState,
      extraHTTPHeaders: extraHeaders,
    });
    await blockDisallowedNavigation(context);
    const page = await context.newPage();

    try {
      await page.goto(config.targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await page.waitForTimeout(1000);

      // 1. check_availability
      if (toolDef.executionStep === 'check_availability') {
        await this.searchRooms(page, selectors, args);
        const rooms = await this.extractRooms(page);

        const filename = `action_${Date.now()}.png`;
        await page.screenshot({
          path: path.join(this.screenshotDir, filename),
        });

        return {
          tool_name: toolName,
          success: true,
          status: 'executed',
          data: {
            hotel: config.hotelName,
            check_in: args.check_in,
            check_out: args.check_out,
            guests: String(args.guests || 2),
            rooms_count: rooms.length,
            available_rooms: rooms,
          },
          screenshot_url: `/static/screenshots/${filename}`,
        };
      }

      // 2. reserve_room
      if (toolDef.executionStep === 'reserve_room') {
        const roomTitle: string = args.room_title || '';
        const searchTool = config.tools.find(
          (t) => t.executionStep === 'check_availability',
        );
        await this.searchRooms(page, searchTool?.selectorsMapping ?? {}, args);

        const card = page
          .locator(ROOM_CARD_SELECTOR)
          .filter({ hasText: roomTitle })
          .first();
        if (!roomTitle || !(await card.isVisible())) {
          return {
            tool_name: toolName,
            success: false,
            status: 'rejected',
            data: { hotel: config.hotelName, room_title: roomTitle },
            error: `Room '${roomTitle}' is not available for these dates. Nothing was booked.`,
          };
        }
        await card
          .locator('a, button')
          .filter({ hasText: /reserve|book|select|view|details/i })
          .first()
          .click({ timeout: 5000 });
        await this.settle(page);

        const confirmed = await this.completeBooking(page, selectors, args);
        const summary = await page
          .locator('#confirmation-view, .confirmation-card, main, body')
          .filter({ visible: true })
          .first()
          .innerText();

        const filename = `confirm_${Date.now()}.png`;
        await page.screenshot({
          path: path.join(this.screenshotDir, filename),
        });

        const data = {
          hotel: config.hotelName,
          room_title: roomTitle,
          check_in: args.check_in,
          check_out: args.check_out,
          guest_name: args.guest_name,
          guest_email: args.guest_email,
          confirmation_summary: summary.trim().slice(0, 800),
        };
        return confirmed
          ? {
              tool_name: toolName,
              success: true,
              status: 'executed',
              data: { status: 'confirmed', ...data },
              screenshot_url: `/static/screenshots/${filename}`,
            }
          : {
              tool_name: toolName,
              success: false,
              status: 'rejected',
              data: { status: 'unconfirmed', ...data },
              error:
                'The site did not show a booking confirmation. Do not tell the user the room is booked.',
              screenshot_url: `/static/screenshots/${filename}`,
            };
      }

      // 3. screenshot only
      const filename = `screenshot_${Date.now()}.png`;
      await page.screenshot({ path: path.join(this.screenshotDir, filename) });
      return {
        tool_name: toolName,
        success: true,
        status: 'executed',
        data: { title: await page.title(), url: page.url() },
        screenshot_url: `/static/screenshots/${filename}`,
      };
    } catch (err: any) {
      this.logger.error(`Error executing tool ${toolName}: ${err.message}`);
      return {
        tool_name: toolName,
        success: false,
        status: 'rejected',
        data: {},
        error: err.message,
      };
    } finally {
      await browser.close();
    }
  }

  private pendingResponse(token: string): ToolCallResponse {
    const pending = this.pendingConfirmations.get(token)!;
    const approvalUrl = `${publicBaseUrl()}/confirm/${token}`;
    const summary = `Human approval required: ${pending.toolName} on '${pending.hotel}'. Ask the user to open ${approvalUrl}`;
    const instructions = `Show the user this link and ask them to approve there: ${approvalUrl}. Never open or submit it yourself. Once they say they approved, call this tool again with confirmation_token='${token}'. It runs exactly what they approved.`;
    return {
      tool_name: pending.toolName,
      success: false,
      status: 'pending_confirmation',
      confirmation_required: true,
      confirmation_details: {
        token,
        approval_url: approvalUrl,
        summary,
        hotel: pending.hotel,
        action: pending.toolName,
        details: { ...pending.args, target_url: pending.targetUrl },
        expires_at: new Date(pending.expiresAt).toISOString(),
      },
      data: {
        blocked: true,
        message: `ACTION BLOCKED: '${pending.toolName}' needs approval from the human user.`,
        required_action: { summary, token, instructions },
      },
    };
  }

  /** Returns what the approval page shows, or undefined if it cannot be approved. */
  getApprovalRequest(token: string): ApprovalRequest | undefined {
    const pending = this.pendingConfirmations.get(token);
    if (!pending || pending.expiresAt < Date.now()) return undefined;
    return {
      hotel: pending.hotel,
      action: pending.toolName,
      details: pending.args,
    };
  }

  approveConfirmation(token: string): boolean {
    const pending = this.pendingConfirmations.get(token);
    if (!pending || pending.expiresAt < Date.now()) return false;
    pending.approved = true;
    return true;
  }

  rejectConfirmation(token: string): boolean {
    return this.pendingConfirmations.delete(token);
  }

  /** Waits for a navigation or API call triggered by the last action. */
  private async settle(page: Page): Promise<void> {
    await page.waitForTimeout(300);
    await page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(() => {});
  }

  private async searchRooms(
    page: Page,
    selectors: Record<string, string>,
    args: Record<string, any>,
  ): Promise<void> {
    if (selectors.check_in_input && args.check_in) {
      await page.fill(selectors.check_in_input, args.check_in, {
        timeout: 5000,
      });
    }
    if (selectors.check_out_input && args.check_out) {
      await page.fill(selectors.check_out_input, args.check_out, {
        timeout: 5000,
      });
    }
    if (selectors.guests_input) {
      const guests = String(args.guests || 2);
      try {
        await page.selectOption(selectors.guests_input, guests, {
          timeout: 5000,
        });
      } catch {
        try {
          await page.fill(selectors.guests_input, guests, { timeout: 5000 });
        } catch {}
      }
    }
    if (selectors.search_button) {
      await page.click(selectors.search_button, { timeout: 5000 });
      await this.settle(page);
    }
  }

  private async extractRooms(
    page: Page,
  ): Promise<Array<{ title: string; description?: string; price?: string }>> {
    return page.evaluate((cardSelector) => {
      const results: Array<{
        title: string;
        description?: string;
        price?: string;
      }> = [];
      document.querySelectorAll<HTMLElement>(cardSelector).forEach((card) => {
        const title = card
          .querySelector<HTMLElement>('.room-title, h1, h2, h3, h4')
          ?.innerText?.trim();
        const text = card.innerText;
        const price =
          card.querySelector<HTMLElement>('.room-price, .price')?.innerText ??
          /(?:CHF|EUR|USD|[$€£])\s?[\d'.,]+|[\d'.,]+\s?(?:CHF|EUR|USD|[$€£])/.exec(
            text,
          )?.[0];
        // <article> is also used for news and reviews, so it needs a price.
        if (!title || (card.matches('article') && !price)) return;
        results.push({
          title,
          description: card
            .querySelector<HTMLElement>('.room-desc, p')
            ?.innerText?.trim(),
          price: price?.trim(),
        });
      });
      return results;
    }, ROOM_CARD_SELECTOR);
  }

  private async fillFirstVisible(
    page: Page,
    candidates: Array<string | undefined>,
    value: string | undefined,
  ): Promise<void> {
    if (!value) return;
    for (const candidate of candidates) {
      if (!candidate) continue;
      const field = page.locator(candidate).first();
      if (await field.isVisible()) {
        await field.fill(value, { timeout: 5000 });
        return;
      }
    }
  }

  /** Walks a booking flow of any length until the site confirms the booking. */
  private async completeBooking(
    page: Page,
    selectors: Record<string, string>,
    args: Record<string, any>,
  ): Promise<boolean> {
    const isConfirmed = async () =>
      /(reservation|booking)\s+(is\s+)?confirmed/i.test(
        await page.locator('body').innerText(),
      );

    for (let step = 0; step < MAX_BOOKING_STEPS; step++) {
      if (await isConfirmed()) return true;

      await this.fillFirstVisible(
        page,
        [
          selectors.guest_name_input,
          'input[name*="name" i]:not([type=hidden])',
        ],
        args.guest_name,
      );
      await this.fillFirstVisible(
        page,
        [selectors.guest_email_input, 'input[type=email]'],
        args.guest_email,
      );
      await this.fillFirstVisible(
        page,
        [selectors.guest_phone_input, 'input[type=tel]'],
        args.guest_phone,
      );
      await this.fillFirstVisible(
        page,
        [selectors.special_requests_input, 'textarea'],
        args.special_requests,
      );

      const actions = [
        page.locator('form:has(input[type=email]) button[type=submit]'),
        page.locator('button, a').filter({ hasText: /confirm/i }),
        page
          .locator('main a, main button')
          .filter({ hasText: /continue|reserve|book/i }),
      ];
      let clicked = false;
      for (const action of actions) {
        const target = action.filter({ visible: true }).first();
        if (await target.isVisible()) {
          await target.click({ timeout: 5000 });
          clicked = true;
          break;
        }
      }
      if (!clicked) return false;
      await this.settle(page);
    }
    return isConfirmed();
  }
}
