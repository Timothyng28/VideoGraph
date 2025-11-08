#!/bin/bash

# Configure CORS on Google Cloud Storage bucket
# This allows the frontend to load videos with crossOrigin="anonymous"

BUCKET_NAME="vid-gen-static"

echo "Configuring CORS on GCS bucket: $BUCKET_NAME"
echo "================================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo ""
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "❌ Error: Not authenticated with gcloud"
    echo ""
    echo "Run: gcloud auth login"
    exit 1
fi

# Apply CORS configuration
echo "Applying CORS configuration..."
gsutil cors set gcs-cors-config.json gs://$BUCKET_NAME

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "Your bucket now allows:"
    echo "  - localhost:3000 (React default)"
    echo "  - localhost:5173 (Vite default)"
    echo "  - All HTTPS origins"
    echo ""
    echo "You can now use crossOrigin=\"anonymous\" in your video elements."
    echo ""
    echo "To verify the configuration:"
    echo "  gsutil cors get gs://$BUCKET_NAME"
else
    echo ""
    echo "❌ Failed to apply CORS configuration"
    echo ""
    echo "Make sure you have permission to modify the bucket:"
    echo "  gsutil iam get gs://$BUCKET_NAME"
    exit 1
fi

