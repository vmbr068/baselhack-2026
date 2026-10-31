variable "proxmox_endpoint" {
  description = "URL of the Proxmox VE API"
  type        = string
  default     = "https://pve.tekitup.net/"
}

variable "proxmox_api_token" {
  description = "Proxmox API token, format user@realm!tokenid=secret (from secrets/tofu.yaml)"
  type        = string
  sensitive   = true
}

variable "state_passphrase" {
  description = "Passphrase encrypting the OpenTofu state and plans (from secrets/tofu.yaml, at least 16 characters)"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Accept a self-signed TLS certificate on the Proxmox API"
  type        = bool
  default     = false
}

variable "proxmox_node" {
  description = "Name of the Proxmox node hosting the VM"
  type        = string
  default     = "HV-MUL-TIU-SEA"
}

variable "vm_datastore_id" {
  description = "Datastore for the VM disk and cloud-init drive"
  type        = string
  default     = "proxmox-storage"
}

variable "image_datastore_id" {
  description = "Datastore (with the 'import' content type) where the cloud image is downloaded"
  type        = string
  default     = "proxmox-storage"
}

variable "network_bridge" {
  description = "Proxmox bridge the VM is attached to"
  type        = string
  default     = "vmbr0"
}

variable "vlan_id" {
  description = "VLAN tag of the VM network interface (null for untagged)"
  type        = number
  default     = 4020
}

variable "cloud_image_url" {
  description = "Cloud image the VM is created from"
  type        = string
  default     = "https://cloud.debian.org/images/cloud/trixie/latest/debian-13-genericcloud-amd64.qcow2"
}
