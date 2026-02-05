import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Comprehensive request logger
app.use((req, res, next) => {
    console.log('='.repeat(80));
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('='.repeat(80));
    next();
});

// Mock response generator
function createResponse(text) {
    const response = {
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
        agentNotes: `Successfully processed: "${text || 'empty'}"`,
        nextResponse: "Thank you. Could you tell me more?",
        message: {
            sender: 'user',
            text: "Thank you. Could you tell me more?",
            timestamp: new Date().toISOString()
        }
    };

    console.log('[RESPONSE] Sending:', JSON.stringify(response, null, 2));
    return response;
}

// Health endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0-debug'
    };
    console.log('[HEALTH] Response:', JSON.stringify(health));
    res.json(health);
});

// Root POST endpoint  
app.post('/', (req, res) => {
    console.log('[ROOT POST] Processing...');

    try {
        const { text, message } = req.body;
        const inputText = message?.text || text || 'ping';

        res.json(createResponse(inputText));
    } catch (error) {
        console.error('[ROOT ERROR]', error);
        res.status(500).json({
            status: 'error', message: 'Error: ' + error.message
        });
    }
});

// API honeypot endpoint
app.post('/api/honeypot', (req, res) => {
    console.log('[API] Processing...');

    try {
        const { text, message } = req.body;
        const inputText = message?.text || text || 'ping';

        res.json(createResponse(inputText));
    } catch (error) {
        console.error('[API ERROR]', error);
        res.status(500).json({
            status: 'error',
            message: 'Error: ' + error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    console.log('[404]', req.method, req.path);
    res.status(404).json({
        status: 'error',
        message: 'Not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[FATAL]', err);
    res.status(500).json({
        status: 'error',
        message: 'Fatal: ' + err.message
    });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(80));
    console.log(`[BOOT] Honeypot API v3.0 on port ${PORT}`);
    console.log(`[BOOT] Time: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
});

process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));
process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));
