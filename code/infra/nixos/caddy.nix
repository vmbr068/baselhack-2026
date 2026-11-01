{ pkgs, ... }:
let
  frontend = pkgs.callPackage ./frontend-package.nix { };
in
{
  services.caddy = {
    enable = true;
    virtualHosts."api.bh2026.tekitup.net".extraConfig = ''
      reverse_proxy localhost:3000
    '';
    # The frontend calls the API on its own origin, so it needs no CORS.
    virtualHosts."app.bh2026.tekitup.net".extraConfig = ''
      @backend path /api/* /mock-hotel* /static/*
      handle @backend {
        reverse_proxy localhost:3000
      }
      # Static files only: compressing /api could buffer the agents' SSE stream.
      handle {
        encode zstd gzip
        root * ${frontend}
        file_server
      }
    '';
  };

  networking.firewall.allowedTCPPorts = [
    80
    443
  ];
}
