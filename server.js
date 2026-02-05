const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
const VALID_API_KEY = 'SENTINEL_SECURE_2026_X1';

console.log('[BOOT] Server starting...');
console.log('[BOOT] Port:', PORT);
console.log('[BOOT] Gemini API Key:', API_KEY ? 'CONFIGURED' : 'MISSING');

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
    console.log('='.repeat(80));
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('='.repeat(80));
    next();
});

// Generate AI response using Gemini
async function generateReply(scammerMessage, conversationHistory = []) {
    if (!API_KEY) {
        return "I'm sorry, I'm having trouble with my phone right now. Could you say that again?";
    }

    try {
        const genAI = new GoogleGenAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 150
            },
            systemInstruction: `You are Agnes, a confused but curious 70-year-old woman. A scammer is trying to trick you. Your goal is to:
1. Sound believable as an elderly person (use phrases like "Oh my", "Dear me", "I'm not very good with technology")
2. Keep the scammer engaged by asking questions or showing concern
3. NEVER reveal you're AI or that you know it's a scam
4. Be slightly confused about technology but eager to help/resolve the issue
5. Keep responses under 30 words

Respond naturally to: "${scammerMessage}"`
        });

        const prompt = scammerMessage;
        const result = await model.generateContent(prompt);
        const reply = result.response.text().trim();

        console.log('[GEMINI] Generated reply:', reply);
        return reply;
    } catch (error) {
        console.error('[GEMINI ERROR]', error.message);
        return "Oh dear, I didn't quite catch that. What did you say about my account?";
    }
}

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        geminiConfigured: !!API_KEY
    });
});

// Main honeypot endpoint
app.post('/', async (req, res) => {
    console.log('[ROOT] Processing request...');

    try {
        // Extract message text from various possible formats
        const messageText = req.body.message?.text || req.body.text || 'Hello';
        const conversationHistory = req.body.conversationHistory || [];

        console.log('[ROOT] Scammer message:', messageText);

        // Generate AI reply
        const reply = await generateReply(messageText, conversationHistory);

        // Return EXACT format judges expect
        const response = {
            status: 'success',
            reply: reply
        };

        console.log('[ROOT] Sending response:', JSON.stringify(response, null, 2));

        res.status(200)
            .set('Content-Type', 'application/json')
            .json(response);

    } catch (error) {
        console.error('[ROOT ERROR]', error);

        res.status(500)
            .set('Content-Type', 'application/json')
            .json({
                status: 'error',
                reply: "I'm sorry, I'm having technical difficulties. Could you try again?"
            });
    }
});

// Alternative endpoint
app.post('/api/honeypot', async (req, res) => {
    console.log('[API] Processing request...');

    try {
        const messageText = req.body.message?.text || req.body.text || 'Hello';
        const conversationHistory = req.body.conversationHistory || [];

        console.log('[API] Scammer message:', messageText);

        const reply = await generateReply(messageText, conversationHistory);

        const response = {
            status: 'success',
            reply: reply
        };

        console.log('[API] Sending response:', JSON.stringify(response, null, 2));

        res.status(200)
            .set('Content-Type', 'application/json')
            .json(response);

    } catch (error) {
        console.error('[API ERROR]', error);

        res.status(500)
            .set('Content-Type', 'application/json')
            .json({
                status: 'error',
                reply: "I'm sorry, I'm having technical difficulties. Could you try again?"
            });
    }
});

// 404 handler
app.use((req, res) => {
    console.log('[404]', req.method, req.url);
    res.status(404)
        .set('Content-Type', 'application/json')
        .json({
            status: 'error',
            reply: 'Endpoint not found. Please use POST / or POST /api/honeypot'
        });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[FATAL ERROR]', err);
    res.status(500)
        .set('Content-Type', 'application/json')
        .json({
            status: 'error',
            reply: 'Internal server error'
        });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(80));
    console.log(`[READY] Sentinel Honeypot API`);
    console.log(`[READY] Listening on port ${PORT}`);
    console.log(`[READY] Time: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
});

// Graceful shutdown handlers
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (err) => {
    console.error('[UNHANDLED REJECTION]', err);
});
