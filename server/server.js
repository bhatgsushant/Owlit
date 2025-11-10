

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
const jwt = require('jsonwebtoken');
const ITEM_SYNONYMS = {
  coffee: ["coffee", "latte", "flat white", "espresso", "americano", "mocha", "cappuccino", "macchiato"],
  tea: ["tea", "chai", "green tea", "matcha"],
  chocolate: ["chocolate", "choc", "cadbury", "kitkat"],
};
const {
  normalizeMerchantName,
  buildReceiptHash,
} = require('./utils/receiptHash.js');
const { resolveAiDateRange, analyzeSpendingResults } = require('./utils/askAiHelpers.js');
const ASK_AI_SUPPORTED_OPERATIONS = new Set(['total_spend', 'item_spend', 'top_merchants', 'list_receipts']);

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

const startOfCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const startOfLastMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
};

const startOfCurrentWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day + 6) % 7; // convert to Monday = 0
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const toISODate = (date) => date.toISOString().split('T')[0];

const getDateRangeForIntent = (timeRange) => {
  const now = new Date();
  let from = null;
  let to = null;

  switch (timeRange) {
    case 'this_month':
      from = startOfCurrentMonth();
      to = now;
      break;
    case 'last_month':
      from = startOfLastMonth();
      to = startOfCurrentMonth();
      break;
    case 'this_week':
      from = startOfCurrentWeek();
      to = now;
      break;
    case 'last_7_days':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      to = now;
      break;
    case 'all_time':
    default:
      break;
  }

  return {
    from: from ? toISODate(from) : null,
    to: to ? toISODate(to) : null,
  };
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

// --- Auth Helpers & Middleware ---
const buildUserPayload = (user = {}) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  avatar: user.avatar,
  provider: user.provider,
});

