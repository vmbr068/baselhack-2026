{ pkgs, lib, ... }:
let
  backend = pkgs.callPackage ./backend-package.nix { };
in
{
  # Port 3000 stays closed in the firewall: use an SSH tunnel until the URL
  # allowlist (#36) and the booking confirmation (#46) are in place.
  systemd.services.mcp-exchange-backend = {
    description = "MCP Exchange backend";
    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" ];
    wants = [ "network-online.target" ];

    environment = {
      NODE_ENV = "production";
      PORT = "3000";
      PUBLIC_BASE_URL = "https://api.bh2026.tekitup.net";
      CHROMIUM_PATH = lib.getExe pkgs.chromium;
      HOME = "/var/lib/mcp-exchange-backend";
    };

    # The backend resolves mock_hotel/, static/ and generated_servers/ from its
    # working directory.
    preStart = ''
      ln -sfn ${backend}/lib/backend/mock_hotel mock_hotel
    '';

    serviceConfig = {
      ExecStart = "${lib.getExe pkgs.nodejs_24} ${backend}/lib/backend/dist/main.js";
      DynamicUser = true;
      StateDirectory = "mcp-exchange-backend";
      WorkingDirectory = "/var/lib/mcp-exchange-backend";
      # Holds APPROVER_PASSWORD, kept out of the Nix store. Create it on the VM
      # (root, mode 600). Without it, nobody can approve a booking.
      EnvironmentFile = "-/etc/mcp-exchange-backend.env";
      Restart = "on-failure";
      RestartSec = 5;
    };
  };
}
