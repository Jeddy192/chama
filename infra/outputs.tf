output "alb_dns_name" {
  description = "ALB DNS name (use as M-Pesa callback base URL)"
  value       = aws_lb.main.dns_name
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_dashboard_url" {
  description = "ECR repository URL for dashboard"
  value       = aws_ecr_repository.dashboard.repository_url
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
}