const issueJwtForUser = (user) => {
  if (!user?.id) {
    throw new ValidationError('Unable to issue token for missing user profile.');
  }
  return jwt.sign(buildUserPayload(user), JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const authenticateRequest = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};


// --- Catch uncaught errors for debugging ---
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

console.log("🟢 Starting server...");

// --- Express App ---
const app = express();
const port = process.env.PORT || 3001;
const SESSION_SECRET = ensureEnvVar('SESSION_SECRET');
const JWT_SECRET = ensureEnvVar('JWT_SECRET');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

// --- OpenAI Setup ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in your .env file!');
} else {
    console.log('✅ Loaded OpenAI API Key');
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const ASK_AI_INTERPRETER_MODEL = process.env.ASK_AI_MODEL || 'gpt-4o-mini';
const ASK_AI_SYSTEM_PROMPT = `
You are an intent parser for a personal finance assistant.
Convert the user's spending question into structured JSON with this schema:
{
  "operation": "total_spend|item_spend|top_merchants|list_receipts|clarify",
  "date_range": { "preset": "this_month|last_month|this_week|last_week|last_7_days|last_30_days|this_year|custom|all_time", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "merchant_terms": ["optional", "merchant", "keywords"],
  "item_terms": ["optional", "item keywords"],
  "category_terms": ["optional", "category names"],
  "amount_filter": { "operator": ">|>=|<|<=|=", "value": 0 },
  "needs_clarification": false,
  "clarification_prompt": ""
}

Rules:
- Always fill arrays (empty if no filters).
- Use "clarify" operation and set needs_clarification=true when the request is ambiguous.
- Prefer presets such as "this_month", but if the user gives explicit dates, set preset to "custom" and include start/end.
- For questions about individual items (e.g., eggs, coffee), include them in item_terms and set operation to "item_spend".
- Use the "top_merchants" operation when the user asks for merchants with the highest spend.
- Use the "list_receipts" operation when the user wants to see actual receipts.
- Leave amount_filter empty unless the user makes a clear comparison like "over 100".
- Respond with JSON only.
`;

// --- Google Document AI Setup ---
const DOCAI_PROJECT_ID = ensureEnvVar('DOCAI_PROJECT_ID');
const DOCAI_LOCATION = ensureEnvVar('DOCAI_LOCATION');
const DOCAI_PROCESSOR_ID = ensureEnvVar('DOCAI_PROCESSOR_ID');

async function interpretSpendingQuestion(question) {
  try {
    const response = await openai.chat.completions.create({
      model: ASK_AI_INTERPRETER_MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: ASK_AI_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      response_format: { type: 'json_object' },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty interpretation response');
    }
    return safeJsonParse(content, {});
  } catch (error) {
    console.error('interpretSpendingQuestion error:', error);
    throw new Error('I had trouble understanding that question. Please try rephrasing it.');
  }
}
//const docAIClient = new DocumentProcessorServiceClient();
const { GoogleAuth } = require('google-auth-library');

const createGoogleAuth = () => {
  const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (keyPath && keyPath !== 'none') {
    console.log('🔐 Using Google credentials from file path defined in GOOGLE_APPLICATION_CREDENTIALS');
    return new GoogleAuth({ keyFilename: keyPath, scopes });
  }

  const inlineJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (inlineJson) {
    try {
      const credentials = JSON.parse(inlineJson);
      console.log('🔐 Using inline Google credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON');
      return new GoogleAuth({ credentials, scopes });
    } catch (error) {
      console.warn('⚠️  Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON. Falling back to other auth methods.');
    }
  }

  const base64Creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  if (base64Creds) {
    try {
      const decoded = Buffer.from(base64Creds, 'base64').toString('utf8');
      const credentials = JSON.parse(decoded);
      console.log('🔐 Using inline Google credentials from GOOGLE_APPLICATION_CREDENTIALS_BASE64');
      return new GoogleAuth({ credentials, scopes });
    } catch (error) {
      console.warn('⚠️  Failed to decode GOOGLE_APPLICATION_CREDENTIALS_BASE64. Falling back to other auth methods.');
    }
  }

  console.log('🆔 Using Application Default Credentials for Google Auth');
  return new GoogleAuth({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scopes,
  });
};

const docAIClient = new DocumentProcessorServiceClient({ auth: createGoogleAuth() });

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
app.set("trust proxy", 1);
const CLIENT_URL = process.env.CLIENT_URL || "https://owlit.vercel.app";

const allowedOrigins = [
  process.env.CLIENT_URL,           // Vercel frontend
  'http://localhost:5173',          // local dev
];
const vercelPreview = /^https:\/\/owlit(-git-[a-z0-9-]+)?-bhatgsushants-projects\.vercel\.app$/i;

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || vercelPreview.test(origin)) {return callback(null, true);}

    if (/\.vercel\.app$/.test(origin)) return callback(null, true); // ✅ Allow all Vercel previews

     console.log("❌ Blocked by CORS:", origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`));

  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Required for proper secure cookies on Render
//app.set("trust proxy", 1);
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,           // Always true in production HTTPS
    sameSite: "none",       // MUST be none for cross-domain cookies
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());

// --- Debug route to check cookies + session ---
app.get('/api/debug-session', (req, res) => {
  res.cookie('rw_test', '1', { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'none' 
  });

  res.json({
    origin: req.get('origin'),
    cookieSeenByServer: Boolean(req.headers.cookie),
    hasSessionObject: Boolean(req.session),
    sessionID: req.sessionID,
    isAuthenticated: Boolean(req.user),
    user: req.user || null,
  });
});


const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES || 10 * 1024 * 1024);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        if (isSupportedUpload(file.mimetype)) {
            return cb(null, true);
        }
        cb(new ValidationError('Unsupported file type. Please upload a PDF or image.'));
    },
});

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

async function extractIntent(question = '') {
    const prompt = `You are an intent extraction assistant for a receipt management app. Read the user question and return strict JSON with the following shape:
{
  "time_range": "this_month" | "last_month" | "this_week" | "last_7_days" | "all_time",
  "item_terms": [string],
  "categories": [string],
  "subcategories": [string],
  "merchants": [string]
}

Rules:
- ONLY include values explicitly mentioned. Do not guess.
- If no time range mentioned, use "all_time".
- Strings should use the exact phrasing from the user when possible.

Question: ${question}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'Extract structured intent without guessing.' },
                { role: 'user', content: prompt },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No intent returned');
        const parsed = JSON.parse(content);
        return {
            time_range: parsed.time_range || 'all_time',
            item_terms: Array.isArray(parsed.item_terms) ? parsed.item_terms : [],
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            subcategories: Array.isArray(parsed.subcategories) ? parsed.subcategories : [],
            merchants: Array.isArray(parsed.merchants) ? parsed.merchants : [],
        };
    } catch (error) {
        console.error('extractIntent error:', error);
        return {
            time_range: 'all_time',
            item_terms: [],
            categories: [],
            subcategories: [],
            merchants: [],
        };
    }
}

const makeQueryKey = (intent) => JSON.stringify(intent || {});

