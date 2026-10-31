{
  modulesPath,
  server,
  ...
}:
{
  imports = [
    (modulesPath + "/profiles/qemu-guest.nix")
    ./disk.nix
    ./backend.nix
    ./caddy.nix
  ];

  assertions = [
    {
      assertion = server.ssh_public_keys != [ ];
      message = "server.json: add at least one public key to `ssh_public_keys`, or you will be locked out.";
    }
  ];

  boot.loader.grub = {
    efiSupport = true;
    efiInstallAsRemovable = true;
  };

  networking = {
    hostName = server.name;
    useDHCP = false;
    useNetworkd = true;
    enableIPv6 = false;
  };

  systemd.network.networks."10-lan" = {
    matchConfig.Name = "en*";
    address = [ "${server.ip}/${toString server.network.prefix_length}" ];
    routes = [ { Gateway = server.network.gateway; } ];
    dns = server.network.dns;
  };

  services.qemuGuest.enable = true;

  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      KbdInteractiveAuthentication = false;
      PermitRootLogin = "prohibit-password";
    };
  };

  users.users.root.openssh.authorizedKeys.keys = server.ssh_public_keys;

  # The VM is reachable from the Internet (1:1 NAT on its public IP).
  services.fail2ban = {
    enable = true;
    bantime = "1h";
    bantime-increment = {
      enable = true;
      maxtime = "168h";
    };
    ignoreIP = [
      "10.0.0.0/8"
      "172.16.0.0/12"
      "192.168.0.0/16"
    ];
  };

  # Pulls the repository and deploys this configuration when main changes. It
  # selects the flake's configuration from the hostname.
  services.comin = {
    enable = true;
    repositorySubdir = "code/infra";
    remotes = [
      {
        name = "origin";
        url = "https://github.com/vmbr068/baselhack-2026.git";
        branches.main.name = "main";
      }
    ];
  };

  nix = {
    settings.experimental-features = [
      "nix-command"
      "flakes"
    ];
    gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 14d";
    };
  };

  time.timeZone = "Europe/Paris";

  system.stateVersion = "26.05";
}
