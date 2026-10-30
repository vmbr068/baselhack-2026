import os
import time
import asyncio
from typing import Optional
from pathlib import Path
from playwright.async_api import async_playwright
try:
    from .models import WebScanResult, FormField, ActionButton, ScannedRoomOption
except ImportError:
    from models import WebScanResult, FormField, ActionButton, ScannedRoomOption

SCREENSHOT_DIR = Path(__file__).parent / "static" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

async def scan_website(url: str, headless: bool = True, timeout_ms: int = 20000) -> WebScanResult:
    """
    Scans a target website using Playwright to extract forms, inputs, buttons,
    and potential hotel room cards.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            # Navigate to the target page
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            # Give a small buffer for dynamic JS rendering
            await page.wait_for_timeout(1000)

            title = await page.title()
            
            # Save screenshot
            timestamp = int(time.time())
            screenshot_filename = f"scan_{timestamp}.png"
            screenshot_path = SCREENSHOT_DIR / screenshot_filename
            await page.screenshot(path=str(screenshot_path), full_page=False)

            # Extract inputs and selects
            inputs_data = await page.evaluate("""
                () => {
                    const fields = [];
                    const allInputs = document.querySelectorAll('input, select, textarea');
                    
                    allInputs.forEach((el, index) => {
                        // Skip hidden inputs
                        if (el.type === 'hidden' || el.style.display === 'none' || el.style.visibility === 'hidden') return;
                        
                        let labelText = '';
                        if (el.id) {
                            const lbl = document.querySelector(`label[for="${el.id}"]`);
                            if (lbl) labelText = lbl.innerText.trim();
                        }
                        if (!labelText && el.closest('label')) {
                            labelText = el.closest('label').innerText.trim();
                        }

                        // Determine unique CSS selector
                        let selector = '';
                        if (el.id) {
                            selector = `#${el.id}`;
                        } else if (el.name) {
                            selector = `${el.tagName.toLowerCase()}[name="${el.name}"]`;
                        } else {
                            selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
                        }

                        // Extract options if select
                        const options = [];
                        if (el.tagName.toLowerCase() === 'select') {
                            Array.from(el.options).forEach(opt => {
                                options.push({ value: opt.value, text: opt.text });
                            });
                        }

                        fields.push({
                            tag: el.tagName.toLowerCase(),
                            field_type: el.type || 'text',
                            id: el.id || null,
                            name: el.name || null,
                            label: labelText || null,
                            placeholder: el.placeholder || null,
                            selector: selector,
                            options: options
                        });
                    });
                    return fields;
                }
            """)

            # Extract actionable buttons
            buttons_data = await page.evaluate("""
                () => {
                    const buttons = [];
                    const btnElements = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a[role="button"]');
                    btnElements.forEach((el, index) => {
                        const text = (el.innerText || el.value || '').trim();
                        if (!text) return;

                        let selector = '';
                        if (el.id) {
                            selector = `#${el.id}`;
                        } else if (el.className && typeof el.className === 'string') {
                            const firstClass = el.className.split(' ')[0];
                            selector = `${el.tagName.toLowerCase()}.${firstClass}`;
                        } else {
                            selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
                        }

                        buttons.push({
                            text: text,
                            button_type: el.type || 'button',
                            selector: selector
                        });
                    });
                    return buttons;
                }
            """)

            # Extract any visible room cards
            rooms_data = await page.evaluate("""
                () => {
                    const rooms = [];
                    // Look for common room card containers
                    const cards = document.querySelectorAll('.room-card, .room-item, [data-room-id], article, .hotel-room');
                    cards.forEach((card, idx) => {
                        const titleEl = card.querySelector('.room-title, h3, h4, .title, .name');
                        const descEl = card.querySelector('.room-desc, p, .description');
                        const priceEl = card.querySelector('.room-price, .price, .rate');
                        const bookBtn = card.querySelector('.btn-book, button, a');

                        if (titleEl) {
                            rooms.push({
                                title: titleEl.innerText.trim(),
                                description: descEl ? descEl.innerText.trim() : null,
                                price: priceEl ? priceEl.innerText.trim() : null,
                                book_selector: bookBtn ? (bookBtn.id ? `#${bookBtn.id}` : `.room-card:nth-of-type(${idx + 1}) button`) : null
                            });
                        }
                    });
                    return rooms;
                }
            """)

            return WebScanResult(
                url=url,
                title=title,
                inputs=[FormField(**f) for f in inputs_data],
                buttons=[ActionButton(**b) for b in buttons_data],
                detected_rooms=[ScannedRoomOption(**r) for r in rooms_data],
                screenshot_path=screenshot_filename
            )

        finally:
            await browser.close()
