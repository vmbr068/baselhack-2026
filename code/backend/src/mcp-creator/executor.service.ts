import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
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
      args: Record<string, any>;
      expiresAt: number;
    }
  >();

  constructor() {
    fs.mkdir(this.screenshotDir, { recursive: true }).catch(() => {});
  }

  async executeTool(
    config: MCPServerConfig,
    toolName: string,
    args: Record<string, any> = {},
    confirmedByHuman?: boolean,
    confirmationToken?: string,
    authSessionOverride?: AuthSessionData | string,
    headless = true,
  ): Promise<ToolCallResponse> {
    const entry = {
      server_id: config.serverId,
      hotel: config.hotelName,
      tool: toolName,
      arguments: args,
      confirmed_by_human: Boolean(
        confirmedByHuman === true ||
        args.confirmed_by_human === true ||
        args.confirmed_by_human === 'true',
      ),
    };
    let res: ToolCallResponse;
    try {
      res = await this.run(
        config,
        toolName,
        args,
        confirmedByHuman,
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
    confirmedByHuman?: boolean,
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
    if (toolDef.enabled === false) {
      return {
        tool_name: toolName,
        success: false,
        data: {},
        error: `Tool '${toolName}' is disabled for ${config.hotelName}`,
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

    // Determine if tool represents an irreversible action (e.g. reservation, booking, payment)
    const isIrreversible = Boolean(
      toolDef.is_irreversible ||
      toolDef.requires_confirmation ||
      toolDef.executionStep === 'reserve_room' ||
      toolName.toLowerCase().includes('reserve') ||
      toolName.toLowerCase().includes('book') ||
      toolName.toLowerCase().includes('pay'),
    );

    const isExplicitlyConfirmed = Boolean(
      confirmedByHuman === true ||
      args.confirmed_by_human === true ||
      args.confirmed_by_human === 'true',
    );

    const token = confirmationToken || args.confirmation_token;

    // Safety Guardrail: Block execution without explicit human approval
    if (isIrreversible && !isExplicitlyConfirmed) {
      const generatedToken = `conf_tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      this.pendingConfirmations.set(generatedToken, {
        serverId: config.serverId,
        toolName,
        args,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      const summary = `Human approval required: Book '${args.room_title || 'Selected Room'}' at '${config.hotelName}' for ${args.guest_name || 'Guest'} (${args.guest_email || 'No email specified'}).`;

      this.logger.warn(
        `[GUARDRAIL] Execution blocked for irreversible action '${toolName}' on '${config.hotelName}'. Awaiting human confirmation.`,
      );

      return {
        tool_name: toolName,
        success: false,
        status: 'pending_confirmation',
        confirmation_required: true,
        confirmation_details: {
          token: generatedToken,
          summary,
          hotel: config.hotelName,
          action: toolName,
          details: {
            room_title: args.room_title,
            guest_name: args.guest_name,
            guest_email: args.guest_email,
            guest_phone: args.guest_phone,
            special_requests: args.special_requests,
            target_url: config.targetUrl,
          },
          expires_at: expiresAt,
        },
        data: {
          blocked: true,
          message: `ACTION BLOCKED: Irreversible action '${toolName}' on '${config.hotelName}' requires explicit human confirmation.`,
          required_action: {
            summary,
            token: generatedToken,
            instructions: `To proceed, ask the human user to confirm. Once confirmed, call this tool again with confirmed_by_human=true and confirmation_token='${generatedToken}'.`,
          },
        },
      };
    }

    if (isIrreversible && isExplicitlyConfirmed) {
      if (token) {
        const pending = this.pendingConfirmations.get(token);
        if (pending && pending.expiresAt < Date.now()) {
          this.pendingConfirmations.delete(token);
          return {
            tool_name: toolName,
            success: false,
            status: 'rejected',
            data: {},
            error: `Confirmation token '${token}' has expired. Please request human approval again.`,
          };
        }
        if (pending) {
          this.pendingConfirmations.delete(token);
        }
      }
      this.logger.log(
        `[GUARDRAIL AUDIT] Human confirmation verified for irreversible tool '${toolName}' on '${config.hotelName}'. Proceeding with execution.`,
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
        if (!args.check_in || !args.check_out) {
          return {
            tool_name: toolName,
            success: false,
            status: 'rejected',
            data: { hotel: config.hotelName, room_title: roomTitle },
            error: 'check_in and check_out are required. Nothing was booked.',
          };
        }
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

      // 3. submit_form (generic form input and submission)
      if (toolDef.executionStep === 'submit_form') {
        for (const [key, val] of Object.entries(args)) {
          const selector = selectors[key];
          if (selector && val !== undefined && val !== null) {
            try {
              await page.fill(selector, String(val), { timeout: 3000 });
            } catch {
              try {
                await page.selectOption(selector, String(val), {
                  timeout: 3000,
                });
              } catch {}
            }
          }
        }

        if (selectors.submit_button) {
          try {
            await page.click(selectors.submit_button, { timeout: 4000 });
            await this.settle(page);
          } catch {}
        }

        const filename = `action_${Date.now()}.png`;
        await page.screenshot({
          path: path.join(this.screenshotDir, filename),
        });

        return {
          tool_name: toolName,
          success: true,
          status: 'executed',
          data: {
            title: await page.title(),
            url: page.url(),
            submitted_fields: Object.keys(args),
          },
          screenshot_url: `/static/screenshots/${filename}`,
        };
      }

      // 4. navigate_route (visit internal route, capture content preview & screenshot)
      if (toolDef.executionStep === 'navigate_route') {
        const targetPath = args.route || args.path || '/';
        const targetFullUrl = new URL(targetPath, config.targetUrl).href;
        assertAllowedSite(targetFullUrl);
        await page.goto(targetFullUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 25000,
        });
        await this.settle(page);

        const pageTitle = await page.title();
        const mainText = await page.evaluate(() => {
          const main = document.querySelector(
            'main, article, #content, .content, body',
          );
          return (main ? (main as HTMLElement).innerText : document.body.innerText)
            .replace(/\s+/g, ' ')
            .slice(0, 1500);
        });

        const filename = `nav_${Date.now()}.png`;
        await page.screenshot({ path: path.join(this.screenshotDir, filename) });

        return {
          tool_name: toolName,
          success: true,
          status: 'executed',
          data: {
            title: pageTitle,
            route: targetPath,
            url: targetFullUrl,
            content_preview: mainText,
          },
          screenshot_url: `/static/screenshots/${filename}`,
        };
      }

      // 5. screenshot only
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
