{ pkgs, ... }:
let
  frontend = pkgs.callPackage ./frontend-package.nix { };
  basicAuth = ''
    basic_auth {
      demo {$BASIC_AUTH_HASH}
    }
  '';
in
{
  # The basic auth keeps the API private until the URL allowlist (#36) and the
  # booking confirmation (#46) are in place. The password hash stays out of this
  # public repository: /etc/caddy-secrets/env sets BASIC_AUTH_HASH on the VM.
  services.caddy = {
    enable = true;
    environmentFile = "/etc/caddy-secrets/env";
    virtualHosts."api.bh2026.tekitup.net".extraConfig = ''
      ${basicAuth}
      reverse_proxy localhost:3000
    '';
    # The frontend calls the API on its own origin, so it needs no CORS.
    virtualHosts."app.bh2026.tekitup.net".extraConfig = ''
      ${basicAuth}
      @backend path /api/* /mock-hotel* /static/*
      handle @backend {
        reverse_proxy localhost:3000
      }
      handle {
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
