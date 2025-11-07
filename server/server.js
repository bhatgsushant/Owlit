

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { OpenAI } = require('openai');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { createWorker } = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const { SUB_CATEGORIES } = require('./categorize.js');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('./auth.js');
const supabase = require('./supabaseClient.js');
const crypto = require('crypto');
const {
  normalizeMerchantName,
  buildReceiptHash,
} = require('./utils/receiptHash.js');

class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf'
]);

const MAX_MARKDOWN_LENGTH = 20000;

const ensureEnvVar = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const handleApiError = (res, error, fallbackMessage = 'An unexpected error occurred.') => {
  if (error instanceof ValidationError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
};

const validateFields = (payload, schema) => {
  Object.entries(schema).forEach(([field, rules]) => {
    const value = payload[field];
    if (rules.required && (value === undefined || value === null || value === '')) {
      throw new ValidationError(rules.message || `${field} is required.`);
    }
    if (value === undefined || value === null) {
      return;
    }

    if (rules.type === 'string') {
      if (typeof value !== 'string') {
        throw new ValidationError(rules.message || `${field} must be a string.`);
      }
      if (rules.trim && value.trim().length === 0) {
        throw new ValidationError(rules.message || `${field} cannot be empty.`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        throw new ValidationError(rules.message || `${field} must be ${rules.maxLength} characters or fewer.`);
      }
      if (rules.allowed && !rules.allowed.includes(value)) {
        throw new ValidationError(rules.message || `${field} contains an invalid value.`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        throw new ValidationError(rules.message || `${field} is invalid.`);
      }
    } else if (rules.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new ValidationError(rules.message || `${field} must be a valid number.`);
      }
      if (rules.min !== undefined && value < rules.min) {
        throw new ValidationError(rules.message || `${field} must be at least ${rules.min}.`);
      }
    } else if (rules.type === 'array') {
      if (!Array.isArray(value)) {
        throw new ValidationError(rules.message || `${field} must be an array.`);
      }
    }

    if (typeof rules.validate === 'function') {
      const validationResult = rules.validate(value);
      if (validationResult !== true) {
        throw new ValidationError(
          typeof validationResult === 'string' ? validationResult : (rules.message || `${field} is invalid.`)
        );
      }
    }
  });
};

const safeJsonParse = (value, errorMessage) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new ValidationError(errorMessage);
  }
};

const validateLineItems = (lineItems = []) => {
  if (!Array.isArray(lineItems)) {
    throw new ValidationError('line_items must be an array.');
  }
  if (lineItems.length === 0) {
    throw new ValidationError('line_items must include at least one item.');
  }

  lineItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new ValidationError(`line_items[${index}] must be an object.`);
    }
    const name = item.item || item.name || item.Item_Name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ValidationError(`line_items[${index}] must include a valid item name.`);
    }
    const price = Number(item.price ?? item.Price ?? 0);
    if (Number.isNaN(price) || price < 0) {
      throw new ValidationError(`line_items[${index}] must include a valid non-negative price.`);
    }
    const quantity = Number(item.quantity ?? item.Quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ValidationError(`line_items[${index}] must include a valid quantity.`);
    }
  });
};

const isSupportedUpload = (mimeType = '') => {
  if (!mimeType) return false;
  return ALLOWED_UPLOAD_MIME_TYPES.has(mimeType.toLowerCase());
};

async function resolveMerchant(rawMerchantName, supabaseClient) {
  const alias = normalizeMerchantName(rawMerchantName);

  const { data: aliasMatch } = await supabaseClient
    .from("merchant_aliases")
    .select("merchant_id")
    .eq("alias", alias)
    .maybeSingle();

  if (aliasMatch) {
    return { merchant_id: aliasMatch.merchant_id, alias };
  }

  return { merchant_id: null, alias };
}

// --- Auth Middleware ---
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'User not authenticated' });
};


// --- Catch uncaught errors for debugging ---
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

console.log("🟢 Starting server...");

// --- Express App ---
const app = express();
const port = process.env.PORT || 3001;
const SESSION_SECRET = ensureEnvVar('SESSION_SECRET');

