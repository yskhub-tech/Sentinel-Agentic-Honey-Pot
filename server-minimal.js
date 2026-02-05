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

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body:', JSON.stringify(req.body));
    next();
});

// Mock API response function (no Gemini dependency for testing)
function createMockResponse(text) {
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
        agentNotes: `Processed message: "${text}"`,
        nextResponse: "Thank you for reaching out. Could you tell me more?",
        message: {
            sender: 'user',
            text: "Thank you for reaching out. Could you tell me more?",
            timestamp: new Date().toISOString()
        }
    };
}

// Health check
app.get('/health', (req, res) => {
    console.log('[HEALTH] Health check requested');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main API endpoint - ROOT
app.post('/', (req, res) => {
    console.log('[ROOT POST] Request received');

    try {
        const { text, message } = req.body;
        const inputText = message?.text || text || 'Hello';

        const response = createMockResponse(inputText);
        console.log('[ROOT POST] Responding with:', JSON.stringify(response));

        res.json(response);
    } catch (error) {
        console.error('[ROOT POST ERROR]', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Main API endpoint - /api/honeypot
app.post('/api/honeypot', (req, res) => {
    console.log('[API HONEYPOT] Request received');

    try {
        const { text, message } = req.body;
        const inputText = message?.text || text || 'Hello';

        const response = createMockResponse(inputText);
        console.log('[API HONEYPOT] Responding with:', JSON.stringify(response));

        res.json(response);
    } catch (error) {
        console.error('[API HONEYPOT ERROR]', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Catch-all for 404
app.use((req, res) => {
    console.log('[404] Route not found:', req.method, req.path);
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[FATAL ERROR]', err);
    res.status(500).json({
        status: 'error',
        message: 'Server error: ' + err.message
    });
});

app.listen(PORT, () => {
    console.log(`[SERVER] Minimal API server running on port ${PORT}`);
    console.log(`[SERVER] Test with: curl -X POST http://localhost:${PORT}/api/honeypot -H "Content-Type: application/json" -d "{\\"text\\": \\"test\\"}"`);
});
