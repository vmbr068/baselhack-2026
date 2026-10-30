import time
from pathlib import Path
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright
try:
    from .models import MCPServerConfig, ToolCallResponse
except ImportError:
    from models import MCPServerConfig, ToolCallResponse

SCREENSHOT_DIR = Path(__file__).parent / "static" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

async def execute_tool(
    config: MCPServerConfig,
    tool_name: str,
    arguments: Dict[str, Any],
    headless: bool = True
) -> ToolCallResponse:
    """
    Executes an MCP tool action on the target website using Playwright.
    """
    tool_def = next((t for t in config.tools if t.name == tool_name), None)
    if not tool_def:
        return ToolCallResponse(
            tool_name=tool_name,
            success=False,
            error=f"Tool '{tool_name}' not found in configuration for {config.hotel_name}"
        )

    selectors = tool_def.selectors_mapping

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            await page.goto(config.target_url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(1000)

            # Step 1: Check Availability Action
            if tool_def.execution_step == "check_availability":
                check_in = arguments.get("check_in")
                check_out = arguments.get("check_out")
                guests = str(arguments.get("guests", "2"))

                # Fill check-in date
                if selectors.get("check_in_input"):
                    await page.fill(selectors["check_in_input"], check_in, timeout=5000)

                # Fill check-out date
                if selectors.get("check_out_input"):
                    await page.fill(selectors["check_out_input"], check_out, timeout=5000)

                # Fill guests count
                if selectors.get("guests_input"):
                    try:
                        await page.select_option(selectors["guests_input"], guests, timeout=5000)
                    except Exception:
                        try:
                            await page.fill(selectors["guests_input"], guests, timeout=5000)
                        except Exception:
                            pass

                # Click search button
                if selectors.get("search_button"):
                    await page.click(selectors["search_button"], timeout=5000)
                    await page.wait_for_timeout(1500)

                # Extract rooms
                rooms = await page.evaluate("""
                    () => {
                        const results = [];
                        const cards = document.querySelectorAll('.room-card, .room-item, [data-room-id]');
                        cards.forEach(c => {
                            const title = c.querySelector('.room-title, h3, h4')?.innerText?.trim();
                            const desc = c.querySelector('.room-desc, p')?.innerText?.trim();
                            const price = c.querySelector('.room-price, .price')?.innerText?.trim();
                            if (title) {
                                results.push({ title, description: desc, price });
                            }
                        });
                        return results;
                    }
                """)

                # Take screenshot
                filename = f"action_{int(time.time())}.png"
                await page.screenshot(path=str(SCREENSHOT_DIR / filename))

                return ToolCallResponse(
                    tool_name=tool_name,
                    success=True,
                    data={
                        "hotel": config.hotel_name,
                        "check_in": check_in,
                        "check_out": check_out,
                        "guests": guests,
                        "rooms_count": len(rooms),
                        "available_rooms": rooms
                    },
                    screenshot_url=f"/static/screenshots/{filename}"
                )

            # Step 2: Reserve Room Action
            elif tool_def.execution_step == "reserve_room":
                room_title = arguments.get("room_title", "")
                guest_name = arguments.get("guest_name", "")
                guest_email = arguments.get("guest_email", "")
                guest_phone = arguments.get("guest_phone", "")
                special_requests = arguments.get("special_requests", "")

                # 1. Trigger search first if needed so rooms appear
                try:
                    search_btn = page.locator("#btn-search-rooms, button:has-text('Search')").first
                    if await search_btn.is_visible():
                        await search_btn.click()
                        await page.wait_for_timeout(1000)
                except Exception:
                    pass

                # 2. Click reserve button for the matching room or first room
                reserve_clicked = False
                if room_title:
                    try:
                        room_card = page.locator(f".room-card:has-text('{room_title}')").first
                        if await room_card.is_visible():
                            book_btn = room_card.locator("button, .btn-book").first
                            await book_btn.click()
                            reserve_clicked = True
                    except Exception:
                        pass

                if not reserve_clicked:
                    # Fallback to first available booking button
                    try:
                        first_book = page.locator(".btn-book, button:has-text('Reserve'), button:has-text('Book')").first
                        await first_book.click()
                    except Exception:
                        pass

                await page.wait_for_timeout(800)

                # 3. Fill reservation form
                if selectors.get("guest_name_input"):
                    await page.fill(selectors["guest_name_input"], guest_name)
                if selectors.get("guest_email_input"):
                    await page.fill(selectors["guest_email_input"], guest_email)
                if selectors.get("guest_phone_input") and guest_phone:
                    await page.fill(selectors["guest_phone_input"], guest_phone)
                if selectors.get("special_requests_input") and special_requests:
                    await page.fill(selectors["special_requests_input"], special_requests)

                # 4. Click confirm button
                confirm_btn = selectors.get("confirm_button", "#btn-confirm-reservation")
                await page.click(confirm_btn)
                await page.wait_for_timeout(1500)

                # 5. Extract confirmation details
                conf_text = await page.evaluate("""
                    () => {
                        const confEl = document.querySelector('#confirmation-view, .confirmation-card, .success-message');
                        if (confEl) {
                            return confEl.innerText.trim();
                        }
                        return 'Reservation request submitted.';
                    }
                """)

                # Take confirmation screenshot
                filename = f"confirm_{int(time.time())}.png"
                await page.screenshot(path=str(SCREENSHOT_DIR / filename))

                return ToolCallResponse(
                    tool_name=tool_name,
                    success=True,
                    data={
                        "status": "confirmed",
                        "hotel": config.hotel_name,
                        "room_title": room_title,
                        "guest_name": guest_name,
                        "guest_email": guest_email,
                        "confirmation_summary": conf_text
                    },
                    screenshot_url=f"/static/screenshots/{filename}"
                )

            # Step 3: Screenshot only
            else:
                filename = f"screenshot_{int(time.time())}.png"
                await page.screenshot(path=str(SCREENSHOT_DIR / filename))
                return ToolCallResponse(
                    tool_name=tool_name,
                    success=True,
                    data={"title": await page.title(), "url": page.url},
                    screenshot_url=f"/static/screenshots/{filename}"
                )

        except Exception as e:
            return ToolCallResponse(
                tool_name=tool_name,
                success=False,
                error=str(e)
            )
        finally:
            await browser.close()
