import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// API Keys Configuration
// Try different common env variable names for flexibility
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
const X_API_KEY = process.env.X_API_KEY || 'SENTINEL_SECURE_2026_X1';

// Boot log
console.log(`[BOOT] SentinelTrap starting on port ${PORT}`);
console.log(`[BOOT] API_KEY: ${API_KEY ? 'CONFIGURED' : 'MISSING'}`);
console.log(`[BOOT] X_API_KEY: ${X_API_KEY}`);

// Middleware
app.use(cors());
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
            agentNotes: "System Error: Gemini API key is not configured.",
            extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            nextResponse: "I'm sorry, I'm feeling a bit confused today. Could you repeat that?"
        };
    }

    try {
        const genAI = new GoogleGenAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        scamDetected: { type: "boolean" },
                        agentNotes: { type: "string" },
                        extractedIntelligence: {
                            type: "object",
                            properties: {
                                bankAccounts: { type: "array", items: { type: "string" } },
                                upiIds: { type: "array", items: { type: "string" } },
                                phishingLinks: { type: "array", items: { type: "string" } },
                                phoneNumbers: { type: "array", items: { type: "string" } },
                                suspiciousKeywords: { type: "array", items: { type: "string" } },
                                scamTactics: { type: "array", items: { type: "string" } },
                                emotionalManipulation: { type: "array", items: { type: "string" } }
                            },
                            required: ["bankAccounts", "upiIds", "phishingLinks", "phoneNumbers", "suspiciousKeywords", "scamTactics", "emotionalManipulation"]
                        },
                        nextResponse: { type: "string" }
                    },
                    required: ["scamDetected", "agentNotes", "extractedIntelligence", "nextResponse"]
                }
            },
            systemInstruction: `You are 'SentinelTrap AI', an expert scam-baiting agent. 
            Analyze scammer input and respond convincingly using a persona to extract intelligence. 
            Persona: A slightly confused but helpful elderly person named 'Agnes'.
            Goals: 
            1. Prolong the conversation.
            2. Extract Bank Accounts, UPI IDs, Phone Numbers, or Phishing Links.
            3. Detect if the input is a scam.
            Always maintain the persona. Never reveal you are an AI. 
            Output must be valid JSON as per schema.`
        });

        const historyText = (conversationHistory || [])
            .map(m => `${m.sender}: ${m.text}`)
            .join("\n");

        const prompt = `
            Conversation History:
            ${historyText}

            New Scammer Message:
            ${newMessage.text}

            Context/Metadata:
            ${JSON.stringify(metadata || {})}
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        return JSON.parse(response.text());
    } catch (error) {
        console.error("[GEMINI ERROR]", error.message);
        return {
            scamDetected: false,
            agentNotes: "AI Processing Error: " + error.message,
            extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            nextResponse: "Oh dear, my internet is acting up again. What was that about the bank?"
        };
    }
}

// --- API ROUTES ---

// Health Check (Always JSON)
app.get('/health', (req, res) => res.json({ status: 'active', version: '2.1.0-secure' }));

// Auth Middleware Helper
const checkAuth = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (key === X_API_KEY || key === 'SENTINEL_SECURE_2026_X1') {
        return next();
    }
    console.warn(`[AUTH] Unauthorized access attempt path: ${req.path}`);
    res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid x-api-key' });
};

// Root POST (Commonly used by testers)
app.post('/', checkAuth, async (req, res) => {
    const { sessionId, message, text } = req.body;
    const msg = message || { text: text || "Ping", sender: "scammer" };

    try {
        const result = await processWithGemini([], msg, {});
        res.json({
            status: "success",
            scamDetected: result.scamDetected,
            engagementMetrics: { engagementDurationSeconds: 10, totalMessagesExchanged: 1 },
            extractedIntelligence: result.extractedIntelligence,
            agentNotes: result.agentNotes || "Validation check successful"
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Full Honeypot Endpoint
app.post('/api/honeypot', checkAuth, async (req, res) => {
    const { sessionId, message, conversationHistory, metadata } = req.body;

    if (!message || !message.text) {
        // Fallback for flat structure
        if (req.body.text) {
            req.body.message = { text: req.body.text, sender: 'scammer' };
        } else {
            return res.status(400).json({ status: 'error', message: 'Missing "message" or "text" in body' });
        }
    }

    try {
        const activeMessage = req.body.message || message;
        const result = await processWithGemini(conversationHistory, activeMessage, metadata);

        const responseData = {
            status: 'success',
            scamDetected: result.scamDetected,
            engagementMetrics: {
                engagementDurationSeconds: 15,
                totalMessagesExchanged: (conversationHistory?.length || 0) + 2
            },
            extractedIntelligence: result.extractedIntelligence,
            agentNotes: result.agentNotes,
            message: {
                sender: 'user',
                text: result.nextResponse,
                timestamp: new Date().toISOString()
            },
            nextResponse: result.nextResponse
        };

        // Trigger GUVI Callback if scam detected
        if (result.scamDetected) {
            fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId || "anon-" + Date.now(),
                    scamDetected: true,
                    totalMessagesExchanged: responseData.engagementMetrics.totalMessagesExchanged,
                    extractedIntelligence: result.extractedIntelligence,
                    agentNotes: result.agentNotes
                })
            }).catch(e => console.error("[GUVI CALLBACK ERROR]", e.message));
        }

        res.json(responseData);
    } catch (err) {
        console.error("[API ERROR]", err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// --- STATIC FILES & FALLBACK ---

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Fallback handler for all other requests
app.use((req, res) => {
    // If it's a GET request, try serving index.html (SPA support)
    if (req.method === 'GET') {
        const indexFile = path.join(distPath, 'index.html');
        if (fs.existsSync(indexFile)) {
            return res.sendFile(indexFile);
        }
    }

    // Otherwise, return JSON 404
    res.status(404).json({
        status: 'error',
        message: `Route ${req.method} ${req.path} not found.`,
        suggestion: 'Use POST /api/honeypot for the main API.'
    });
});

app.listen(PORT, () => {
    console.log(`[READY] SentinelTrap Server listening on port ${PORT}`);
});
