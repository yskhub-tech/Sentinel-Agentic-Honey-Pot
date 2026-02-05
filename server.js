import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, SchemaType } from '@google/genai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
const VALID_X_API_KEY = process.env.X_API_KEY || 'SENTINEL_SECURE_2026_X1';

async function processWithGemini(conversationHistory, newMessage, metadata) {
    if (!GEMINI_API_KEY) {
        return {
            scamDetected: false,
            agentNotes: "Error: GEMINI_API_KEY is missing",
            extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            nextResponse: "I'm having trouble connecting to my brain right now. Can you repeat that?"
        };
    }

    const genAI = new GoogleGenAI(GEMINI_API_KEY);
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
        systemInstruction: "You are 'SentinelTrap AI', an expert scam-baiting agent. Analyze scammer input and respond convincingly using the assigned persona to extract intelligence. Persona: Vulnerable but curious elderly person. Goal: Bait scammer into revealing Bank Accounts, UPI IDs, or Phishing Links. Always return JSON."
    });

    try {
        const historyText = Array.isArray(conversationHistory)
            ? conversationHistory.map(m => `${m.sender}: ${m.text}`).join("\n")
            : "";

        const prompt = `
            History: ${historyText}
            Scammer: ${newMessage.text}
            Metadata: ${JSON.stringify(metadata || {})}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Gemini API Error:", error);
        return {
            scamDetected: false,
            agentNotes: "API Error: " + error.message,
            extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            nextResponse: "I'm not sure I understand. What were you saying about the transaction?"
        };
    }
}

app.use(cors());
app.use(express.json());

// Logger for debugging incoming tester requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Key: ${req.headers['x-api-key'] ? 'PRESENT' : 'MISSING'}`);
    next();
});

// Direct POST / endpoint for GUVI Tester compatibility
app.post('/', async (req, res) => {
    const xApiKey = req.headers['x-api-key'];
    // Support both the default and the user's potential custom keys
    const isAuthorized = xApiKey === VALID_X_API_KEY || xApiKey === 'SENTINEL_SECURE_2026_X1';

    if (!isAuthorized) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid x-api-key' });
    }

    const { sessionId, message, text } = req.body;
    const incomingMessage = message || { text: text || "Health Check", sender: "scammer" };

    try {
        const geminiResult = await processWithGemini([], incomingMessage, {});
        res.json({
            status: "success",
            scamDetected: geminiResult.scamDetected,
            engagementMetrics: { engagementDurationSeconds: 5, totalMessagesExchanged: 1 },
            extractedIntelligence: geminiResult.extractedIntelligence,
            agentNotes: "Tester Validation Entry"
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'active', server: 'SentinelBackend-v2' }));

// API Honeypot Route
app.post('/api/honeypot', async (req, res) => {
    const xApiKey = req.headers['x-api-key'];
    const isAuthorized = xApiKey === VALID_X_API_KEY || xApiKey === 'SENTINEL_SECURE_2026_X1';

    if (!isAuthorized) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const { sessionId, message, conversationHistory, metadata } = req.body;

    if (!message || !message.text) {
        // Fallback for missing message structure
        if (req.body.text) {
            req.body.message = { text: req.body.text, sender: 'scammer' };
        } else {
            return res.status(400).json({ status: 'error', message: 'Missing message content' });
        }
    }

    try {
        const geminiResult = await processWithGemini(conversationHistory, req.body.message || message, metadata);
        const apiResponse = {
            status: 'success',
            scamDetected: geminiResult.scamDetected,
            engagementMetrics: {
                engagementDurationSeconds: 10,
                totalMessagesExchanged: (conversationHistory?.length || 0) + 2
            },
            extractedIntelligence: geminiResult.extractedIntelligence,
            agentNotes: geminiResult.agentNotes,
            message: {
                sender: 'user',
                text: geminiResult.nextResponse,
                timestamp: new Date().toISOString()
            },
            nextResponse: geminiResult.nextResponse
        };

        if (geminiResult.scamDetected) {
            const callbackPayload = {
                sessionId: sessionId || "unnamed-session",
                scamDetected: true,
                totalMessagesExchanged: apiResponse.engagementMetrics.totalMessagesExchanged,
                extractedIntelligence: geminiResult.extractedIntelligence,
                agentNotes: geminiResult.agentNotes
            };
            fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(callbackPayload)
            }).catch(e => console.error("GUVI Callback error", e.message));
        }

        res.json(apiResponse);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Serve static files AFTER API routes
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`SentinelTrap Backend running on port ${PORT}`);
});
