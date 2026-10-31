{
  pkgs,
  config,
  hotelDemoSrc,
  ...
}:
let
  package = pkgs.callPackage ./hotel-demo-package.nix { inherit hotelDemoSrc; };
  apiDir = "${package}/lib/hotel-demo/apps/api";
  tsx = "${apiDir}/node_modules/.bin/tsx";
  databaseUrl = "postgresql://hotel@localhost/hotel?host=/run/postgresql";
  psql = "${config.services.postgresql.package}/bin/psql -d hotel -v ON_ERROR_STOP=1 -qtA";

  # Prisma's migrate command needs a schema engine that is unavailable in the
  # Nix sandbox, so the SQL migrations are applied and tracked here.
  initDatabase = pkgs.writeShellScript "hotel-demo-init-db" ''
    set -euo pipefail
    ${psql} -c 'CREATE TABLE IF NOT EXISTS nix_migrations (name text PRIMARY KEY)'
    for dir in ${apiDir}/prisma/migrations/*/; do
      name=$(basename "$dir")
      if [ -z "$(${psql} -c "SELECT 1 FROM nix_migrations WHERE name = '$name'")" ]; then
        ${psql} -1 -f "$dir/migration.sql" -c "INSERT INTO nix_migrations VALUES ('$name')"
      fi
    done
    # The seed deletes every booking, so it only runs on an empty database.
    if [ "$(${psql} -c 'SELECT count(*) FROM "Room"')" = 0 ]; then
      cd ${apiDir}
      ${tsx} prisma/seed.ts
    fi
  '';
in
{
  services.postgresql = {
    enable = true;
    ensureDatabases = [ "hotel" ];
    ensureUsers = [
      {
        name = "hotel";
        ensureDBOwnership = true;
      }
    ];
  };

  users.users.hotel = {
    isSystemUser = true;
    group = "hotel";
  };
  users.groups.hotel = { };

  systemd.services.hotel-demo-api = {
    description = "Hotel demo site API";
    wantedBy = [ "multi-user.target" ];
    after = [ "postgresql.target" ];
    requires = [ "postgresql.target" ];
    path = [ pkgs.nodejs_24 ];

    environment = {
      DATABASE_URL = databaseUrl;
      API_PORT = "3001";
      HOME = "/var/lib/hotel-demo";
      TSX_DISABLE_CACHE = "1";
    };

    serviceConfig = {
      User = "hotel";
      Group = "hotel";
      StateDirectory = "hotel-demo";
      WorkingDirectory = apiDir;
      ExecStartPre = initDatabase;
      ExecStart = "${tsx} src/index.ts";
      Restart = "on-failure";
      RestartSec = 5;
    };
  };

  # The NAT does not loop back to the VM's own public IP, so the scanner has to
  # reach this site through the local Caddy.
  networking.hosts."127.0.0.1" = [ "hotel.bh2026.tekitup.net" ];

  services.caddy.virtualHosts."hotel.bh2026.tekitup.net".extraConfig = ''
    handle /api/* {
      reverse_proxy localhost:3001
    }
    handle {
      root * ${package}/lib/hotel-demo/apps/web/dist
      try_files {path} /index.html
      file_server
    }
  '';
}
