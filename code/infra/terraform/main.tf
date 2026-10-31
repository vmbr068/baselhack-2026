locals {
  # Shared with the NixOS configuration (flake.nix), so the VM settings are
  # defined only once.
  server = jsondecode(file("${path.module}/../server.json"))
  flake  = "${path.module}/.."
}

# Downloaded by the Proxmox node as "import" content, so the VM disk can be
# imported from it through the API (no SSH access to the host needed).
resource "proxmox_download_file" "cloud_image" {
  content_type = "import"
  datastore_id = var.image_datastore_id
  node_name    = var.proxmox_node
  url          = var.cloud_image_url
  file_name    = "${local.server.name}-cloud-image.qcow2"
  overwrite    = false
}

resource "proxmox_virtual_environment_vm" "server" {
  name        = local.server.name
  description = "MCP Exchange - NixOS, managed by OpenTofu"
  tags        = ["mcp-exchange", "nixos", "opentofu"]
  node_name   = var.proxmox_node
  vm_id       = local.server.vm_id

  on_boot         = true
  stop_on_destroy = true
  machine         = "q35"
  bios            = "seabios"
  scsi_hardware   = "virtio-scsi-single"

  operating_system {
    type = "l26"
  }

  # The Debian cloud image does not ship the QEMU guest agent; waiting for it
  # would make OpenTofu hang.
  agent {
    enabled = false
  }

  cpu {
    cores = local.server.cores
    type  = "host"
  }

  memory {
    dedicated = local.server.memory
  }

  disk {
    datastore_id = var.vm_datastore_id
    import_from  = proxmox_download_file.cloud_image.id
    interface    = "scsi0"
    size         = local.server.disk
    discard      = "on"
    iothread     = true
    ssd          = true
  }

  network_device {
    bridge  = var.network_bridge
    vlan_id = var.vlan_id
  }

  # Debian cloud images expect a serial console.
  serial_device {}

  initialization {
    datastore_id = var.vm_datastore_id

    ip_config {
      ipv4 {
        address = "${local.server.ip}/${local.server.network.prefix_length}"
        gateway = local.server.network.gateway
      }
    }

    dns {
      servers = local.server.network.dns
    }

    user_account {
      username = "debian"
      keys     = local.server.ssh_public_keys
    }
  }

  lifecycle {
    # cloud-init only bootstraps the Debian image before nixos-anywhere runs:
    # once NixOS is installed, SSH keys and network come from server.json
    # through the NixOS configuration, so changing them must not touch the VM.
    ignore_changes = [initialization]
  }
}

# Replaces the Debian bootstrap image with NixOS on first apply, then deploys
# configuration changes on the following ones.
module "nixos" {
  source = "github.com/nix-community/nixos-anywhere//terraform/all-in-one?ref=1.13.0"

  nixos_system_attr      = "${local.flake}#nixosConfigurations.${local.server.name}.config.system.build.toplevel"
  nixos_partitioner_attr = "${local.flake}#nixosConfigurations.${local.server.name}.config.system.build.diskoScript"

  # Reached through the public IP (1:1 NAT): the VLAN is not routed to us.
  target_host        = local.server.public_ip
  install_user       = "debian"
  instance_id        = proxmox_virtual_environment_vm.server.id
  extra_files_script = "${path.module}/hotel-demo-secrets.sh"
}
