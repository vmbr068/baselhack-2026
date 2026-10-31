"""
Demo AI Agent that connects to the dynamic MCP server.
Enables natural language chat for hotel search and reservation in Basel.
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# Add directory to sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

from app import get_server_config
from executor import execute_tool

console = Console()

def confirm_reservation(arguments):
    console.print(
        f"\nReservation requested: {arguments.get('room_title', 'selected room')} "
        f"for {arguments.get('guest_name', 'guest')} ({arguments.get('guest_email', 'no email')})."
    )
    return Prompt.ask(
        "Type 'confirm' to submit this fictional booking",
        choices=["confirm", "cancel"],
        default="cancel",
    ) == "confirm"

async def simulate_agent_turn(user_message: str, server_id: str = "mcp_grand_hotel_basel"):
    """
    Connects an AI Agent reasoning loop to the generated MCP tools.
    Works with Google Gemini API if GEMINI_API_KEY is available,
    or runs an intelligent autonomous agent loop.
    """
    config = get_server_config(server_id)
    if not config:
        console.print(f"[bold red]Server '{server_id}' not found. Run generate first![/bold red]")
        return

    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)
        
        # Build tool definitions for Gemini
        tools = [
            types.Tool(function_declarations=[
                types.FunctionDeclaration(
                    name=t.name,
                    description=t.description,
                    parameters=t.parameters
                ) for t in config.tools
            ])
        ]

        system_instruction = (
            f"You are a helpful travel assistant for Basel hotels. "
            f"You have access to real-time hotel tools for {config.hotel_name}. "
            f"When a user asks to search or book a hotel, call the appropriate tools. "
            f"Always summarize the booking confirmation and details clearly."
        )

        chat = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=tools
            )
        )

        response = chat.send_message(user_message)
        
        # Check for function calls
        for part in response.candidates[0].content.parts:
            if part.function_call:
                fn = part.function_call
                console.print(f"\n[bold yellow]🤖 Agent decided to invoke MCP Tool:[/bold yellow] [cyan]{fn.name}[/cyan]")
                console.print(f"Arguments: {fn.args}")

                arguments = dict(fn.args)
                if fn.name == "reserve_room" and not confirm_reservation(arguments):
                    console.print("[yellow]Booking cancelled; no reservation was submitted.[/yellow]")
                    return
                
                # Execute tool via our Playwright engine
                tool_res = await execute_tool(config, fn.name, arguments)
                console.print(f"[bold green]✓ Playwright Execution Success:[/bold green] {tool_res.success}")
                if tool_res.screenshot_url:
                    console.print(f"📸 Screenshot: http://localhost:8000{tool_res.screenshot_url}")

                # Send tool response back to model
                follow_up = chat.send_message(
                    types.Part.from_function_response(
                        name=fn.name,
                        response={"result": tool_res.data}
                    )
                )
                console.print(f"\n[bold green]AI Assistant:[/bold green]\n{follow_up.text}")
                return

        console.print(f"\n[bold green]AI Assistant:[/bold green]\n{response.text}")

    else:
        # Heuristic intent parser if no API key is set yet
        console.print("[dim](No GEMINI_API_KEY found, using local autonomous agent engine)[/dim]")
        lower = user_message.lower()

        if any(w in lower for w in ["reserve", "book", "réserv", "prend"]):
            console.print(f"[bold yellow]🤖 Agent invoking MCP Tool:[/bold yellow] [cyan]reserve_room[/cyan]")
            args = {
                "room_title": "Deluxe Rhine View Suite",
                "guest_name": "Ada Example",
                "guest_email": "ada@example.invalid",
                "special_requests": "Vue sur le Rhin"
            }
            if not confirm_reservation(args):
                console.print("[yellow]Réservation annulée ; aucune réservation n'a été envoyée.[/yellow]")
                return
            res = await execute_tool(config, "reserve_room", args)
            console.print(Panel(
                f"[bold green]Réservation confirmée avec succès ![/bold green]\n\n"
                f"{res.data.get('confirmation_summary')}\n\n"
                f"📸 [cyan]Preuve visuelle (screenshot):[/cyan] http://localhost:8000{res.screenshot_url}",
                title=f"🏨 {config.hotel_name}"
            ))
        else:
            console.print(f"[bold yellow]🤖 Agent invoking MCP Tool:[/bold yellow] [cyan]check_availability[/cyan]")
            args = {"check_in": "2026-11-05", "check_out": "2026-11-08", "guests": 2}
            res = await execute_tool(config, "check_availability", args)
            rooms = res.data.get("available_rooms", [])
            rooms_text = "\n".join(f"• [bold]{r['title']}[/bold] - {r.get('price', 'CHF 250')} ({r.get('description', '')})" for r in rooms)
            console.print(Panel(
                f"Voici les chambres disponibles pour vos dates à Bâle :\n\n{rooms_text}\n\n"
                f"Voulez-vous que je réserve la suite pour vous ?",
                title="🔍 Disponibilités à Bâle"
            ))

async def main():
    console.print(Panel(
        "[bold cyan]Assistant IA Bâle 2026 (Connecté à votre MCP)[/bold cyan]\n\n"
        "Tapez votre demande en langage naturel (ex: 'Réserve un hôtel à Bâle pour 2 personnes')\n"
        "Tapez 'exit' pour quitter.",
        title="🤖 AI Agent Chat"
    ))
    
    while True:
        user_input = Prompt.ask("\n[bold]Vous[/bold]")
        if user_input.strip().lower() in ["exit", "quit", "q"]:
            break
        await simulate_agent_turn(user_input)

if __name__ == "__main__":
    asyncio.run(main())
