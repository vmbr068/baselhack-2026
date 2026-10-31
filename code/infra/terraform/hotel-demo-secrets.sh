#!/usr/bin/env bash
# nixos-anywhere `extra_files_script`: runs in a temporary directory whose
# content is copied to the VM's / at install time.
# TF_VAR_resend_api_key is exported by the `tf` wrapper from secrets/tofu.yaml.
set -euo pipefail

install -d -m 0700 etc/hotel-demo
umask 077
printf 'RESEND_API_KEY=%s\n' "${TF_VAR_resend_api_key:?run through the tf wrapper (nix develop)}" > etc/hotel-demo/env
