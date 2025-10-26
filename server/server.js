require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { OpenAI } = require('openai');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const { createWorker } = require('tesseract.js');

const app = express();
const port = process.env.PORT || 3001;

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in your .env file!');
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
console.log("🧠 Loaded OpenAI API Key:", OPENAI_API_KEY ? "✅ Found" : "❌ Missing");

// Google Document AI Configuration
const DOCAI_PROJECT_ID = '49889892103';
const DOCAI_LOCATION = 'us'; // e.g., 'us' or 'eu'
const DOCAI_PROCESSOR_ID = 'f263a529ecfd3487';

const docAIClient = new DocumentProcessorServiceClient();
console.log("🧠 Initialized Google Document AI Client");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

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
        return dateString; // Return original on failure
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
                                image_url: {
                                    url: 
`data:image/jpeg;base64,${imageBase64}`,
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

async function processWithDocumentAI(imageBuffer) {
    console.log('🚀 Starting Document AI Processing...');
    const name = `projects/${DOCAI_PROJECT_ID}/locations/${DOCAI_LOCATION}/processors/${DOCAI_PROCESSOR_ID}`;

    const request = {
        name,
        rawDocument: {
            content: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg', // Adjust if you handle other types
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

app.post('/api/scan', upload.single('receipt'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        console.log('\n🚀 === STARTING RECEIPT PROCESSING ===');
        const useDocAI = req.body.reprocess === 'true';
        console.log(`⚙️ Using ${useDocAI ? 'Google Document AI' : 'OpenAI Vision'} pipeline.`);

        const preprocessedImageBuffer = await preprocessImage(req.file.buffer);

        let processedData;
        if (useDocAI) {
            const extractedText = await processWithDocumentAI(preprocessedImageBuffer);
            processedData = await structureTextWithOpenAI(extractedText);
        } else {
            const tesseractText = await runTesseract(preprocessedImageBuffer);
            const imageBase64 = preprocessedImageBuffer.toString('base64');
            processedData = await processWithOpenAI(imageBase64, tesseractText); // Original function
        }

        const transformedData = {
            merchant_name: processedData.merchant || processedData.MerchantName || '',
            transaction_date: formatDate(processedData.transaction_date || processedData.Date),
            line_items: (processedData.items || processedData.Items || []).map(item => {
                return {
                    item: item.name || item.Name || '',
                    price: parseFloat(item.price || item.Price) || 0,
                    quantity: parseInt(item.quantity || item.Quantity, 10) || 1,
                    main_category: item.category || item.Category || 'other',
                    sub_category: item.sub_category || item.SubCategory || 'miscellaneous'
                }
            }),
            total_amount: parseFloat(processedData.total_amount || processedData.TotalAmount) || 0
        };

        console.log('\n📤 === FINAL DATA SENT TO FRONTEND ===');
        console.log(JSON.stringify(transformedData, null, 2));

        res.json(transformedData);
    } catch (error) {
        console.error('❌ Error processing document:', error);
        res.status(500).json({
            error: 'Failed to process document.',
            details: error.message || 'Unknown error occurred.'
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'ReceiptWise server running' });
});

app.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
});
