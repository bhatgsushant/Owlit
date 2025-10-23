const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { categorizeItems } = require('./categorize.js');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// Mock data for testing
const mockReceiptData = {
  merchant_name: "Tesco Express",
  transaction_date: "2024-10-23",
  total_amount: 24.67,
  line_items: [
    {
      item: "Bananas",
      price: 2.50,
      main_category: "fruit",
      sub_category: "bananas"
    },
    {
      item: "Milk 2L",
      price: 1.20,
      main_category: "dairy",
      sub_category: "milk"
    },
    {
      item: "Bread Wholemeal",
      price: 1.10,
      main_category: "bakery",
      sub_category: "bread"
    },
    {
      item: "Chicken Breast",
      price: 8.99,
      main_category: "poultry",
      sub_category: "chicken"
    },
    {
      item: "Coca Cola",
      price: 1.50,
      main_category: "beverages",
      sub_category: "coca cola"
    },
    {
      item: "Apples",
      price: 3.20,
      main_category: "fruit",
      sub_category: "apples"
    },
    {
      item: "Eggs 12 pack",
      price: 2.80,
      main_category: "dairy",
      sub_category: "eggs"
    },
    {
      item: "Tomatoes",
      price: 2.38,
      main_category: "vegetable",
      sub_category: "tomatoes"
    }
  ]
};

app.post('/api/scan', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    console.log('📄 Processing file:', req.file.originalname, 'Size:', req.file.size, 'Type:', req.file.mimetype);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Mock processing completed successfully');
    res.json(mockReceiptData);
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
    message: 'Mock server running',
    processor: 'Mock Receipt Processor',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Mock server listening at http://localhost:${port}`);
  console.log(`📋 Using mock data for testing`);
  console.log(`🔧 To use real Google Cloud Document AI:`);
  console.log(`   1. Add your service account key to credentials/service-account-key.json`);
  console.log(`   2. Update .env with your actual PROJECT_ID`);
  console.log(`   3. Restart the server`);
});
