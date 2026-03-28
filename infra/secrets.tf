# --- Secrets Manager (one secret per value for ECS injection) ---

locals {
  secrets = {
    DATABASE_URL          = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
    JWT_SECRET            = var.jwt_secret
    MPESA_CONSUMER_KEY    = var.mpesa_consumer_key
    MPESA_CONSUMER_SECRET = var.mpesa_consumer_secret
    MPESA_PASSKEY         = var.mpesa_passkey
    MPESA_SHORTCODE       = var.mpesa_shortcode
    MPESA_ENV             = var.mpesa_env
    MPESA_B2C_SHORTCODE   = var.mpesa_b2c_shortcode
    MPESA_B2C_INITIATOR   = var.mpesa_b2c_initiator
    MPESA_B2C_PASSWORD    = var.mpesa_b2c_password
  }
}

resource "aws_secretsmanager_secret" "app" {
  for_each = local.secrets
  name     = "${var.project}/${var.environment}/${each.key}"
}

resource "aws_secretsmanager_secret_version" "app" {
  for_each      = local.secrets
  secret_id     = aws_secretsmanager_secret.app[each.key].id
  secret_string = each.value
}
