#!/usr/bin/env bash
# nixos-anywhere `extra_files_script`: runs in a temporary directory whose
# content is copied to the VM's / at install time.
# TF_VAR_basic_auth_hash is exported by the `tf` wrapper from secrets/tofu.yaml.
set -euo pipefail

install -d -m 0700 etc/caddy-secrets
umask 077
printf 'BASIC_AUTH_HASH=%s\n' "${TF_VAR_basic_auth_hash:?run through the tf wrapper (nix develop)}" > etc/caddy-secrets/env
