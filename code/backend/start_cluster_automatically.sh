#!/bin/bash

set -e

CLUSTER_NAME="cloud-computing-cluster"
IMAGE_NAME="cloud-backend:latest"

BACKEND_PORT=30080
SEAWEED_UI_PORT=30888
SEAWEED_S3_PORT=30333

# 1. Build Image
echo ""
echo "Building Docker image..."

docker build -t $IMAGE_NAME .

# 2. Reset Cluster
echo ""
echo "Resetting k3d cluster..."

if k3d cluster list | grep -q $CLUSTER_NAME; then
    k3d cluster delete $CLUSTER_NAME
fi

k3d cluster create $CLUSTER_NAME \
    --agents 2 \
    -p "30080:30080@loadbalancer" \
    -p "30333:30333@loadbalancer" \
    -p "30888:30888@loadbalancer"

# 3. Import Image
echo ""
echo "Importing image into cluster..."

k3d image import $IMAGE_NAME -c $CLUSTER_NAME

# 4. Deploy everything
echo ""
echo "Deploying Kubernetes resources..."

kubectl apply -f k3s/postgres-deployment.yaml
kubectl apply -f k3s/seaweed-deployment.yaml
kubectl apply -f k3s/backend-deployment.yaml

# 5. Wait till pods are ready
echo ""
echo "Waiting for pods..."

kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l app=seaweedfs --timeout=300s
kubectl wait --for=condition=ready pod -l app=backend --timeout=300s

echo ""
kubectl get pods
kubectl get svc

# 6. Healthcheck
echo ""
echo "Test Backend health..."

curl -s http://localhost:$BACKEND_PORT/health
echo ""