{
  description = "MCP Exchange - NixOS VM on Proxmox, deployed with OpenTofu + nixos-anywhere";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    comin = {
      url = "github:nlewo/comin";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      disko,
      comin,
      ...
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      # Shared with OpenTofu (terraform/), so the VM settings are defined once.
      server = builtins.fromJSON (builtins.readFile ./server.json);
    in
    {
      nixosConfigurations.${server.name} = nixpkgs.lib.nixosSystem {
        inherit system;
        specialArgs = { inherit server; };
        modules = [
          disko.nixosModules.disko
          comin.nixosModules.comin
          ./nixos/configuration.nix
        ];
      };

      packages.${system}.backend = pkgs.callPackage ./nixos/backend-package.nix { };

      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          opentofu
          sops
          jq
          (writeShellApplication {
            name = "tf";
            runtimeInputs = [
              opentofu
              sops
              git
            ];
            text = ''
              root="$(git rev-parse --show-toplevel)/code/infra"
              while IFS='=' read -r key value; do
                export "TF_VAR_$key=$value"
              done < <(sops decrypt --output-type dotenv "$root/secrets/tofu.yaml")
              exec tofu -chdir="$root/terraform" "$@"
            '';
          })
        ];
      };

      formatter.${system} = pkgs.nixfmt;
    };
}
