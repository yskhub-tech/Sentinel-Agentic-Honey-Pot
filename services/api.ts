import { Message, HoneyPotSession, ApiResponse } from "../types";

export const APP_SECRET_KEY = "SENTINEL_SECURE_2026_X1";

/**
 * Unified API bridge to the backend server.
 * This ensures compliance with the "Programmable API" requirement.
 */
export const processScamMessage = async (session: HoneyPotSession, newMessage: Message): Promise<ApiResponse> => {
    try {
        const response = await fetch('/api/honeypot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': APP_SECRET_KEY
            },
            body: JSON.stringify({
                sessionId: session.sessionId,
                message: newMessage,
                conversationHistory: session.conversationHistory,
                metadata: session.metadata
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API Error');
        }

        return await response.json();
    } catch (error: any) {
        console.error("API Bridge Error:", error);
        return {
            status: 'error',
            scamDetected: false,
            confidenceScore: 0,
            engagementMetrics: { engagementDurationSeconds: 0, totalMessagesExchanged: session.conversationHistory.length },
            extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
            agentNotes: "Sync Error: " + error.message
        };
    }
};