async function fetchFacts(intent, userId) {
    if (!userId) {
        throw new ValidationError('User session is required to fetch facts.');
    }

    const { from, to } = getDateRangeForIntent(intent.time_range || 'all_time');

    let query = supabase
        .from('v_receipt_line_items_enriched')
        .select('*')
        .eq('user_id', userId);

    if (from) {
        query = query.gte('transaction_date', from);
    }
    if (to && intent.time_range === 'last_month') {
        query = query.lt('transaction_date', to);
    } else if (to && intent.time_range !== 'last_month') {
        query = query.lte('transaction_date', to);
    }

    if (intent.merchants && intent.merchants.length > 0) {
        query = query.in('merchant_name', intent.merchants);
    }

    const { data, error } = await query;
    if (error) {
        console.error('fetchFacts supabase error:', error);
        throw new Error('Failed to fetch receipt facts.');
    }

    const categories = (intent.categories || []).map((c) => c.toLowerCase());
    const subcategories = (intent.subcategories || []).map((c) => c.toLowerCase());
    const itemTerms = (intent.item_terms || []).map((t) => t.toLowerCase());

    const filtered = (data || []).filter((row) => {
        if (categories.length && (!row.main_category || !categories.includes(row.main_category.toLowerCase()))) {
            return false;
        }
        if (subcategories.length && (!row.sub_category || !subcategories.includes(row.sub_category.toLowerCase()))) {
            return false;
        }
       if (itemTerms.length) {
  const item = (row.item || '').toLowerCase();

  // Expand item terms with synonyms
  const expandedTerms = itemTerms.flatMap(term => ITEM_SYNONYMS[term] || [term]);

  if (!expandedTerms.some((term) => item.includes(term))) {
    return false;
  }
}
        return true;
    });

    const totalsByMerchant = {};
    let totalSpend = 0;
    const receiptIds = new Set();

    filtered.forEach((row) => {
        const price = Number(row.price) || 0;
        const quantity = Number(row.quantity) || 0;
        const spend = price * quantity;
        totalSpend += spend;
        const merchant = row.merchant_name || 'Unknown';
        totalsByMerchant[merchant] = (totalsByMerchant[merchant] || 0) + spend;
        if (row.receipt_id) {
            receiptIds.add(row.receipt_id);
        }
    });

    const merchant_breakdown = Object.entries(totalsByMerchant)
        .map(([merchant, spend]) => ({ merchant, spend }))
        .sort((a, b) => b.spend - a.spend);

    return {
        total_spend: Number(totalSpend.toFixed(2)),
        merchant_breakdown,
        receipt_ids: Array.from(receiptIds),
    };
}

const containsSQL = (text = '') => {
  if (!text) return false;
  const sqlPattern = /\b(select|with|insert|update|delete)\b[\s\S]+?\b(from|into)\b/i;
  return sqlPattern.test(text);
};

const summarizeFacts = (facts) => {
  if (
    !facts ||
    !Array.isArray(facts.receipt_ids) ||
    facts.receipt_ids.length === 0 ||
    !facts.total_spend ||
    Number(facts.total_spend) === 0
  ) {
    return `
Aisa lagta hai ki is time range me aapne coffee purchase nahi ki ☕️
(Ya ho sakta hai item line me "coffee" word mention na ho.)

Agar chaaho to main:
• "tea", "latte", "cappuccino", "cafe" jaise alternate keywords check kar sakta hun
• Ya iss mahine ka poora beverages spend bata du

Bol do: "Check beverages this month" 🍵
`;
  }

  const total = Number(facts.total_spend).toFixed(2);
  const count = facts.receipt_ids.length;
  const topMerchant =
    facts.merchant_breakdown && facts.merchant_breakdown.length
      ? facts.merchant_breakdown[0]
      : null;

  let summary = `Maine ${count} receipt(s) check ki aur total spend approx ₹${total} raha.`;
  if (topMerchant) {
    summary += ` Sabse zyada kharch ${topMerchant.merchant} par (₹${topMerchant.spend.toFixed(2)}) hua.`;
  }
  summary += ' Agar chaho to main aur detail mein bata sakta hun.';
  return summary;
};

