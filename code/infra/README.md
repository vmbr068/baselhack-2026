# Infrastructure

The repository holds everything needed to rebuild `mcp-exchange-01`. Secrets and
the OpenTofu state are versioned encrypted.

You need Nix with flakes and a PGP key listed in `.sops.yaml`.

## Deploy or rebuild the VM

From `code/infra`:

```bash
nix develop -c tf init
nix develop -c tf apply
ssh-keygen -R 191.96.88.105
```

Then commit `terraform/terraform.tfstate`: it changes on every apply.

## Daily changes

Merging to `main` is enough for the NixOS configuration, backend and frontend: comin
deploys them within minutes. Changes in `terraform/` or to the VM size in
`server.json` need `tf apply`.

The demo site lives in its own repository and is pinned in `flake.lock`, so its
changes are not deployed automatically. To deploy them, run
`nix flake update hotel-demo`, update `hash` in `nixos/hotel-demo-package.nix` if
its dependencies changed, then merge.

## Secrets

`secrets/tofu.yaml` holds the Proxmox token, the state passphrase and the Resend
API key. Read it with `sops decrypt secrets/tofu.yaml`.

`tf apply` writes the Resend key to `/etc/hotel-demo/env` only when it installs the
VM. To change it on a running VM, update that file too and restart
`hotel-demo-api`.

## Not kept across a rebuild

Generated MCPs and screenshots in `/var/lib/mcp-exchange-backend` are lost. Call
`/api/v1/generate` again to recreate them. Demo site bookings are lost too, and
its rooms are seeded again.
