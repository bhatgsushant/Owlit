const { getStoreInfo } = require('./storeInfo.js');

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

// --- OpenAI Setup ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in your .env file!');
} else {
    console.log('✅ Loaded OpenAI API Key');
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Google Document AI Setup ---
const DOCAI_PROJECT_ID = '49889892103';
const DOCAI_LOCATION = 'us';
const DOCAI_PROCESSOR_ID = 'f263a529ecfd3487';
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
        .insert([
            { item_name: itemName, main_category, sub_category }
        ])
        .onConflict('item_name')
        .ignore();

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
    secret: process.env.SESSION_SECRET || 'fallback_secret',
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
  "items": [
    {"name": "", "quantity": 1, "price": 0.0, "category": "", "sub_category": ""}
  ],
  "total_amount": 0.0
}

**Rules:**
1. Use the Google Document AI text as the primary source. Use the Tesseract hint to resolve ambiguities.
2. Quantity defaults to 1 if missing.
3. Price must be a number only (no currency symbols).
4. Assign a logical category/sub_category from the provided taxonomy.
5. Return **JSON only**, no explanations.
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
    console.log("📥 Received file:", req.file ? req.file.originalname : "No file");
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { scanMode } = req.body;

    if (scanMode === 'document') {
        console.log('🚀 === STARTING DOCUMENT PROCESSING ===');
        try {
            const rawText = await processDocumentWithDocAI(req.file.buffer, req.file.mimetype);
            const markdown = rawText.split('\n').join('  \n');
            res.setHeader('Content-Type', 'text/plain');
            res.send(markdown);
        } catch (error) {
            console.error('❌ Error processing document:', error);
            res.status(500).json({ error: 'Failed to process document.', details: error.message });
        }
        return;
    }

    // --- Modified Receipt Processing Logic ---
    console.log('🚀 === STARTING RECEIPT PROCESSING ===');
    try {
        console.log(`⚙️ Using Google Document AI pipeline with Tesseract pre-pass.`);

        const preprocessedImageBuffer = await preprocessImage(req.file.buffer);

        // Tesseract pre-pass is kept as requested
        const tesseractText = await runTesseract(preprocessedImageBuffer);

        // Google Document AI is now the primary processor, replacing GPT-4o Vision
        const extractedText = await processDocumentWithDocAI(preprocessedImageBuffer, 'image/jpeg');
        
        // Structuring the text with OpenAI (text-only, no image)
        const processedData = await structureTextWithOpenAI(extractedText, tesseractText);
        
        const lineItems = processedData.items || processedData.Items || [];
      const categorizedLineItems = await categorizeLineItems(lineItems, req.user?.id || null);


    const rawMerchant = processedData.merchant || processedData.MerchantName || '';
const merchant_name = rawMerchant
  .toLowerCase()
  .replace(/[^a-z0-9 ]/gi, ' ') // remove special characters like hyphens
  .replace(/\s+/g, ' ')         // normalize spaces
  .trim()
  .replace(/\b\w/g, c => c.toUpperCase()); // recase nicely
// ✅ Store lookup (this fixes logo + store type)
const storeInfo = getStoreInfo(merchant_name);

const transformedData = {
  merchant_name,
  transaction_date: formatDate(processedData.transaction_date || processedData.Date),
  line_items: categorizedLineItems,
  total_amount: parseFloat(processedData.total_amount || processedData.TotalAmount) || 0,
  store_type: storeInfo?.StoreName_category || 'Other',
};


        console.log(`
📤 === FINAL DATA SENT TO FRONTEND ===`);
        console.log(JSON.stringify(transformedData, null, 2));
        console.log("🟢 DATA SENT TO FRONTEND:", transformedData);
res.json(transformedData);

       
    } catch (error) {
        console.error('❌ Error processing receipt:', error);
        res.status(500).json({
            error: 'Failed to process receipt.',
            details: error.message || 'Unknown error occurred.'
        });
    }
});

app.post('/api/process-document', async (req, res) => {
    console.log('📥 Received markdown for processing');
    const { markdown } = req.body;
    if (!markdown) {
        return res.status(400).json({ error: 'No markdown content provided.' });
    }

    try {
        const structuredJson = await convertMarkdownToJSON(markdown);
        res.json(structuredJson);
    } catch (error) {
        console.error('❌ Error converting markdown to JSON:', error);
        res.status(500).json({ error: 'Failed to convert markdown to JSON.', details: error.message });
    }
});

app.post('/api/summarize-markdown', async (req, res) => {
    console.log('📥 Received markdown for summarization');
    const { markdown } = req.body;
    if (!markdown) {
        return res.status(400).json({ error: 'No markdown content provided.' });
    }

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

    try {
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
        res.send(structuredMarkdown);
    } catch (error) {
        console.error('❌ Error summarizing markdown with OpenAI:', error.message);
        res.status(500).json({ error: 'Failed to summarize markdown.', details: error.message });
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

app.post('/api/receipts', isAuthenticated, async (req, res) => {
  try {
    const { merchant_name, transaction_date, total_amount, line_items } = req.body;
    const { data, error } = await supabase
      .from('receipts')
      .insert({
        user_id: req.user.id,
        merchant_name,
        transaction_date,
        total_amount,
        line_items,
      })
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error saving receipt:', error);
    res.status(500).json({ error: 'Failed to save receipt' });
  }
});

app.post('/api/update-user-category', isAuthenticated, async (req, res) => {
  const { item_name, main_category, sub_category } = req.body;

  if (!item_name || !main_category || !sub_category) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const { error } = await supabase
      .from('user_categories')
      .upsert(
        { user_id: req.user.id, item_name, main_category, sub_category },
        { onConflict: 'user_id,item_name' }
      );

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log(`✨ Saved user-specific override: ${item_name} → ${main_category}/${sub_category}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error updating user category:', error);
    res.status(500).json({ error: 'Failed to update user category' });
  }
});

app.post('/api/reset-user-category', isAuthenticated, async (req, res) => {
  const { item_name } = req.body;

  try {
    await supabase
      .from('user_categories')
      .delete()
      .eq('user_id', req.user.id)
      .eq('item_name', item_name);

    console.log(`🔄 Reset override for: ${item_name}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error resetting category:', error);
    res.status(500).json({ error: 'Failed to reset category' });
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