async function generateAnswer(question, facts) {
  if (
    !facts ||
    !Array.isArray(facts.receipt_ids) ||
    facts.receipt_ids.length === 0 ||
    !facts.total_spend ||
    Number(facts.total_spend) === 0
  ) {
    return summarizeFacts(facts);
  }

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `
Use ONLY the provided facts. Never guess or invent numbers.
Keep the answer warm, friendly, and short.
If merchant_breakdown exists, summarize top merchants.
Never output SQL queries or code – reply in natural language only.
`,
      },
      {
        role: 'user',
        content: `Question: ${question}\nFacts: ${JSON.stringify(facts)}`,
      },
    ],
  });

  const answer = resp.choices?.[0]?.message?.content?.trim() || '';
  if (containsSQL(answer)) {
    return summarizeFacts(facts);
  }
  return answer;
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
app.post('/api/scan', authenticateRequest, upload.single('file'), async (req, res) => {
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

            console.log(`🟢 Processed single receipt for user ${req.user?.id || 'anonymous'} with ${categorizedLineItems.length} line item(s).`);
            return res.json(transformedData);

        } catch (error) {
            return handleApiError(res, error, 'Failed to process receipt.');
        }
    } catch (error) {
        return handleApiError(res, error, 'Failed to process upload.');
    }
});

