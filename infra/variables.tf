variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project" {
  description = "Project name"
  type        = string
  default     = "chamapesa"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "chamapesa"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "mpesa_consumer_key" {
  description = "M-Pesa Daraja consumer key"
  type        = string
  sensitive   = true
}

variable "mpesa_consumer_secret" {
  description = "M-Pesa Daraja consumer secret"
  type        = string
  sensitive   = true
}

variable "mpesa_passkey" {
  description = "M-Pesa passkey"
  type        = string
  sensitive   = true
}

variable "mpesa_shortcode" {
  description = "M-Pesa shortcode"
  type        = string
  default     = "174379"
}

variable "mpesa_env" {
  description = "M-Pesa environment (sandbox or production)"
  type        = string
  default     = "sandbox"
}

variable "mpesa_b2c_shortcode" {
  description = "M-Pesa B2C shortcode"
  type        = string
  default     = "600000"
}

variable "mpesa_b2c_initiator" {
  description = "M-Pesa B2C initiator name"
  type        = string
  default     = "testapi"
}

variable "mpesa_b2c_password" {
  description = "M-Pesa B2C security credential"
  type        = string
  sensitive   = true
}
