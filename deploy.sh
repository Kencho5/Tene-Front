#!/bin/bash

ECR_REGION="eu-central-1"
ECR_URI="037721735321.dkr.ecr.eu-central-1.amazonaws.com/tene-front"
IMAGE_TAG="${1:-latest}"

aws ecr get-login-password --region $ECR_REGION --profile tene | docker login --username AWS --password-stdin 037721735321.dkr.ecr.eu-central-1.amazonaws.com

docker build --platform linux/amd64 -t tene-front:$IMAGE_TAG .
docker tag tene-front:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
docker push $ECR_URI:$IMAGE_TAG
