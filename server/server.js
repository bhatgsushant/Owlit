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
const MASTER_ITEMS_PATH = path.join(__dirname, 'master_items.json');
let masterItems = {};

async function loadMasterItems() {
    try {
        const data = await fs.readFile(MASTER_ITEMS_PATH, 'utf8');
        masterItems = JSON.parse(data);
        console.log(`✅ Loaded ${Object.keys(masterItems).length} items from master list.`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('📝 Master items file not found, starting with empty list.');
            masterItems = {};
        } else {
            console.error('❌ Error loading master items:', error);
            masterItems = {};
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
        console.error('❌ Error saving master items:', error);
    }
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

// --- Helper Functions (preprocessing, OCR, structuring, categorization) ---
// ... [all your existing helper functions remain unchanged]
// Make sure preprocessImage, runTesseract, processWithOpenAI, processDocumentWithDocAI,
// structureTextWithOpenAI, convertMarkdownToJSON, findInMasterList, findInCategoryKeywords,
// categorizeLineItems, formatDate are all included here exactly as before.

// --- API Routes ---
// Scan receipt / document
// /api/scan, /api/process-document, /api/summarize-markdown
// All routes remain exactly as before.

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
