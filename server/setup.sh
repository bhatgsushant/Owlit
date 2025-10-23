#!/bin/bash

echo "🔧 ReceiptWise Server Setup"
echo "=========================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your Google Cloud credentials:"
    echo "   1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account key file path"
    echo "   2. Update PROJECT_ID with your Google Cloud project ID"
    echo "   3. Update PROCESSOR_ID with your Document AI processor ID"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Check if credentials directory exists
if [ ! -d "credentials" ]; then
    echo "📁 Creating credentials directory..."
    mkdir -p credentials
    echo "✅ Created credentials directory"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Download your service account key from Google Cloud Console"
    echo "   2. Save it as 'service-account-key.json' in the credentials/ directory"
    echo "   3. Update the .env file with the correct path"
    echo ""
else
    echo "✅ Credentials directory already exists"
fi

# Check if service account key exists
if [ ! -f "credentials/service-account-key.json" ]; then
    echo "⚠️  Service account key not found!"
    echo "   Please download your service account key and save it as:"
    echo "   credentials/service-account-key.json"
    echo ""
else
    echo "✅ Service account key found"
fi

echo "🚀 Setup complete! Run 'npm start' to start the server."
