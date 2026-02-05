const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

console.log('[BOOT] API_KEY configured:', API_KEY ? 'YES' : 'NO');

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Process with Gemini
async function processWithGemini(text) {
    if (!API_KEY) {
        return {
            scamDetected: false,
            agentNotes: "API key not configured",
            extractedIntelligence: {
                bankAccounts: [],
                upiIds: [],
                phishingLinks: [],
                phoneNumbers: [],
                suspiciousKeywords: [],
                scamTactics: [],
                emotionalManipulation: []
            },
            nextResponse: "I'm sorry, I'm having trouble understanding. Could you repeat that?"
        };
    }

    try {
        const genAI = new GoogleGenAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" },
            systemInstruction: "You are an AI scam-baiting agent posing as a confused elderly person named Agnes. Analyze the scammer's message and extract intelligence (bank accounts, UPI IDs, phone numbers, phishing links). Respond naturally to keep the scammer engaged. Return JSON with: scamDetected (boolean), agentNotes (string), extractedIntelligence (object with arrays: bankAccounts, upiIds, phishingLinks, phoneNumbers, suspiciousKeywords, scamTactics, emotionalManipulation), nextResponse (string - your response as Agnes)."
        });

        const prompt = `Scammer message: "${text}"\n\nAnalyze and respond as Agnes.`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('[GEMINI ERROR]', error.message);
        return {
            scamDetected: false,
            agentNotes: "AI error: " + error.message,
            extractedIntelligence: {
                bankAccounts: [],
                upiIds: [],
                phishingLinks: [],
                phoneNumbers: [],
                suspiciousKeywords: [],
                scamTactics: [],
                emotionalManipulation: []
            },
            nextResponse: "Oh dear, I didn't quite catch that. What were you saying?"
        };
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), apiKey: API_KEY ? 'configured' : 'missing' });
});

// Main API
app.post('/', async (req, res) => {
    try {
        const text = req.body.message?.text || req.body.text || 'Hello';
        const result = await processWithGemini(text);

        res.json({
            status: 'success',
            scamDetected: result.scamDetected,
            engagementMetrics: {
                engagementDurationSeconds: 5,
                totalMessagesExchanged: 1
            },
            extractedIntelligence: result.extractedIntelligence,
            agentNotes: result.agentNotes,
            nextResponse: result.nextResponse
        });
    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.post('/api/honeypot', async (req, res) => {
    try {
        const text = req.body.message?.text || req.body.text || 'Hello';
        const result = await processWithGemini(text);

        res.json({
            status: 'success',
            scamDetected: result.scamDetected,
            engagementMetrics: {
                engagementDurationSeconds: 5,
                totalMessagesExchanged: 1
            },
            extractedIntelligence: result.extractedIntelligence,
            agentNotes: result.agentNotes,
            nextResponse: result.nextResponse
        });
    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[FATAL]', err);
    res.status(500).json({ status: 'error', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[READY] Honeypot API on port ${PORT}`);
});