// --- OpenAI Setup ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in your .env file!');
} else {
    console.log('✅ Loaded OpenAI API Key');
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Google Document AI Setup ---
const DOCAI_PROJECT_ID = ensureEnvVar('DOCAI_PROJECT_ID');
const DOCAI_LOCATION = ensureEnvVar('DOCAI_LOCATION');
const DOCAI_PROCESSOR_ID = ensureEnvVar('DOCAI_PROCESSOR_ID');
const docAIClient = new DocumentProcessorServiceClient();
console.log('🧠 Initialized Google Document AI Client');

// --- Master Items ---
let masterItems = {}; // In-memory cache now fed from Supabase only


async function loadMasterItems() {
    console.log("🔄 Loading master items from Supabase...");
    const { data, error } = await supabase
        .from('master_items')
        .select('item_name, main_category, sub_category');

    if (error) {
        console.error('❌ Error loading master items from Supabase:', error);
        masterItems = {};
        return;
    }

    masterItems = {};

    for (const row of data) {
        masterItems[row.item_name.toLowerCase().trim()] = {
            main_category: row.main_category,
            sub_category: row.sub_category,
            Item_Name: row.item_name,
            receipt_ItemNames: [row.item_name]
        };
    }

    console.log(`✅ Loaded ${Object.keys(masterItems).length} items from Supabase.`);
}


async function saveMasterItem(itemName, main_category, sub_category) {
    await supabase
        .from('master_items')
        .upsert(
            { item_name: itemName, main_category, sub_category },
            { onConflict: 'item_name' }
        );

    masterItems[itemName.toLowerCase().trim()] = {
        main_category,
        sub_category,
        Item_Name: itemName,
        receipt_ItemNames: [itemName]
    };

    console.log(`💾 Saved to Supabase master_items: ${itemName}`);
}


// --- Middleware ---
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());

const upload = multer({ storage: multer.memoryStorage() });

// --- Helper Functions ---
async function preprocessImage(imageBuffer) {
    console.log('🔧 Preprocessing image...');
    return await sharp(imageBuffer).grayscale().linear(1.5, -128).sharpen().toBuffer();
}

async function runTesseract(imageBuffer) {
    console.log('🏃 Running Tesseract.js OCR prepass...');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();
    console.log('✅ Tesseract prepass complete.');
    return text;
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) throw new Error('Invalid date');
        return date.toISOString().split('T')[0];
    } catch (e) {
        return dateString;
    }
}

const CATEGORY_PROMPT_TEXT = `
**Taxonomy for Categorization:**
- fruit: ["apples", "bananas", "berries", "citrus", "tropical", "grapes", "melons", "stone_fruit"]
- vegetable: ["leafy_greens", "root_vegetables", "cruciferous", "peppers", "tomatoes", "onions", "mushrooms", "squash"]
- meat: ["beef", "pork", "lamb", "veal", "processed_meats"]
- poultry: ["chicken", "turkey", "duck"]
- seafood: ["fish", "shellfish", "frozen_seafood", "canned_seafood"]
- dairy: ["milk", "cheese", "yogurt", "butter", "cream", "eggs"]
- bakery: ["bread", "pastries", "cakes", "cookies", "bagels", "muffins"]
- beverages: ["water", "soft_drinks", "coca cola", "juice", "coffee", "tea", "beer", "wine", "spirits", "energy_drinks"]
- snacks: ["chips", "crackers", "nuts", "candy", "chocolate", "popcorn", "protein_bars"]
- frozen: ["ice_cream", "frozen_meals", "frozen_vegetables", "frozen_pizza", "frozen_desserts"]
- canned_goods: ["canned_vegetables", "canned_fruits", "canned_soups", "canned_beans", "canned_fish", "sauces"]
- personal_care: ["soap", "shampoo", "toothpaste", "deodorant", "skincare", "cosmetics", "razor"]
- health: ["medicines", "vitamins", "first_aid", "sanitizer", "pain_relief", "supplements"]
- fitness: ["gym_membership", "yoga", "protein_powder", "fitness_equipment"]
- household: ["cleaning_supplies", "paper_products", "laundry", "kitchen_supplies", "furniture", "decor","bin_bags","light_bulbs"]
- electronics: ["mobile", "laptop", "tv", "earphones", "chargers", "home_appliances", "batteries"]
- utilities: ["electricity", "gas", "water", "internet", "mobile_bill"]
- clothing: ["t_shirts", "jeans", "jackets", "dresses", "shoes", "accessories", "socks", "belts", "hats"]
- jewelry: ["necklace", "rings", "bracelet", "earrings", "watches"]
- transport: ["fuel", "parking", "bus", "train", "taxi", "uber", "bike_service"]
- travel: ["flight", "hotel", "restaurant", "tour", "car_rental", "visa_fee", "luggage"]
- stationery: ["pens", "notebooks", "printer_paper", "markers", "folders", "office_supplies"]
- education: ["books", "courses", "tuition", "software", "subscriptions", "school_fees"]
- finance: ["bank_fees", "interest", "investment", "insurance", "tax", "loan_repayment"]
- entertainment: ["movies", "music", "games", "subscriptions", "events", "streaming", "concerts"]
- pets: ["pet_food", "veterinary", "toys", "grooming"]
- gifts: ["birthday", "festival", "anniversary", "donation", "charity"]
- dining: ["restaurant", "takeaway", "coffee_shop", "fast_food", "pub", "bar"]
- other: ["miscellaneous"]
`;

