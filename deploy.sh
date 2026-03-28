#!/bin/bash
set -euo pipefail

REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "==> Logging into ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_BASE"

echo "==> Building & pushing backend..."
docker build -t chamapesa-backend ./backend
docker tag chamapesa-backend:latest "$ECR_BASE/chamapesa-backend:latest"
docker push "$ECR_BASE/chamapesa-backend:latest"

echo "==> Building & pushing dashboard..."
ALB_URL=$(cd infra && terraform output -raw alb_dns_name)
docker build --build-arg NEXT_PUBLIC_API_URL="http://$ALB_URL" -t chamapesa-dashboard ./dashboard
docker tag chamapesa-dashboard:latest "$ECR_BASE/chamapesa-dashboard:latest"
docker push "$ECR_BASE/chamapesa-dashboard:latest"

echo "==> Updating ECS services..."
aws ecs update-service --cluster chamapesa-cluster --service chamapesa-backend --force-new-deployment --region "$REGION" > /dev/null
aws ecs update-service --cluster chamapesa-cluster --service chamapesa-dashboard --force-new-deployment --region "$REGION" > /dev/null

echo "==> Deploy complete! Waiting for services to stabilize..."
aws ecs wait services-stable --cluster chamapesa-cluster --services chamapesa-backend chamapesa-dashboard --region "$REGION" || true
echo "==> Checking service status..."
aws ecs describe-services --cluster chamapesa-cluster --services chamapesa-backend chamapesa-dashboard --region "$REGION" \
  --query "services[*].{name: serviceName, running: runningCount, desired: desiredCount}" --output table
