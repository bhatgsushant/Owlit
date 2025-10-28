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



const app = express();
const port = process.env.PORT || 3001;

// --- Configuration ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in your .env file!');
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
console.log("🧠 Loaded OpenAI API Key:", OPENAI_API_KEY ? "✅ Found" : "❌ Missing");

const DOCAI_PROJECT_ID = '49889892103';
const DOCAI_LOCATION = 'us';
const DOCAI_PROCESSOR_ID = 'f263a529ecfd3487';
const docAIClient = new DocumentProcessorServiceClient();
console.log("🧠 Initialized Google Document AI Client");

// --- Master Items List ---
const MASTER_ITEMS_PATH = path.join(__dirname, 'master_items.json');
let masterItems = {};

async function loadMasterItems() {
    try {
        const data = await fs.readFile(MASTER_ITEMS_PATH, 'utf8');
        masterItems = JSON.parse(data);
        console.log(`✅ Loaded ${Object.keys(masterItems).length} items from master list.`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('📝 Master items file not found, starting with a new list.');
            masterItems = {};
        } else {
            console.error('❌ Error loading master items file:', error);
        }
    }
}

async function saveMasterItems() {
    const tempPath = `${MASTER_ITEMS_PATH}.tmp`;
    try {
        await fs.writeFile(tempPath, JSON.stringify(masterItems, null, 2));
        await fs.rename(tempPath, MASTER_ITEMS_PATH);
        console.log(`💾 Saved ${Object.keys(masterItems).length} items to master list.`);
    } catch (error) {
        console.error('❌ Error saving master items file:', error);
    }
}

// --- Express Setup ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// --- Existing AI Processing Functions (Unchanged) ---
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

async function structureTextWithOpenAI(text) {
    console.log('🤖 Structuring text with OpenAI...');
    const MAX_RETRIES = 2;
    const jsonPrompt = `
Convert the OCR text from a receipt into structured JSON.

**OCR Text:**
${text}

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
1. Quantity defaults to 1 if missing.
2. Price must be a number only (no currency symbols).
3. Assign a logical category/sub_category from the provided taxonomy.
4. Return **JSON only**, no explanations.
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
        return { ...masterItems[lowercasedItem], Item_Name: lowercasedItem };
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

async function categorizeLineItems(lineItems) {
    let isMasterListUpdated = false;
    const categorizedLineItems = [];

    for (const item of lineItems) {
        const rawItemName = item.name || item.Name || '';
        if (!rawItemName) continue;

        let masterListEntry = findInMasterList(rawItemName);

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
            masterItems[canonicalName] = {
                main_category: categoryInfo.main_category,
                sub_category: categoryInfo.sub_category,
                Item_Name: canonicalName,
                receipt_ItemNames: [rawItemName]
            };
            isMasterListUpdated = true;
            console.log(`✨ Added "${canonicalName}" to master list from ${source}.`);
        }
    }

    if (isMasterListUpdated) {
        await saveMasterItems();
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

    // --- Existing Receipt Processing Logic ---
    console.log('🚀 === STARTING RECEIPT PROCESSING ===');
    try {
        const useDocAI = req.body.reprocess === 'true';
        console.log(`⚙️ Using ${useDocAI ? 'Google Document AI' : 'OpenAI Vision'} pipeline.`);

        const preprocessedImageBuffer = await preprocessImage(req.file.buffer);

        let processedData;
        if (useDocAI) {
            const extractedText = await processDocumentWithDocAI(preprocessedImageBuffer, 'image/jpeg');
            processedData = await structureTextWithOpenAI(extractedText);
        } else {
            const tesseractText = await runTesseract(preprocessedImageBuffer);
            const imageBase64 = preprocessedImageBuffer.toString('base64');
            processedData = await processWithOpenAI(imageBase64, tesseractText);
        }
        
        const lineItems = processedData.items || processedData.Items || [];
        const categorizedLineItems = await categorizeLineItems(lineItems);

        const transformedData = {
            merchant_name: processedData.merchant || processedData.MerchantName || '',
            transaction_date: formatDate(processedData.transaction_date || processedData.Date),
            line_items: categorizedLineItems,
            total_amount: parseFloat(processedData.total_amount || processedData.TotalAmount) || 0
        };

        console.log(`
📤 === FINAL DATA SENT TO FRONTEND ===`);
        console.log(JSON.stringify(transformedData, null, 2));

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

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'ReceiptWise server running' });
});

app.listen(port, async () => {
    await loadMasterItems();
    console.log(`🚀 Server listening at http://localhost:${port}`);
    console.log('📦 Current Master Items:', masterItems);
});