app.post('/api/scan-multi', authenticateRequest, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            throw new ValidationError('Please upload between 2 and 10 pages to process a multi-page receipt.');
        }

        const files = req.files.slice(0, 10);
        console.log(`🗂️ Processing ${files.length} pages for multi-page receipt`);

        const combinedTexts = [];
        const combinedHints = [];

        for (const file of files) {
            const preprocessedImageBuffer = await preprocessImage(file.buffer);
            const tesseractText = await runTesseract(preprocessedImageBuffer);
            if (tesseractText) {
                combinedHints.push(tesseractText);
            }
            const docText = await processDocumentWithDocAI(preprocessedImageBuffer, 'image/jpeg');
            if (docText) {
                combinedTexts.push(docText);
            }
        }

        if (!combinedTexts.length) {
            throw new Error('Failed to extract text from uploaded images.');
        }

        const mergedText = combinedTexts.join('\n\n---- PAGE BREAK ----\n\n');
        const mergedHints = combinedHints.join('\n');

        const processedData = await structureTextWithOpenAI(mergedText, mergedHints);
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

        let receipt_url = null;
        const firstFile = files[0];
        if (firstFile) {
            const receiptId = require('crypto').randomUUID();
            const extension = path.extname(firstFile.originalname) || '.jpg';
            const now = new Date();
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
            const fileName = `${merchant_name || 'receipt'}-${now.toISOString().split('T')[0]}-${time}-${receiptId}${extension}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, firstFile.buffer, {
                    contentType: firstFile.mimetype,
                });

            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);
                receipt_url = publicUrlData?.publicUrl || null;
            } else {
                console.error('Error uploading multi-page preview:', uploadError);
            }
        }

        const transaction_date = formatDate(processedData.transaction_date || processedData.Date);
        const total_amount = parseFloat(processedData.total_amount || processedData.TotalAmount) || 0;

        const { merchant_id: canonicalMerchantId, alias: merchantAlias } = await resolveMerchant(merchant_name || '', supabase);

        const normalizedTransactionDate = transaction_date;
        const normalizedTotalAmount = total_amount;
        const dedupeHash = buildReceiptHash(req.user?.id || 'multi', {
            merchant_name,
            transaction_date: normalizedTransactionDate,
            total_amount: normalizedTotalAmount,
            line_items: categorizedLineItems,
        });
        const receiptHashToStore = `${dedupeHash}:${crypto.randomUUID()}`;

        if (req.user?.id) {
            const { error: saveError } = await supabase
              .from('receipts')
              .insert({
                  user_id: req.user.id,
                  merchant_name,
                  merchant_alias: merchantAlias,
                  canonical_merchant_id: canonicalMerchantId,
                  transaction_date: normalizedTransactionDate,
                  total_amount: normalizedTotalAmount,
                  line_items: categorizedLineItems,
                  receipt_url,
                  receipt_hash: receiptHashToStore,
              });

            if (saveError) {
                console.error('Error saving multi-page receipt:', saveError);
            }
        }

        const transformedData = {
          merchant_name,
          transaction_date: normalizedTransactionDate,
          line_items: categorizedLineItems,
          total_amount: normalizedTotalAmount,
          main_category,
          store_type,
          receipt_url,
        };

        console.log(`🟢 Processed multi-page receipt for user ${req.user?.id || 'anonymous'} with ${categorizedLineItems.length} line item(s).`);
        return res.json(transformedData);
    } catch (error) {
        return handleApiError(res, error, 'Failed to process multi-page receipt.');
    }
});

app.post('/api/process-document', authenticateRequest, async (req, res) => {
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

app.post('/api/summarize-markdown', authenticateRequest, async (req, res) => {
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

app.post('/api/ask', authenticateRequest, async (req, res) => {
    try {
        const { question } = req.body || {};
        const userId = req.user?.id;
        validateFields({ question }, {
            question: { type: 'string', required: true, trim: true, maxLength: 2000, message: 'question is required.' }
        });

        if (!userId) {
            throw new ValidationError('User session is required.');
        }

        const intent = await extractIntent(question);
        const key = makeQueryKey(intent);

        const { data: cachedRows, error: cacheError } = await supabase
            .from('ai_cache')
            .select('answer, facts')
            .eq('user_id', userId)
            .eq('query_key', key)
            .order('created_at', { ascending: false })
            .limit(1);

        if (cacheError) {
            console.error('Cache lookup error:', cacheError);
        }

        if (cachedRows && cachedRows.length > 0) {
            const cached = cachedRows[0];
            return res.json({ answer: cached.answer, facts: cached.facts, cached: true });
        }

        const facts = await fetchFacts(intent, userId);
        const answer = await generateAnswer(question, facts);

        const { error: insertError } = await supabase
            .from('ai_cache')
            .insert({ user_id: userId, query_key: key, answer, facts });

        if (insertError) {
            console.error('Cache insert error:', insertError);
        }

        return res.json({ answer, facts, cached: false });
    } catch (error) {
        return handleApiError(res, error, 'Failed to process question.');
    }
});

// --- Auth Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    try {
      const token = issueJwtForUser(req.user);
      const redirectUrl = new URL(process.env.AUTH_CALLBACK_PATH || '/auth/callback', CLIENT_URL);
      redirectUrl.searchParams.set('token', token);
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Failed to issue JWT after Google OAuth:', error);
      res.redirect(`${CLIENT_URL}/login?error=auth_failed`);
    }
  }
);

app.get('/api/user', authenticateRequest, (req, res) => {
    res.json(req.user || null);
});

app.post('/auth/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => {});
    }
    res.json({ message: 'Logged out successfully' });
});

// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'ReceiptWise server running' });
});

app.get('/api/store-info', authenticateRequest, async (req, res) => {
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
app.get('/api/receipts', authenticateRequest, async (req, res) => {
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

app.post('/api/receipts', authenticateRequest, upload.single('receiptImage'), async (req, res) => {
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

app.post('/api/ask-ai', authenticateRequest, async (req, res) => {
  try {
    const question = (req.body?.question || '').trim();
    if (!question) {
      throw new ValidationError('A question is required to use Ask AI.');
    }

    const interpretation = await interpretSpendingQuestion(question);
    interpretation.operation = (interpretation.operation || 'total_spend').toLowerCase();

    if (interpretation.needs_clarification || interpretation.operation === 'clarify') {
      return res.json({
        sql_query: '',
        final_answer:
          interpretation.clarification_prompt ||
          'Could you clarify what time range or category you would like me to inspect?',
        follow_ups: [
          'How much did I spend on groceries last month?',
          'Show me receipts that mention coffee this week.',
        ],
      });
    }

    if (!ASK_AI_SUPPORTED_OPERATIONS.has(interpretation.operation)) {
      interpretation.operation = 'total_spend';
    }

    const dateRange = resolveAiDateRange(interpretation.date_range || {});

    let receiptsQuery = supabase
      .from('receipts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('transaction_date', { ascending: false })
      .limit(500);

    if (dateRange.start) {
      receiptsQuery = receiptsQuery.gte('transaction_date', dateRange.start);
    }
    if (dateRange.end) {
      receiptsQuery = receiptsQuery.lte('transaction_date', dateRange.end);
    }

    const { data: receipts, error } = await receiptsQuery;
    if (error) {
      throw error;
    }

    const analysis = analyzeSpendingResults({
      receipts: Array.isArray(receipts) ? receipts : [],
      interpretation,
      dateRange,
    });

    res.json(analysis);
  } catch (error) {
    return handleApiError(res, error, 'Failed to answer Ask AI question');
  }
});

app.post('/api/merchant-aliases', authenticateRequest, async (req, res) => {
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

app.post('/api/update-user-category', authenticateRequest, async (req, res) => {
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

app.post('/api/reset-user-category', authenticateRequest, async (req, res) => {
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

app.post('/api/user-store-type-overrides', authenticateRequest, async (req, res) => {
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

app.get('/api/user-store-type-overrides', authenticateRequest, async (req, res) => {
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
