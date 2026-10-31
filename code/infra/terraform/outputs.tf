output "ssh" {
  description = "SSH command for the VM"
  value       = "ssh root@${local.server.public_ip}"
}