async function processWithOpenAI(imageBase64, tesseractText = '') {
    const MAX_RETRIES = 2;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            console.log(`🤖 Calling OpenAI API (Attempt ${i + 1}/${MAX_RETRIES + 1})...`);
            const prompt = `


You are an OCR correction and structuring expert. 
Read every line of text from the provided receipt image carefully and logically correct OCR mistakes. 
Maintain numeric accuracy for prices and totals. 
${tesseractText ? `Tesseract.js pre-scanned the following text, which may contain errors. Use it as a hint, but trust the image more: 

${tesseractText}

` : ''}
${CATEGORY_PROMPT_TEXT}
Output clean structured JSON in this format:
{
  "MerchantName": "",
  "Date": "",
  "Items": [
     {"Name": "", "Quantity": 1, "Price": 0.0, "Category": "", "SubCategory": ""}
  ],
  "Subtotal": "",
  "Tax": "",
  "TotalAmount": ""
}
Return **only JSON**, no explanations.
`;
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: { url: 
`data:image/jpeg;base64,${imageBase64}` 
},
                            },
                        ],
                    },
                ],
                temperature: 0,
                max_tokens: 4000,
                response_format: { type: "json_object" },
            });
            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error('No content returned from OpenAI');
            const jsonData = JSON.parse(content);
            console.log('✅ Successfully parsed JSON from OpenAI response');
            return jsonData;
        } catch (error) {
            console.error(`❌ OpenAI API error on attempt ${i + 1}:`, error.message);
            if (i === MAX_RETRIES) {
                throw new Error('Failed to get a valid response from OpenAI after multiple retries.');
            }
            console.log('Retrying...');
        }
    }
}

async function processDocumentWithDocAI(buffer, mimeType) {
    console.log('🚀 Starting Document AI Processing...');
    const name = `projects/${DOCAI_PROJECT_ID}/locations/${DOCAI_LOCATION}/processors/${DOCAI_PROCESSOR_ID}`;
    const request = {
        name,
        rawDocument: {
            content: buffer.toString('base64'),
            mimeType: mimeType,
        },
    };
    try {
        const [result] = await docAIClient.processDocument(request);
        console.log('✅ Document AI processing complete.');
        return result.document.text;
    } catch (error) {
        console.error('❌ Google Document AI API error:', error);
        throw new Error('Failed to process document with Google Document AI.');
    }
}

async function structureTextWithOpenAI(text, tesseractHint = '') {
    console.log('🤖 Structuring text with OpenAI...');
    const MAX_RETRIES = 2;
    const jsonPrompt = `
Convert the OCR text from a receipt into structured JSON.

**OCR Text from Google Document AI:**
${text}

${tesseractHint ? `**Hint from Tesseract Pre-pass:**\n${tesseractHint}\n` : ''}

${CATEGORY_PROMPT_TEXT}

**JSON Structure:**
{
  "merchant": "",
  "transaction_date": "",
  "main_category": "",
  "store_type": "",
  "items": [
    {"name": "", "quantity": 1, "price": 0.0, "category": "", "sub_category": ""}
  ],
  "total_amount": 0.0
}

**Rules:**
1. Use the Google Document AI text as the primary source. Use the Tesseract hint to resolve ambiguities.
2. Quantity defaults to 1 if missing.
3. Price must be a number only (no currency symbols).
4. Assign a logical category/sub_category from the provided taxonomy for each item.
5. Based on the merchant name and items, infer the store's main_category (e.g., "Groceries", "Fashion", "Electronics") and store_type (e.g., "Supermarket", "Clothing Store", "Electronics Store").
6. Return **JSON only**, no explanations.
`;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: jsonPrompt }],
                temperature: 0,
                max_tokens: 4000,
                response_format: { type: "json_object" },
            });
            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error('No JSON content returned from OpenAI');
            const jsonData = JSON.parse(content);
            console.log('✅ OpenAI structuring complete.');
            return jsonData;
        } catch (error) {
            console.error(`❌ OpenAI API error on attempt ${i + 1}:`, error.message);
            if (i === MAX_RETRIES) {
                throw new Error('Failed to get a valid response from OpenAI for structuring after multiple retries.');
            }
            console.log('Retrying structuring...');
        }
    }
}

