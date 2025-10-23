require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// The user's project and processor details
const projectId = process.env.PROJECT_ID || '49889892103';
const location = process.env.LOCATION || 'us';
const processorId = process.env.PROCESSOR_ID || 'f263a529ecfd3487';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


// Instantiates a client
const client = new DocumentProcessorServiceClient();

app.use(cors());

// Check authentication on startup
async function checkAuthentication() {
  try {
    console.log('Checking Google Cloud authentication...');
    console.log('Project ID:', projectId);
    console.log('Location:', location);
    console.log('Processor ID:', processorId);
    
    // Check for Application Default Credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('✅ Using service account key:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
      console.log('✅ Using Application Default Credentials (ADC)');
      console.log('   This is the recommended approach for local development');
    }
    
    // Test the client by making a simple request
    const parent = `projects/${projectId}/locations/${location}`;
    console.log('Testing authentication with parent:', parent);
    
    // Try to list processors to test authentication
    try {
      const [processors] = await client.listProcessors({ parent });
      console.log('✅ Authentication successful! Found', processors.length, 'processors');
    } catch (authError) {
      if (authError.code === 7) {
        console.error('❌ Authentication failed. Please run:');
        console.error('   gcloud auth application-default login');
        console.error('   gcloud auth application-default set-quota-project', projectId);
      } else {
        console.error('❌ Authentication test failed:', authError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Authentication check failed:', error.message);
    console.error('Please ensure you have:');
    console.error('1. Run: gcloud auth application-default login');
    console.error('2. Run: gcloud auth application-default set-quota-project', projectId);
    console.error('3. Document AI API enabled in your project');
  }
}

checkAuthentication();

const upload = multer({ storage: multer.memoryStorage() });

function formatDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split(' ')[0].split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateString; // return original if format is unexpected
}

// Function to call OpenAI API for text processing
async function processTextWithOpenAI(extractedText) {
  try {
    console.log('🤖 Calling OpenAI API for text processing...');

    const prompt = `
You are a receipt parsing assistant.

Extract the following from the OCR text and return it in JSON format:

- merchant: the store name
- transaction_date: the full transaction date and time if available
- items: an array of line items with
    - name: product name
    - quantity: number of items (assume 1 if missing)
    - price: price in GBP (£) as a number
    - category: the main category of the item
    - sub_category: the sub-category of the item

Rules:
1.  For 'category' and 'sub_category', use the following taxonomy.
    - Main Categories: 'fruit', 'vegetable', 'meat', 'poultry', 'seafood', 'dairy', 'bakery', 'beverages', 'snacks', 'frozen', 'canned_goods', 'personal_care', 'health', 'fitness', 'household', 'electronics', 'utilities', 'clothing', 'jewelry', 'transport', 'travel', 'stationery', 'education', 'finance', 'entertainment', 'pets', 'gifts', 'dining', 'other'
    - Sub-categories should be specific (e.g., for 'dairy', sub-categories could be 'milk', 'cheese', 'yogurt').
2.  If quantity is not explicitly mentioned, assume 1.
3.  The 'price' must be a number, do not include the currency symbol.
4.  **Do not include line items for "Discounts" or "special offers".**
5.  Ignore unrelated text, ads, or promotional lines.
6.  Return JSON only, no extra text or explanations.
7.  Use this exact structure:

{
  "merchant": "",
  "transaction_date": "",
  "items": [
    {"name": "", "quantity": 1, "price": 0.0, "category": "", "sub_category": ""}
  ]
}

OCR Text:
"""
${extractedText}
"""`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from OpenAI');

    // Try parsing JSON
    try {
      const jsonData = JSON.parse(content);
      console.log('✅ Successfully parsed JSON from OpenAI response');
      return jsonData;
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON directly, trying regex fallback...');
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log('✅ Parsed JSON using regex fallback');
        return jsonData;
      }

      console.error('❌ Could not parse OpenAI response into JSON');
      return {
        merchant: 'Unknown',
        transaction_date: new Date().toISOString(),
        items: [],
        raw_response: content
      };
    }
  } catch (error) {
    console.error('❌ OpenAI API error:', error.response?.data || error.message);
    return {
      merchant: 'Unknown',
      transaction_date: new Date().toISOString(),
      items: [],
      raw_response: extractedText
    };
  }
}


app.post('/api/scan', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    console.log('\n🚀 === STARTING RECEIPT PROCESSING (Document AI + OpenAI) ===');
    console.log('📁 File:', req.file.originalname);
    console.log('📏 Size:', req.file.size, 'bytes');
    console.log('📄 Type:', req.file.mimetype);
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    console.log('🔧 Using processor:', name);
    console.log('🚀 === END PROCESSING START ===\n');

    const request = {
      name,
      rawDocument: {
        content: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    console.log('Sending request to Document AI...');
    const [result] = await client.processDocument(request);
    const { document } = result;

    if (!document || !document.text) {
      throw new Error('No document text returned from Document AI');
    }

    const { text } = document;
    console.log('✅ Document AI processed successfully. Text length:', text.length);
    
    // Log the raw OCR text
    console.log('\n📄 === RAW OCR TEXT FROM DOCUMENT AI ===');
    console.log(text);
    console.log('📄 === END RAW OCR TEXT ===\n');
    
    // Step 2: Process text using OpenAI
    const processedData = await processTextWithOpenAI(text);

    // Step 3: Transform the data to match the frontend's expected schema
    const transformedData = {
        merchant_name: processedData.merchant,
        transaction_date: formatDate(processedData.transaction_date),
        line_items: (processedData.items || []).map(item => ({
            item: item.name,
            price: item.price,
            quantity: item.quantity,
            main_category: item.category,
            sub_category: item.sub_category
        })),
        total_amount: (processedData.items || []).reduce((acc, item) => acc + (item.price * item.quantity), 0)
    };


    // Log final data being sent to frontend
    console.log('\n📤 === FINAL DATA SENT TO FRONTEND ===');
    console.log(JSON.stringify(transformedData, null, 2));
    console.log('📤 === END FINAL DATA ===\n');

    console.log('✅ Extraction completed successfully');
    res.json(transformedData);
  } catch (error) {
    console.error('❌ Error processing document:', error);
    
    // Provide more specific error messages
    if (error.code === 7) {
      res.status(401).json({
        error: 'Authentication failed. Please check your Google Cloud credentials.',
        details: 'Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly.'
      });
    } else if (error.code === 5) {
      res.status(404).json({
        error: 'Document AI processor not found.',
        details: 'Please check your PROJECT_ID, LOCATION, and PROCESSOR_ID configuration.'
      });
    } else if (error.message.includes('permission')) {
      res.status(403).json({
        error: 'Permission denied.',
        details: 'Your service account does not have the required permissions for Document AI.'
      });
    } else {
      res.status(500).json({
        error: 'Failed to process document.',
        details: error.message || 'Unknown error occurred.'
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ReceiptWise server running (Document AI + OpenAI)',
    processor: `projects/${projectId}/locations/${location}/processors/${processorId}`,
    authentication: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Service Account Key' : 'Application Default Credentials',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
  console.log(`📋 Using Google Cloud Document AI`);
  console.log(`🤖 Using OpenAI API for structuring`);
});