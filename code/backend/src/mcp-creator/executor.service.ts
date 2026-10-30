import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser } from 'playwright';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { MCPServerConfig, ToolCallResponse } from './mcp-creator.types.js';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);
  private readonly screenshotDir = path.resolve(
    process.cwd(),
    'static/screenshots',
  );

  constructor() {
    fs.mkdir(this.screenshotDir, { recursive: true }).catch(() => {});
  }

  async executeTool(
    config: MCPServerConfig,
    toolName: string,
    args: Record<string, any> = {},
    headless = true,
  ): Promise<ToolCallResponse> {
    const toolDef = config.tools.find((t) => t.name === toolName);
    if (!toolDef) {
      return {
        tool_name: toolName,
        success: false,
        data: {},
        error: `Tool '${toolName}' not found in configuration for ${config.hotelName}`,
      };
    }

    const selectors = toolDef.selectorsMapping;
    const browser: Browser = await chromium.launch({ headless });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
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
        data: { title: await page.title(), url: page.url() },
        screenshot_url: `/static/screenshots/${filename}`,
      };
    } catch (err: any) {
      this.logger.error(`Error executing tool ${toolName}: ${err.message}`);
      return {
        tool_name: toolName,
        success: false,
        data: {},
        error: err.message,
      };
    } finally {
      await browser.close();
    }
  }
}
