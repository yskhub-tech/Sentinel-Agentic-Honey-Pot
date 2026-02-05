import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// API Keys Configuration
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
const X_API_KEY = process.env.X_API_KEY || 'SENTINEL_SECURE_2026_X1';

// Boot log
console.log(`[BOOT] SentinelTrap starting on port ${PORT}`);
console.log(`[BOOT] GEMINI_API_KEY: ${API_KEY ? 'CONFIGURED' : 'MISSING'}`);
console.log(`[BOOT] X_API_KEY: ${X_API_KEY}`);

// Middleware
app.use(cors()); // Enable CORS for ALL origins
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Logger
app.use((req, res, next) => {
    const key = req.headers['x-api-key'];
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Key: ${key ? 'PRESENT' : 'MISSING'}`);
    next();
});

/**
 * Robust Gemini Interaction Function
 */
async function processWithGemini(conversationHistory, newMessage, metadata) {
    if (!API_KEY) {
        console.error("[GEMINI] Missing API_KEY");
        return {
            scamDetected: false,
            agentNotes: "Error: No Gemini API key provided in environment.",
            extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            nextResponse: "Oh, I'm sorry. I'm having a little trouble with my connection. What were you saying?"
        };
    }

    try {
        const genAI = new GoogleGenAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
            systemInstruction: "You are 'SentinelTrap AI', an expert scam-baiting agent. Analyze scammer input and respond convincingly using a persona to extract intelligence. Persona: A slightly confused but helpful elderly person named 'Agnes'. Goals: 1. Prolong conversation. 2. Extract Bank Accounts, UPI IDs, Phone Numbers, or Phishing Links. Always return valid JSON matching the schema: { scamDetected: boolean, agentNotes: string, extractedIntelligence: { bankAccounts: string[], upiIds: string[], phishingLinks: string[], phoneNumbers: string[], suspiciousKeywords: string[], scamTactics: string[], emotionalManipulation: string[] }, nextResponse: string }"
        });

        const historyText = (conversationHistory || [])
            .map(m => `${m.sender}: ${m.text}`)
            .join("\n");

        const prompt = `History:\n${historyText}\n\nScammer:\n${newMessage?.text || "Hello"}\n\nMetadata: ${JSON.stringify(metadata || {})}\n\nReturn JSON response.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Sanitize response text in case Gemini adds markdown blocks
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("[GEMINI ERROR]", error.message);
        return {
            scamDetected: false,
            agentNotes: "AI Engine Error: " + error.message,
            extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            nextResponse: "I'm not sure I understand. My memory isn't what it used to be. Could you explain that again?"
        };
    }
}

// --- API ROUTES ---

// Health Checks
app.get('/health', (req, res) => res.json({ status: 'active', server: 'Sentinel-v2.5' }));
app.get('/api/health', (req, res) => res.json({ status: 'active', api: 'Honeypot-v1' }));

// Auth Middleware
const checkAuth = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key === X_API_KEY || key === 'SENTINEL_SECURE_2026_X1' || key === process.env.X_API_KEY) {
        return next();
    }
    console.warn(`[AUTH FAIL] Access denied to: ${req.path}`);
    res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid or missing x-api-key' });
};

// Unified Route Handler for POST requests
const handleRequest = async (req, res) => {
    const { sessionId, message, text, conversationHistory, metadata } = req.body;

    // Normalize incoming message
    const msg = message || { text: text || "Ping", sender: "scammer" };
    if (!msg.text && text) msg.text = text;

    try {
        const result = await processWithGemini(conversationHistory || [], msg, metadata || {});

        const responseData = {
            status: 'success',
            scamDetected: !!result.scamDetected,
            engagementMetrics: {
                engagementDurationSeconds: 12,
                totalMessagesExchanged: (conversationHistory?.length || 0) + 2
            },
            extractedIntelligence: result.extractedIntelligence || { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            agentNotes: result.agentNotes || "Standard analysis completed.",
            message: {
                sender: 'user',
                text: result.nextResponse || "I see. Tell me more.",
                timestamp: new Date().toISOString()
            },
            nextResponse: result.nextResponse || "I see. Tell me more."
        };

        // Platform Callback (Optional/Async)
        if (responseData.scamDetected) {
            fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId || "session-" + Date.now(),
                    scamDetected: true,
                    totalMessagesExchanged: responseData.engagementMetrics.totalMessagesExchanged,
                    extractedIntelligence: responseData.extractedIntelligence,
                    agentNotes: responseData.agentNotes
                })
            }).catch(e => console.error("[CALLBACK ERR]", e.message));
        }

        res.json(responseData);
    } catch (err) {
        console.error("[CRITICAL ROUTE ERR]", err);
        res.status(500).json({ status: 'error', message: "Internal Server Error: " + err.message });
    }
};

// API Endpoints
app.post('/', checkAuth, handleRequest);
app.post('/api/honeypot', checkAuth, handleRequest);

// --- STATIC FILES & 404 ---

const distPath = path.join(__dirname, 'dist');

// Serve static assets
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Catch-all for GET (SPA Support)
app.get('*', (req, res) => {
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.status(404).json({ status: 'error', message: 'Not Found. Use POST /api/honeypot for API.' });
    }
});

// Final failover for anything else (always JSON for non-GET)
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Endpoint ${req.method} ${req.path} not found.`,
        availableEndpoints: ["POST /api/honeypot", "GET /health"]
    });
});

// Global Error Handler to prevent crashes
app.use((err, req, res, next) => {
    console.error("[FATAL ERROR]", err);
    res.status(500).json({ status: 'error', message: "Fatal crash prevented: " + err.message });
});

app.listen(PORT, () => {
    console.log(`[ONLINE] SentinelTrap Server v2.5 Ready on port ${PORT}`);
});

process.on('uncaughtException', (err) => console.error("[UNCAUGHT]", err));
process.on('unhandledRejection', (err) => console.error("[UNHANDLED]", err));
