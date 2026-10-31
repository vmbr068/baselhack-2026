import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { chromium, Browser } from 'playwright';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  WebScanResult,
  FormField,
  ActionButton,
  ScannedRoomOption,
} from './mcp-creator.types.js';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly screenshotDir = path.resolve(
    process.cwd(),
    'static/screenshots',
  );

  constructor() {
    fs.mkdir(this.screenshotDir, { recursive: true }).catch(() => {});
  }

  async scanWebsite(
    url: string,
    headless = true,
    timeoutMs = 25000,
  ): Promise<WebScanResult> {
    this.logger.log(`Scanning website: ${url}`);
    const browser: Browser = await chromium.launch({
      headless,
      executablePath: process.env.CHROMIUM_PATH,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: timeoutMs,
        });
      } catch (error) {
        const reason = (error as Error).message.split('\n')[0];
        this.logger.warn(`Cannot reach ${url}: ${reason}`);
        throw new UnprocessableEntityException(
          `Cannot reach ${url} from the server. Use a public URL: localhost is the server itself.`,
        );
      }
      await page.waitForTimeout(1000);

      const title = await page.title();

      // Screenshot
      const timestamp = Date.now();
      const screenshotFilename = `scan_${timestamp}.png`;
      const screenshotPath = path.join(this.screenshotDir, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Extract Inputs
      const inputsData = await page.evaluate((): FormField[] => {
        const fields: FormField[] = [];
        const allInputs = document.querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >('input, select, textarea');

        allInputs.forEach((el, index) => {
          if (
            el.type === 'hidden' ||
            el.style.display === 'none' ||
            el.style.visibility === 'hidden'
          ) {
            return;
          }

          let labelText: string | null = null;
          if (el.id) {
            const lbl = document.querySelector<HTMLLabelElement>(
              `label[for="${el.id}"]`,
            );
            if (lbl) labelText = lbl.innerText.trim();
          }
          if (!labelText && el.closest('label')) {
            labelText = el.closest('label')?.innerText.trim() || null;
          }

          let selector = '';
          if (el.id) {
            selector = `#${el.id}`;
          } else if (el.name) {
            selector = `${el.tagName.toLowerCase()}[name="${el.name}"]`;
          } else {
            selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
          }

          const options: Array<{ value: string; text: string }> = [];
          if (el.tagName.toLowerCase() === 'select') {
            const selEl = el as HTMLSelectElement;
            Array.from(selEl.options).forEach((opt) => {
              options.push({ value: opt.value, text: opt.text });
            });
          }

          fields.push({
            tag: el.tagName.toLowerCase(),
            fieldType: el.type || 'text',
            id: el.id || null,
            name: el.name || null,
            label: labelText,
            placeholder: (el as HTMLInputElement).placeholder || null,
            selector,
            options,
          });
        });
        return fields;
      });

      // Extract Buttons
      const buttonsData = await page.evaluate((): ActionButton[] => {
        const buttons: ActionButton[] = [];
        const btnElements = document.querySelectorAll<HTMLElement>(
          'button, input[type="submit"], input[type="button"], a.btn, a[role="button"]',
        );

        btnElements.forEach((el, index) => {
          const text = (
            el.innerText ||
            (el as HTMLInputElement).value ||
            ''
          ).trim();
          if (!text) return;

          let selector = '';
          if (el.id) {
            selector = `#${el.id}`;
          } else if (
            el.className &&
            typeof el.className === 'string' &&
            el.className.trim()
          ) {
            const firstClass = el.className.split(' ')[0];
            selector = `${el.tagName.toLowerCase()}.${firstClass}`;
          } else {
            selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
          }

          buttons.push({
            text,
            buttonType: (el as HTMLButtonElement).type || 'button',
            selector,
          });
        });
        return buttons;
      });

      // Extract Room cards
      const roomsData = await page.evaluate((): ScannedRoomOption[] => {
        const rooms: ScannedRoomOption[] = [];
        const cards = document.querySelectorAll(
          '.room-card, .room-item, [data-room-id], article, .hotel-room',
        );

        cards.forEach((card, idx) => {
          const titleEl = card.querySelector<HTMLElement>(
            '.room-title, h3, h4, .title, .name',
          );
          const descEl = card.querySelector<HTMLElement>(
            '.room-desc, p, .description',
          );
          const priceEl = card.querySelector<HTMLElement>(
            '.room-price, .price, .rate',
          );
          const bookBtn = card.querySelector<HTMLElement>(
            '.btn-book, button, a',
          );

          if (titleEl) {
            rooms.push({
              title: titleEl.innerText.trim(),
              description: descEl ? descEl.innerText.trim() : null,
              price: priceEl ? priceEl.innerText.trim() : null,
              bookSelector: bookBtn
                ? bookBtn.id
                  ? `#${bookBtn.id}`
                  : `.room-card:nth-of-type(${idx + 1}) button`
                : null,
            });
          }
        });
        return rooms;
      });

      return {
        url,
        title,
        inputs: inputsData,
        buttons: buttonsData,
        detectedRooms: roomsData,
        screenshotPath: screenshotFilename,
      };
    } finally {
      await browser.close();
    }
  }
}