// New function to convert markdown to JSON
async function convertMarkdownToJSON(markdown) {
    console.log('🤖 Converting Markdown to JSON with OpenAI...');
    const prompt = `
        Convert this markdown document into a structured JSON format.
        Preserve the hierarchy and meaning of the document.
        Use clear, descriptive field names.

        **Markdown Content:**
        ${markdown}

        **Output:**
        Return only the structured JSON object.
    `;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4000,
            response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No JSON content returned from OpenAI');
        console.log('✅ OpenAI Markdown-to-JSON conversion complete.');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ OpenAI Markdown-to-JSON conversion error:', error.message);
        throw new Error('Failed to convert markdown to JSON with OpenAI.');
    }
}

// --- New Self-Learning Categorization Logic ---
function findInMasterList(itemName) {
    const lowercasedItem = itemName.toLowerCase().trim();
    // First, check for an exact match on a canonical name
    if (masterItems[lowercasedItem]) {
        return { ...masterItems[lowercasedItem] };

    }
    // Then, check all OCR variations
    for (const canonicalName in masterItems) {
        const itemData = masterItems[canonicalName];
        if (itemData.receipt_ItemNames.some(name => name.toLowerCase().trim() === lowercasedItem)) {
            return { ...itemData, Item_Name: canonicalName };
        }
    }
    return null;
}

function findInCategoryKeywords(itemName) {
    const lowercasedItem = itemName.toLowerCase().trim();
    for (const mainCategory in SUB_CATEGORIES) {
        for (const subCategory of SUB_CATEGORIES[mainCategory]) {
            if (lowercasedItem.includes(subCategory.replace('_', ' ')))
 {                return { main_category: mainCategory, sub_category: subCategory };
            }
        }
    }
    return null;
}

async function categorizeLineItems(lineItems, userId) {

    let isMasterListUpdated = false;
    const categorizedLineItems = [];

    for (const item of lineItems) {
        const rawItemName = item.name || item.Name || '';
        if (!rawItemName) continue;


// ✅ 1) Check user-specific category override *if* user is logged in
let userOverride = null;

if (userId) {
  const result = await supabase
    .from('user_categories')
    .select('main_category, sub_category')
    .eq('user_id', userId)
    .eq('item_name', rawItemName)
    .maybeSingle();

  userOverride = result.data;
}

let masterListEntry;

if (userOverride) {
  masterListEntry = {
    Item_Name: rawItemName,
    main_category: userOverride.main_category,
    sub_category: userOverride.sub_category
  };
  console.log(`🎨 Used USER-SPECIFIC category for "${rawItemName}"`);
} else {
  // ✅ Fallback to global master list
  masterListEntry = findInMasterList(rawItemName);
}



        if (masterListEntry) { // Found in master list
            categorizedLineItems.push({
                item: rawItemName,
                Item_Name: masterListEntry.Item_Name,
                main_category: masterListEntry.main_category,
                sub_category: masterListEntry.sub_category,
                price: parseFloat(item.price || item.Price) || 0,
                quantity: parseInt(item.quantity || item.Quantity, 10) || 1,
            });
            console.log(`🧠 Found "${rawItemName}" in master list as "${masterListEntry.Item_Name}".`);

            // Also check if this specific OCR variation is new and add it
            const canonicalEntry = masterItems[masterListEntry.Item_Name];
            const lowercasedRaw = rawItemName.toLowerCase().trim();
            if (canonicalEntry && !canonicalEntry.receipt_ItemNames.some(n => n.toLowerCase().trim() === lowercasedRaw)) {
                canonicalEntry.receipt_ItemNames.push(rawItemName);
                isMasterListUpdated = true;
                console.log(`🔄 Updated "${masterListEntry.Item_Name}" with new OCR variation: "${rawItemName}"`);
            }

        } else { // Not found in master list, needs to be added
            let categoryInfo = findInCategoryKeywords(rawItemName);
            const source = categoryInfo ? 'keywords' : 'openai';

            if (!categoryInfo) {
                categoryInfo = {
                    main_category: item.category || item.Category || 'other',
                    sub_category: item.sub_category || item.SubCategory || 'miscellaneous'
                };
            }

            const canonicalName = rawItemName; // Use the first seen name as canonical
            
            categorizedLineItems.push({
                item: rawItemName,
                Item_Name: canonicalName,
                main_category: categoryInfo.main_category,
                sub_category: categoryInfo.sub_category,
                price: parseFloat(item.price || item.Price) || 0,
                quantity: parseInt(item.quantity || item.Quantity, 10) || 1,
            });

            // Add the new item to the master list
           await saveMasterItem(
   canonicalName,
   categoryInfo.main_category,
   categoryInfo.sub_category
);

            console.log(`✨ Added "${canonicalName}" to master list from ${source}.`);
        }
    }

    
    return categorizedLineItems;
}

