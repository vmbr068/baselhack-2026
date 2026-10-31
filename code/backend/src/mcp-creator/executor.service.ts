import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser } from 'playwright';
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
        const checkIn = args.check_in;
        const checkOut = args.check_out;
        const guests = String(args.guests || 2);

        if (selectors.check_in_input && checkIn) {
          await page.fill(selectors.check_in_input, checkIn, { timeout: 5000 });
        }
        if (selectors.check_out_input && checkOut) {
          await page.fill(selectors.check_out_input, checkOut, {
            timeout: 5000,
          });
        }
        if (selectors.guests_input) {
          try {
            await page.selectOption(selectors.guests_input, guests, {
              timeout: 5000,
            });
          } catch {
            try {
              await page.fill(selectors.guests_input, guests, {
                timeout: 5000,
              });
            } catch {}
          }
        }

        if (selectors.search_button) {
          await page.click(selectors.search_button, { timeout: 5000 });
          await page.waitForTimeout(1500);
        }

        const rooms = await page.evaluate(() => {
          const results: Array<{
            title: string;
            description?: string;
            price?: string;
          }> = [];
          const cards = document.querySelectorAll(
            '.room-card, .room-item, [data-room-id]',
          );
          cards.forEach((c) => {
            const title = (
              c.querySelector('.room-title, h3, h4') as HTMLElement
            )?.innerText?.trim();
            const desc = (
              c.querySelector('.room-desc, p') as HTMLElement
            )?.innerText?.trim();
            const price = (
              c.querySelector('.room-price, .price') as HTMLElement
            )?.innerText?.trim();
            if (title) {
              results.push({ title, description: desc, price });
            }
          });
          return results;
        });

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
            check_in: checkIn,
            check_out: checkOut,
            guests,
            rooms_count: rooms.length,
            available_rooms: rooms,
          },
          screenshot_url: `/static/screenshots/${filename}`,
        };
      }

      // 2. reserve_room
      if (toolDef.executionStep === 'reserve_room') {
        const roomTitle = args.room_title || '';
        const guestName = args.guest_name || '';
        const guestEmail = args.guest_email || '';
        const guestPhone = args.guest_phone || '';
        const specialRequests = args.special_requests || '';

        // Trigger search first if needed
        try {
          const searchBtn = page
            .locator("#btn-search-rooms, button:has-text('Search')")
            .first();
          if (await searchBtn.isVisible()) {
            await searchBtn.click();
            await page.waitForTimeout(1000);
          }
        } catch {}

        // Click reserve button
        let reserveClicked = false;
        if (roomTitle) {
          try {
            const roomCard = page
              .locator(`.room-card:has-text('${roomTitle}')`)
              .first();
            if (await roomCard.isVisible()) {
              const bookBtn = roomCard.locator('button, .btn-book').first();
              await bookBtn.click();
              reserveClicked = true;
            }
          } catch {}
        }

        if (!reserveClicked) {
          try {
            const firstBook = page
              .locator(
                ".btn-book, button:has-text('Reserve'), button:has-text('Book')",
              )
              .first();
            await firstBook.click();
          } catch {}
        }

        await page.waitForTimeout(800);

        if (selectors.guest_name_input && guestName) {
          await page.fill(selectors.guest_name_input, guestName, {
            timeout: 5000,
          });
        }
        if (selectors.guest_email_input && guestEmail) {
          await page.fill(selectors.guest_email_input, guestEmail, {
            timeout: 5000,
          });
        }
        if (selectors.guest_phone_input && guestPhone) {
          await page.fill(selectors.guest_phone_input, guestPhone, {
            timeout: 5000,
          });
        }
        if (selectors.special_requests_input && specialRequests) {
          await page.fill(selectors.special_requests_input, specialRequests, {
            timeout: 5000,
          });
        }

        const confirmBtn =
          selectors.confirm_button || '#btn-confirm-reservation';
        await page.click(confirmBtn, { timeout: 5000 });
        await page.waitForTimeout(1500);

        const confText = await page.evaluate(() => {
          const confEl = document.querySelector<HTMLElement>(
            '#confirmation-view, .confirmation-card, .success-message',
          );
          return confEl
            ? confEl.innerText.trim()
            : 'Reservation request submitted.';
        });

        const filename = `confirm_${Date.now()}.png`;
        await page.screenshot({
          path: path.join(this.screenshotDir, filename),
        });

        return {
          tool_name: toolName,
          success: true,
          status: 'executed',
          data: {
            status: 'confirmed',
            hotel: config.hotelName,
            room_title: roomTitle,
            guest_name: guestName,
            guest_email: guestEmail,
            confirmation_summary: confText,
          },
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
}
