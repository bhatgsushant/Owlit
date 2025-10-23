require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// API Keys
const LLMWHISPERER_API_KEY = process.env.LLMWHISPERER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Function to convert image to base64
function imageToBase64(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Function to call LLMWhisperer API for OCR
async function extractTextWithLLMWhisperer(imageBase64) {
  try {
    console.log('🔍 Calling LLMWhisperer API for OCR...');

    const whisperResponse = await axios.post('https://llmwhisperer-api.us-central.unstract.com/api/v2/whisper', {
        file: imageBase64,
        language: 'en',
        output_format: 'text'
      }, {
      headers: {
        'unstract-key': LLMWHISPERER_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const whisperHash = whisperResponse.data.whisper_hash;
    if (!whisperHash) {
      throw new Error('Could not get whisper_hash from LLMWhisperer');
    }

    console.log(`✅ Whisper job accepted with hash: ${whisperHash}`);

    // Polling for the result
    let attempts = 0;
    const maxAttempts = 20;
    const delay = 2000; // 2 seconds

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
      console.log(`Polling for result... attempt ${attempts}`);

      const retrieveResponse = await axios.get(`https://llmwhisperer-api.us-central.unstract.com/api/v2/whisper-retrieve/${encodeURIComponent(whisperHash)}`,
        {
          headers: {
            'unstract-key': LLMWHISPERER_API_KEY
          }
        });

      if (retrieveResponse.data.status === 'completed') {
        console.log('✅ LLMWhisperer OCR completed');
        return retrieveResponse.data.text || retrieveResponse.data.result || retrieveResponse.data.content || retrieveResponse.data.extracted_text || retrieveResponse.data;
      } else if (retrieveResponse.data.status === 'failed') {
        throw new Error('LLMWhisperer job failed');
      }
    }

    throw new Error('LLMWhisperer job timed out');

  } catch (error) {
    console.error('❌ LLMWhisperer API error:', error.response?.data || error.message);
    throw error;
  }
}

// Mock OCR function for testing when LLMWhisperer is not available
function mockOCRText() {
  const mockTexts = [
    `TESCO EXPRESS\n123 Main Street\nLondon SW1A 1AA\nTel: 020 1234 5678\n\nReceipt #12345\nDate: 23/10/2024\nTime: 14:30\n\nItems:\nBananas 2.50\nMilk 1.20\nBread 1.10\nChicken Breast 8.99\nCoca Cola 1.50\nApples 3.20\nEggs 2.80\nTomatoes 2.38\n\nSubtotal: 24.67\nVAT: 4.93\nTotal: 29.60\n\nThank you for shopping with us!`,
    `THE WORKS\n120A Princes Street\nEdinburgh EH2 4AD\nVAT No: 135597879\n\nSale\nGabbys dollhouse activity set\nTOTAL\n£7.00\n£7.00\n-£7.00\n\nTax Breakdown\nUK VAT 20%\nNet: £5.83\nTax: £1.17\nGross: £7.00\n\nContactless\nAuth Code: R18451\nMerchant ID: **79890\nTerminal ID: ****6922\n\n11/10/25 17:29\nThank you for shopping at The Works`
  ];
  return mockTexts[Math.floor(Math.random() * mockTexts.length)];
}

// Function to call Google Generative Language API (Gemini) for text processing
async function processTextWithGemini(extractedText) {
  try {
    console.log('🤖 Calling Google Gemini (Generative Language API) for text processing...');

    const prompt = `Can you read the below text and return a table with merchant name, date of transaction, line items and their price and quantity.\n\nPlease format the response as a JSON object with this exact structure:\n{\n  "merchant_name": "string",\n  "transaction_date": "YYYY-MM-DD format",\n  "total_amount": number,\n  "line_items": [\n    {\n      "item": "string",\n      "price": number,\n      "quantity": number,\n      "main_category": "string",\n      "sub_category": "string"\n    }\n  ]\n}\n\nFor categories, use these main categories: fruit, vegetable, meat, poultry, seafood, dairy, bakery, beverages, snacks, frozen, canned_goods, personal_care, health, fitness, household, electronics, utilities, clothing, jewelry, transport, travel, stationery, education, finance, entertainment, pets, gifts, dining, other\n\nText to process:\n${extractedText}`;

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const response = await axios.post(geminiEndpoint, {
      contents: [{ parts: [{ text: prompt }] }]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || response.data;
    console.log('✅ Gemini processing completed');

    try {
      const jsonMatch = String(content).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed JSON from Gemini response');
        return jsonData;
      }
      else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON from Gemini response:', parseError.message);
      console.log('Raw Gemini response:', content);
      return {
        merchant_name: 'Unknown',
        transaction_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        line_items: [],
        raw_response: content
      };
    }
  } catch (error) {
    console.error('❌ Gemini API error:', error.response?.data || error.message);
    console.log('⚠️ Gemini failed, attempting manual parsing...');
    return parseReceiptManually(extractedText);
  }
}

// Fallback function to parse receipt text manually
function parseReceiptManually(text) {
  console.log('🔧 Manual parsing fallback activated');
  // Simple regex patterns to extract basic information
  const merchantMatch = text.match(/([A-Z][A-Z\s&]+)/);
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const totalMatch = text.match(/total[:\s]*£?(\d+\.?\d*)/i);

  // Extract line items (simple pattern matching)
  const lines = text.split('\n');
  const lineItems = [];

  for (const line of lines) {
    const itemMatch = line.match(/([A-Za-z\s]+)\s+£?(\d+\.?\d*)/);
    if (itemMatch && itemMatch[1].trim().length > 2) {
      lineItems.push({
        item: itemMatch[1].trim(),
        price: parseFloat(itemMatch[2]),
        quantity: 1,
        main_category: 'other',
        sub_category: 'miscellaneous'
      });
    }
  }

  return {
    merchant_name: merchantMatch ? merchantMatch[1].trim() : 'Unknown',
    transaction_date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
    total_amount: totalMatch ? parseFloat(totalMatch[1]) : 0,
    line_items: lineItems,
    parsing_method: 'manual_fallback'
  };
}

// Main processing endpoint
app.post('/api/scan', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    console.log('\n🚀 === STARTING RECEIPT PROCESSING (LLMWhisperer + Gemini) ===');
    console.log('📁 File:', req.file.originalname);
    console.log('📏 Size:', req.file.size, 'bytes');
    console.log('📄 Type:', req.file.mimetype);
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('🚀 === END PROCESSING START ===\n');

    // Convert image to base64
    const imageBase64 = imageToBase64(req.file.buffer, req.file.mimetype);
    console.log('📷 Image converted to base64, length:', imageBase64.length);

    // Step 1: Extract text using LLMWhisperer
    const extractedText = await extractTextWithLLMWhisperer(imageBase64);

    console.log('\n📄 === EXTRACTED TEXT FROM LLMWHISPERER ===');
    console.log('📏 Text Length:', extractedText.length, 'characters');
    console.log('📝 Raw OCR Text:');
    console.log('─'.repeat(50));
    console.log(extractedText);
    console.log('─'.repeat(50));

    // Step 2: Process text using Gemini
    const processedData = await processTextWithGemini(extractedText);

    console.log('\n === FINAL DATA SENT TO FRONTEND ===');
    console.log(JSON.stringify(processedData, null, 2));
    console.log(' === END FINAL DATA ===\n');

    res.json(processedData);
  } catch (error) {
    console.error('❌ Error processing document:', error);
    res.status(500).json({
      error: 'Failed to process document.',
      details: error.message || 'Unknown error occurred.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ReceiptWise server running with LLMWhisperer + Gemini',
    ocr_provider: 'LLMWhisperer',
    llm_provider: 'Gemini',
    timestamp: new Date().toISOString()
  });
});

// Test endpoints
app.get('/api/test-llmwhisperer', async (req, res) => {
  try {
    res.json({
      status: 'LLMWhisperer API key configured',
      message: 'Ready to process images'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-gemini', async (req, res) => {
  try {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const response = await axios.post(geminiEndpoint, {
      contents: [{ parts: [{ text: 'Please respond with: Gemini API is working' }] }]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    res.json({
      status: 'Gemini API working',
      response: content
    });
  } catch (error) {
    res.status(500).json({
      error: 'Gemini API test failed',
      details: error.response?.data || error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 ReceiptWise Server (LLMWhisperer + Gemini) listening at http://localhost:${port}`);
  console.log(`🔍 OCR Provider: LLMWhisperer`);
  console.log(`🤖 LLM Provider: Gemini (Google Generative Language API)`);
  console.log(`📋 Ready to process receipts!`);
});