# 🔐 Google Cloud Authentication Setup Guide

## Current Status
✅ **Document AI Processor**: ReceiptsOCRProcessor (f263a529ecfd3487)  
✅ **Project ID**: 49889892103  
✅ **Region**: us  
❌ **Authentication**: Service account key missing  

## Quick Test (Mock Server)
The mock server is now running! You can test the frontend immediately:
- Upload any image file
- It will return sample receipt data
- Perfect for testing the UI

## Setting Up Real Google Cloud Authentication

### Step 1: Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **49889892103**
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **"Create Service Account"**
5. Fill in:
   - **Name**: `receiptwise-processor`
   - **Description**: `Service account for ReceiptWise Document AI processing`
6. Click **"Create and Continue"**

### Step 2: Grant Document AI API User Role
1. In "Grant this service account access to project":
2. Click **"Select a role"**
3. Search for **"Document AI"**
4. Select **"Document AI API User"** (`roles/documentai.apiUser`)
5. Click **"Continue"** → **"Done"**

### Step 3: Download Service Account Key
1. Click on your created service account
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **JSON** format
5. Click **"Create"** - this downloads a JSON file

### Step 4: Configure Local Environment
1. **Save the downloaded JSON file** as:
   ```
   /Users/sushantbhat/Desktop/NewApp/server/credentials/service-account-key.json
   ```

2. **Update .env file** (already created):
   ```bash
   # Google Cloud Configuration
   GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json
   
   # Document AI Configuration  
   PROJECT_ID=49889892103
   LOCATION=us
   PROCESSOR_ID=f263a529ecfd3487
   
   # Server Configuration
   PORT=3001
   ```

### Step 5: Switch to Real Server
Once you've completed the above steps:

```bash
# Stop mock server
pkill -f "mock-server.js"

# Start real server
cd /Users/sushantbhat/Desktop/NewApp/server
npm start
```

## Expected Output (Real Server)
```
Checking Google Cloud authentication...
Project ID: 49889892103
Location: us
Processor ID: f263a529ecfd3487
✅ Credentials file: ./credentials/service-account-key.json
Server listening at http://localhost:3001
```

## Troubleshooting

### Error: "Authentication failed"
- Check that `GOOGLE_APPLICATION_CREDENTIALS` points to the correct file
- Verify the JSON file is valid
- Ensure the service account has Document AI API User role

### Error: "Processor not found"
- Verify PROJECT_ID matches your Google Cloud project
- Check PROCESSOR_ID matches your Document AI processor
- Ensure the processor is enabled

### Error: "Permission denied"
- Verify the service account has the correct role
- Check that Document AI API is enabled in your project

## Current Mock Server Features
- ✅ Returns realistic receipt data
- ✅ Simulates processing delay
- ✅ Proper error handling
- ✅ Health check endpoint

## Next Steps
1. **Test the frontend** with the mock server
2. **Set up Google Cloud authentication** following the steps above
3. **Switch to real server** for production use
