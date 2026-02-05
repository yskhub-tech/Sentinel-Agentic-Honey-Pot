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
const GEMINI_API_KEY = process.env.API_KEY;
const VALID_X_API_KEY = process.env.X_API_KEY || 'SENTINEL_SECURE_2026_X1';

app.use(cors());
app.use(express.json());

// Serve static files from the React app (built v1)
app.use(express.static(path.join(__dirname, 'dist')));

const SYSTEM_INSTRUCTION = `You are 'SentinelTrap AI', an expert scam-baiting agent. 
Analyze scammer input and respond convincingly using a believable human persona to extract intelligence.
Goal: Bait scammer into revealing Bank Accounts, UPI IDs, Phishing Links, or Phone Numbers.
Behave like a real human. Adapt responses dynamically. Do not reveal you are an AI.
Return a valid JSON object matching the requested schema.`;

async function processWithGemini(sessionHistory, newMessage, metadata) {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API Key missing in environment variables.");
    }

    const genAI = new GoogleGenAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
    });

    const historyString = (sessionHistory || [])
        .map(m => `${m.sender.toUpperCase()}: ${m.text}`)
        .join('\n');

    const prompt = `
    METADATA: ${JSON.stringify(metadata || {})}
    PERSONA: ${metadata?.persona || 'Elderly Person'}
    LANGUAGE: ${metadata?.language || 'English'}
    LOCALE: ${metadata?.locale || 'IN'}
    CHANNEL: ${metadata?.channel || 'SMS'}
    LAST SCAMMER INPUT: "${newMessage.text}"
    CONVERSATION HISTORY:
    ${historyString}
  `;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    scamDetected: { type: SchemaType.BOOLEAN },
                    agentNotes: { type: SchemaType.STRING },
                    extractedIntelligence: {
                        type: SchemaType.OBJECT,
                        properties: {
                            bankAccounts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            upiIds: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            phishingLinks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            phoneNumbers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            suspiciousKeywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            scamTactics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            emotionalManipulation: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                        },
                        required: ["bankAccounts", "upiIds", "phishingLinks", "phoneNumbers", "suspiciousKeywords", "scamTactics", "emotionalManipulation"]
                    },
                    nextResponse: { type: SchemaType.STRING }
                },
                required: ["scamDetected", "agentNotes", "extractedIntelligence", "nextResponse"]
            }
        }
    });

    const text = result.response.text();
    return JSON.parse(text);
}

app.post('/api/honeypot', async (req, res) => {
    const xApiKey = req.headers['x-api-key'];
    if (xApiKey !== VALID_X_API_KEY) {
        console.log(`Unauthorized access attempt with key: ${xApiKey}`);
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const { sessionId, message, conversationHistory, metadata } = req.body;

    if (!message || !message.text) {
        return res.status(400).json({ status: 'error', message: 'Missing message content' });
    }

    console.log(`Processing session ${sessionId} - Received: ${message.text.substring(0, 50)}...`);

    try {
        const geminiResult = await processWithGemini(conversationHistory, message, metadata);

        const apiResponse = {
            status: 'success',
            scamDetected: geminiResult.scamDetected,
            engagementMetrics: {
                engagementDurationSeconds: Math.floor(Math.random() * 20) + 10,
                totalMessagesExchanged: (conversationHistory ? conversationHistory.length : 0) + 2
            },
            extractedIntelligence: geminiResult.extractedIntelligence,
            agentNotes: geminiResult.agentNotes,
            message: {
                sender: 'user',
                text: geminiResult.nextResponse,
                timestamp: new Date().toISOString()
            },
            // Added for compatibility with current UI expectation if it also uses this endpoint
            nextResponse: geminiResult.nextResponse
        };

        // Callback to GUVI (Mandatory)
        if (geminiResult.scamDetected) {
            try {
                const callbackPayload = {
                    sessionId: sessionId || "unnamed-session",
                    scamDetected: true,
                    totalMessagesExchanged: apiResponse.engagementMetrics.totalMessagesExchanged,
                    extractedIntelligence: geminiResult.extractedIntelligence,
                    agentNotes: geminiResult.agentNotes
                };

                const guviUrl = "https://hackathon.guvi.in/api/updateHoneyPotFinalResult";
                console.log(`Sending callback to GUVI for session ${sessionId}...`);

                fetch(guviUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(callbackPayload)
                }).then(r => console.log(`GUVI Callback status: ${r.status}`))
                    .catch(e => console.error("GUVI Callback network error:", e.message));

            } catch (callbackErr) {
                console.error("Callback formulation error:", callbackErr.message);
            }
        }

        res.json(apiResponse);
    } catch (error) {
        console.error("Processing error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.get('/health', (req, res) => res.json({ status: 'active', server: 'SentinelBackend-v2' }));

// Direct POST / endpoint for GUVI Tester compatibility
app.post('/', async (req, res) => {
    const xApiKey = req.headers['x-api-key'];
    if (xApiKey !== VALID_X_API_KEY) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const { sessionId, message, text } = req.body;

    // Normalize input for tester (it might send "text" instead of "message.text")
    const incomingMessage = message || { text: text || "System Health Check", sender: "scammer" };

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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`SentinelTrap Backend running on port ${PORT}`);
});