// --- API Routes ---
app.post('/api/scan', upload.single('file'), async (req, res) => {
    try {
        console.log("📥 Received file:", req.file ? req.file.originalname : "No file");
        if (!req.file) {
            throw new ValidationError('A file upload is required.');
        }

        if (!isSupportedUpload(req.file.mimetype)) {
            throw new ValidationError('Unsupported file type. Please upload a PDF or image.');
        }

        const scanMode = (req.body?.scanMode || 'receipt').toLowerCase();
        validateFields({ scanMode }, {
            scanMode: {
                type: 'string',
                required: true,
                allowed: ['receipt', 'document'],
                message: 'scanMode must be either "receipt" or "document".'
            }
        });

        if (scanMode === 'document') {
            console.log('🚀 === STARTING DOCUMENT PROCESSING ===');
            try {
                const rawText = await processDocumentWithDocAI(req.file.buffer, req.file.mimetype);
                const markdown = rawText.split('\n').join('  \n');
                res.setHeader('Content-Type', 'text/plain');
                return res.send(markdown);
            } catch (error) {
                return handleApiError(res, error, 'Failed to process document.');
            }
        }

        console.log('🚀 === STARTING RECEIPT PROCESSING ===');
        try {
            console.log(`⚙️ Using Google Document AI pipeline with Tesseract pre-pass.`);

            const preprocessedImageBuffer = await preprocessImage(req.file.buffer);

            const tesseractText = await runTesseract(preprocessedImageBuffer);

            const extractedText = await processDocumentWithDocAI(preprocessedImageBuffer, 'image/jpeg');
            
            const processedData = await structureTextWithOpenAI(extractedText, tesseractText);
            
            const lineItems = processedData.items || processedData.Items || [];
            const categorizedLineItems = await categorizeLineItems(lineItems, req.user?.id || null);

            const rawMerchant = processedData.merchant || processedData.MerchantName || '';
            const merchant_name = rawMerchant
              .toLowerCase()
              .replace(/[^a-z0-9 ]/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/\b\w/g, c => c.toUpperCase());

            let store_type = 'Other';
            let main_category = 'Other';
            const userId = req.user?.id || null;

            if (userId) {
                const { data: override } = await supabase
                    .from('user_store_type_overrides')
                    .select('store_type')
                    .eq('user_id', userId)
                    .eq('merchant_name', merchant_name)
                    .single();

                if (override) {
                    store_type = override.store_type;
                    console.log(`🎨 Used USER-SPECIFIC store type for "${merchant_name}": ${store_type}`);
                }
            }

            if (store_type === 'Other') {
                const { data: storeInfo, error: storeInfoError } = await supabase
                    .from('store_info')
                    .select('main_category, store_type')
                    .eq('merchant_name', merchant_name)
                    .maybeSingle();

                if (storeInfoError) {
                    console.error('Error fetching store info:', storeInfoError);
                }

                if (storeInfo) {
                    main_category = storeInfo.main_category;
                    store_type = storeInfo.store_type;
                } else {
                    main_category = processedData.main_category || 'Other';
                    store_type = processedData.store_type || 'Other';
                    if (store_type !== 'Other') {
                        const { error: insertError } = await supabase
                            .from('store_info')
                            .insert({
                                merchant_name,
                                main_category,
                                store_type,
                            });
                        if (insertError) {
                            console.error('Error inserting new store type:', insertError);
                        }
                    }
                }
            }

            const transformedData = {
              merchant_name,
              transaction_date: formatDate(processedData.transaction_date || processedData.Date),
              line_items: categorizedLineItems,
              total_amount: parseFloat(processedData.total_amount || processedData.TotalAmount) || 0,
              main_category,
              store_type,
            };

            console.log(`\n📤 === FINAL DATA SENT TO FRONTEND ===`);
            console.log(JSON.stringify(transformedData, null, 2));
            console.log("🟢 DATA SENT TO FRONTEND:", transformedData);
            return res.json(transformedData);

        } catch (error) {
            return handleApiError(res, error, 'Failed to process receipt.');
        }
    } catch (error) {
        return handleApiError(res, error, 'Failed to process upload.');
    }
});

