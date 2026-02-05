const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - allow ALL origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));

// Parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log every request
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Body:', req.body);
    next();
});

// Mock response
function getResponse(text) {
    return {
        status: 'success',
        scamDetected: false,
        engagementMetrics: {
            engagementDurationSeconds: 5,
            totalMessagesExchanged: 1
        },
        extractedIntelligence: {
            bankAccounts: [],
            upiIds: [],
            phishingLinks: [],
            phoneNumbers: [],
            suspiciousKeywords: [],
            scamTactics: [],
            emotionalManipulation: []
        },
        agentNotes: `Processed: ${text}`,
        nextResponse: "Tell me more",
        message: {
            sender: 'user',
            text: "Tell me more",
            timestamp: new Date().toISOString()
        }
    };
}

// Health check
app.get('/health', (req, res) => {
    res.set('Content-Type', 'application/json');
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Main API - ROOT
app.post('/', (req, res) => {
    console.log('[ROOT] Request received');
    res.set('Content-Type', 'application/json');
    const text = req.body.message?.text || req.body.text || 'hello';
    res.json(getResponse(text));
});

// Main API - /api/honeypot
app.post('/api/honeypot', (req, res) => {
    console.log('[API] Request received');
    res.set('Content-Type', 'application/json');
    const text = req.body.message?.text || req.body.text || 'hello';
    res.json(getResponse(text));
});

// Catch errors
app.use((err, req, res, next) => {
    console.error('ERROR:', err);
    res.set('Content-Type', 'application/json');
    res.status(500).json({ status: 'error', message: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
    console.log(`Time: ${new Date().toISOString()}`);
});
