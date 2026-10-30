import asyncio
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import uvicorn
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from scanner import scan_website
from synthesizer import synthesize_mcp_server
from codegen import generate_standalone_mcp_script
from executor import execute_tool

console = Console()

async def run_scan(url: str):
    console.print(f"[bold cyan]Scanning:[/bold cyan] {url}...")
    scan = await scan_website(url)
    
    table = Table(title="Extracted Web Elements")
    table.add_column("Category", style="cyan")
    table.add_column("Count", style="green")
    table.add_column("Details", style="yellow")
    
    table.add_row("Form Inputs", str(len(scan.inputs)), ", ".join([f.field_type for f in scan.inputs[:5]]))
    table.add_row("Action Buttons", str(len(scan.buttons)), ", ".join([b.text for b in scan.buttons[:4]]))
    table.add_row("Room Cards", str(len(scan.detected_rooms)), ", ".join([r.title for r in scan.detected_rooms[:3]]))
    console.print(table)

    console.print("\n[bold magenta]Synthesizing MCP Schema...[/bold magenta]")
    config = synthesize_mcp_server(scan)
    script_path = generate_standalone_mcp_script(config)

    console.print(Panel(
        f"[bold green]MCP Server Created Successfully![/bold green]\n\n"
        f"• [bold]Hotel Name:[/bold] {config.hotel_name}\n"
        f"• [bold]Server ID:[/bold] {config.server_id}\n"
        f"• [bold]Tools Generated:[/bold] {', '.join([t.name for t in config.tools])}\n"
        f"• [bold]Standalone Script:[/bold] {script_path}",
        title="✨ Dynamic MCP Generator"
    ))

def start_server(port: int = 8000):
    console.print(f"[bold green]Starting MCP Exchange Backend on http://localhost:{port}[/bold green]")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True, app_dir=str(CURRENT_DIR))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "scan":
        target = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000/mock-hotel"
        asyncio.run(run_scan(target))
    else:
        start_server()