app.post('/api/process-document', async (req, res) => {
    console.log('📥 Received markdown for processing');
    try {
        const { markdown } = req.body || {};
        validateFields({ markdown }, {
            markdown: {
                type: 'string',
                required: true,
                trim: true,
                maxLength: MAX_MARKDOWN_LENGTH,
                message: 'markdown content is required.'
            }
        });

        const structuredJson = await convertMarkdownToJSON(markdown);
        return res.json(structuredJson);
    } catch (error) {
        return handleApiError(res, error, 'Failed to convert markdown to JSON.');
    }
});

app.post('/api/summarize-markdown', async (req, res) => {
    console.log('📥 Received markdown for summarization');
    try {
        const { markdown } = req.body || {};
        validateFields({ markdown }, {
            markdown: {
                type: 'string',
                required: true,
                trim: true,
                maxLength: MAX_MARKDOWN_LENGTH,
                message: 'markdown content is required.'
            }
        });

    const prompt = `
        You are a document summarization expert specializing in creating clean, card-style layouts from raw text. Your task is to transform the following unstructured text into a well-organized Markdown summary.

        **Instructions:**
        1. **Create Clear Sections:** Use level-2 headings (##) to group related information (e.g., "Patient Information", "Medication", "Instructions").
        2. **Clean & Readable**: The layout must be clean and easy to read. Use bullet points (-) for lists.
        3. **No Raw Text**: Do not include irrelevant information or artifacts from the scanning process. Only present the final, clean information.
        4. **Card-Style Layout**: Use horizontal rules (---) to visually separate the major sections of the card (e.g., between the header, the main content, and a footer/notes section).
        5. **Output valid Markdown only.**

        **Raw Text:**
        ${markdown}

        **Formatted Card-Style Markdown Output:**
    `;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1500,
        });
        const structuredMarkdown = response.choices[0]?.message?.content;
        if (!structuredMarkdown) throw new Error('No content returned from OpenAI for summarization');
        
        console.log('✅ OpenAI summarization complete.');
        res.setHeader('Content-Type', 'text/plain');
        return res.send(structuredMarkdown);
    } catch (error) {
        return handleApiError(res, error, 'Failed to summarize markdown.');
    }
});

// --- Auth Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  }
);

app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

app.post('/auth/logout', (req, res) => {
    req.logout(err => {
        if (err) return res.status(500).json({ message: 'Error logging out' });
        req.session.destroy(err => {
            if (err) return res.status(500).json({ message: 'Error destroying session' });
            res.clearCookie('connect.sid');
            res.json({ message: 'Logged out successfully' });
        });
    });
});

// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'ReceiptWise server running' });
});

app.get('/api/store-info', isAuthenticated, async (req, res) => {
  const { data, error } = await supabase
    .from('store_info')
    .select('id, merchant_name, store_type')
    .order('merchant_name', { ascending: true });

  if (error) {
    console.error('Error fetching store info:', error);
    return res.status(500).json({ error: 'Failed to fetch store info' });
  }
  res.json(data);
});

