{
  # The basic auth keeps the API private until the URL allowlist (#36) and the
  # booking confirmation (#46) are in place. The password hash stays out of this
  # public repository: /etc/caddy-secrets/env sets BASIC_AUTH_HASH on the VM.
  services.caddy = {
    enable = true;
    environmentFile = "/etc/caddy-secrets/env";
    virtualHosts."api.ba2026.tekitup.net".extraConfig = ''
      basic_auth {
        demo {$BASIC_AUTH_HASH}
      }
      reverse_proxy localhost:3000
    '';
  };

  networking.firewall.allowedTCPPorts = [
    80
    443
  ];
}
