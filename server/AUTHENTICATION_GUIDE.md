# 🔐 Google Cloud Authentication Setup Guide

## ✅ **RECOMMENDED: Application Default Credentials (ADC)**

You're now using the **Google-recommended approach** for local development!

### **What We Just Set Up:**
✅ **Application Default Credentials** - No service account keys needed  
✅ **Automatic authentication** - Uses your Google account  
✅ **Secure** - No sensitive files to manage  
✅ **Production-ready** - Same approach used in Cloud Run  

### **How It Works:**
1. **Local Development**: Uses your Google account credentials
2. **Production (Cloud Run)**: Uses assigned service account automatically
3. **No key files**: Everything handled by Google Cloud SDK

### **Current Status:**
```
✅ Authentication: Application Default Credentials
✅ Project ID: 49889892103
✅ Processor ID: f263a529ecfd3487
✅ Server: Running on http://localhost:3001
```

## **Test Your Setup:**

### **1. Health Check:**
```bash
curl http://localhost:3001/api/health
```

### **2. Test Receipt Processing:**
1. Go to your frontend: `http://localhost:5173`
2. Navigate to "Scan Receipt"
3. Upload any image
4. It should process using **real Google Cloud Document AI**!

## **For Production Deployment (Cloud Run):**

### **Step 1: Create Service Account (For Cloud Run)**
```bash
# Create service account
gcloud iam service-accounts create receiptwise-processor \
    --display-name="ReceiptWise Document AI Processor" \
    --description="Service account for ReceiptWise Document AI processing"

# Grant Document AI API User role
gcloud projects add-iam-policy-binding 49889892103 \
    --member="serviceAccount:receiptwise-processor@49889892103.iam.gserviceaccount.com" \
    --role="roles/documentai.apiUser"
```

### **Step 2: Deploy to Cloud Run**
```bash
# Build and deploy
gcloud run deploy receiptwise-backend \
    --source . \
    --platform managed \
    --region us-central1 \
    --service-account receiptwise-processor@49889892103.iam.gserviceaccount.com \
    --project 49889892103 \
    --allow-unauthenticated
```

### **Step 3: Your Code Automatically Authenticates**
No changes needed! The same code works in both environments:
- **Local**: Uses Application Default Credentials
- **Cloud Run**: Uses assigned service account automatically

## **Alternative: Service Account Key (Not Recommended)**

If you absolutely need service account keys for some reason:

### **Step 1: Create Service Account**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Create service account with **Document AI API User** role

### **Step 2: Download Key**
1. Click on service account → **Keys** tab
2. **Add Key** → **Create new key** → **JSON**
3. Save as `credentials/service-account-key.json`

### **Step 3: Update .env**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json
```

## **Troubleshooting**

### **Error: "Authentication failed"**
```bash
# Re-authenticate
gcloud auth application-default login
gcloud auth application-default set-quota-project 49889892103
```

### **Error: "API not enabled"**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Library**
3. Search for "Document AI API"
4. Click **Enable**

### **Error: "Processor not found"**
- Verify PROJECT_ID: `49889892103`
- Verify PROCESSOR_ID: `f263a529ecfd3487`
- Check processor is enabled in Document AI Console

## **Security Benefits of ADC:**

✅ **No sensitive files** in your codebase  
✅ **Automatic credential rotation**  
✅ **Environment-specific authentication**  
✅ **Google Cloud best practices**  
✅ **Same approach for local and production**  

## **Next Steps:**

1. **Test the frontend** - Upload a receipt image
2. **Verify processing** - Check extracted data
3. **Deploy to Cloud Run** - When ready for production
4. **Monitor usage** - Track API calls and costs

Your ReceiptWise app is now using **Google Cloud best practices** for authentication! 🎉