// --- Receipt API Routes ---
app.get('/api/receipts', isAuthenticated, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

app.post('/api/receipts', isAuthenticated, upload.single('receiptImage'), async (req, res) => {
  try {
    const payload = req.body?.receiptData;
    if (!payload) {
      throw new ValidationError('receiptData payload is required.');
    }

    const receiptData = safeJsonParse(payload, 'receiptData must be valid JSON.');
    const { merchant_name, transaction_date, total_amount, line_items } = receiptData;
    const normalizedTotalAmount = typeof total_amount === 'number' ? total_amount : Number(total_amount);

    validateFields({ merchant_name, total_amount: normalizedTotalAmount }, {
      merchant_name: { type: 'string', required: true, trim: true, maxLength: 255, message: 'merchant_name is required.' },
      total_amount: { type: 'number', required: true, min: 0 }
    });

    if (!transaction_date || Number.isNaN(Date.parse(transaction_date))) {
      throw new ValidationError('transaction_date must be a valid date string.');
    }

    validateLineItems(line_items);

    const normalizedTransactionDate = new Date(transaction_date).toISOString().split('T')[0];
    const dedupeHash = buildReceiptHash(req.user.id, {
      merchant_name,
      transaction_date: normalizedTransactionDate,
      total_amount: normalizedTotalAmount,
      line_items,
    });
    const duplicateActionRaw = req.body?.duplicateAction;
    const duplicateAction = typeof duplicateActionRaw === 'string' ? duplicateActionRaw.toLowerCase() : null;
    const requestedReceiptId = req.body?.existingReceiptId;

    const { data: duplicateMatches, error: duplicateLookupError } = await supabase
      .from('receipts')
      .select('id, receipt_hash, receipt_url, created_at')
      .eq('user_id', req.user.id)
      .like('receipt_hash', `${dedupeHash}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (duplicateLookupError) {
      throw duplicateLookupError;
    }

    const existingReceipt = duplicateMatches?.[0] ?? null;
    const duplicateTargetMatches = Boolean(existingReceipt && requestedReceiptId === existingReceipt.id);

    let duplicateMode = 'insert'; // insert | keep | replace
    if (existingReceipt) {
      if (duplicateAction === 'replace' && duplicateTargetMatches) {
        duplicateMode = 'replace';
      } else if (duplicateAction === 'keep' && duplicateTargetMatches) {
        duplicateMode = 'keep';
      } else {
        return res.status(409).json({
          error: 'This receipt already exists.',
          code: 'DUPLICATE_RECEIPT',
          existingReceiptId: existingReceipt.id,
        });
      }
    }

    if (req.file && !isSupportedUpload(req.file.mimetype)) {
      throw new ValidationError('Unsupported receipt image type.');
    }

    let receipt_url = null;

    if (req.file) {
      const receiptId = crypto.randomUUID();
      const extension = path.extname(req.file.originalname || '');
      const now = new Date();
      const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const safeMerchant = merchant_name.replace(/[^a-z0-9-_]/gi, '_');
      const fileName = `${safeMerchant}-${normalizedTransactionDate}-${time}-${receiptId}${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      receipt_url = publicUrlData.publicUrl;
    }

    const { merchant_id: canonicalMerchantId, alias: merchantAlias } = await resolveMerchant(merchant_name || '', supabase);
    const finalReceiptUrl = receipt_url ?? (duplicateMode === 'replace' ? existingReceipt?.receipt_url ?? null : null);

    if (duplicateMode === 'replace' && existingReceipt) {
      const { data: updatedData, error: updateError } = await supabase
        .from('receipts')
        .update({
          merchant_name,
          merchant_alias: merchantAlias,
          canonical_merchant_id: canonicalMerchantId,
          transaction_date: normalizedTransactionDate,
          total_amount: normalizedTotalAmount,
          line_items,
          receipt_url: finalReceiptUrl,
        })
        .eq('id', existingReceipt.id)
        .eq('user_id', req.user.id)
        .select();

      if (updateError) {
        throw updateError;
      }

      return res.status(200).json(updatedData?.[0] || null);
    }

    const receiptHashToStore =
      duplicateMode === 'keep'
        ? `${dedupeHash}:${crypto.randomUUID()}`
        : dedupeHash;

    const { data, error } = await supabase
      .from('receipts')
      .insert({
        user_id: req.user.id,
        merchant_name,
        merchant_alias: merchantAlias,
        canonical_merchant_id: canonicalMerchantId,
        transaction_date: normalizedTransactionDate,
        total_amount: normalizedTotalAmount,
        line_items,
        receipt_url,
        receipt_hash: receiptHashToStore,
      })
      .select();

    if (error) {
      if (error.code === '23505') {
        throw new ValidationError('Duplicate receipt detected for this account.', 409);
      }
      throw error;
    }
    res.status(201).json(data[0]);
  } catch (error) {
    return handleApiError(res, error, 'Failed to save receipt');
  }
});

app.post('/api/merchant-aliases', isAuthenticated, async (req, res) => {
  try {
    const { alias, merchant_id } = req.body || {};
    validateFields({ alias, merchant_id }, {
      alias: { type: 'string', required: true, trim: true, maxLength: 255, message: 'alias is required.' },
      merchant_id: { type: 'string', required: true, trim: true, maxLength: 255, message: 'merchant_id is required.' }
    });

    const { data, error } = await supabase
      .from('merchant_aliases')
      .insert({ alias, merchant_id })
      .select();

    if (error) {
      throw error;
    }

    res.status(201).json(data?.[0] || null);
  } catch (error) {
    return handleApiError(res, error, 'Failed to save merchant alias');
  }
});

app.post('/api/update-user-category', isAuthenticated, async (req, res) => {
  try {
    const { item_name, main_category, sub_category } = req.body || {};
    validateFields({ item_name, main_category, sub_category }, {
      item_name: { type: 'string', required: true, trim: true, maxLength: 255, message: 'item_name is required.' },
      main_category: { type: 'string', required: true, trim: true, maxLength: 255 },
      sub_category: { type: 'string', required: true, trim: true, maxLength: 255 }
    });

    const { error } = await supabase
      .from('user_categories')
      .upsert(
        { user_id: req.user.id, item_name, main_category, sub_category },
        { onConflict: 'user_id,item_name' }
      );

    if (error) {
      throw error;
    }

    console.log(`✨ Saved user-specific override: ${item_name} → ${main_category}/${sub_category}`);
    res.json({ success: true });

  } catch (error) {
    return handleApiError(res, error, 'Failed to update user category');
  }
});

app.post('/api/reset-user-category', isAuthenticated, async (req, res) => {
  try {
    const { item_name } = req.body || {};
    validateFields({ item_name }, {
      item_name: { type: 'string', required: true, trim: true, maxLength: 255, message: 'item_name is required.' }
    });

    await supabase
      .from('user_categories')
      .delete()
      .eq('user_id', req.user.id)
      .eq('item_name', item_name);

    console.log(`🔄 Reset override for: ${item_name}`);
    res.json({ success: true });

  } catch (error) {
    return handleApiError(res, error, 'Failed to reset category');
  }
});

app.post('/api/user-store-type-overrides', isAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    const { merchant_name, store_type } = req.body || {};
    validateFields({ merchant_name, store_type }, {
      merchant_name: { type: 'string', required: true, trim: true, maxLength: 255, message: 'merchant_name is required.' },
      store_type: { type: 'string', required: true, trim: true, maxLength: 255, message: 'store_type is required.' }
    });

    const { error } = await supabase
      .from('user_store_type_overrides')
      .upsert({
        user_id: userId,
        merchant_name,
        store_type
      }, { onConflict: 'user_id,merchant_name' });

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'Store type override saved.' });
  } catch (error) {
    return handleApiError(res, error, 'Failed to save store type override');
  }
});

app.get('/api/user-store-type-overrides', isAuthenticated, async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('user_store_type_overrides')
      .select('merchant_name, store_type')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const overrides = data.reduce((acc, row) => {
      acc[row.merchant_name] = row.store_type;
      return acc;
    }, {});

    res.json(overrides);
  } catch (error) {
    console.error('Error fetching store type overrides:', error);
    res.status(500).json({ error: 'Failed to fetch store type overrides' });
  }
});


// --- Start Server ---
app.listen(port, async () => {
    console.log('🟢 Server starting...');
    try {
        await loadMasterItems();
    } catch (err) {
        console.error('❌ Failed to load master items:', err);
    }
    console.log(`🚀 Server listening at http://localhost:${port}`);
    console.log('📦 Current Master Items:', masterItems);
});
