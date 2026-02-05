import { GoogleGenAI, Type } from "@google/genai";
import { Message, HoneyPotSession, ApiResponse } from "../types";

export const APP_SECRET_KEY = "SENTINEL_SECURE_2026_X1";

const SYSTEM_INSTRUCTION = `You are 'SentinelTrap AI', an expert scam-baiting agent. 
Analyze scammer input and respond convincingly using the assigned persona to extract intelligence.
You must return a valid JSON object matching the requested schema.
Persona consistency is mandatory. Goal: Bait scammer into revealing Bank Accounts, UPI IDs, or Phishing Links.`;

export const processScamMessage = async (session: HoneyPotSession, newMessage: Message): Promise<ApiResponse> => {
  const startTime = Date.now();
  
  // process.env.API_KEY is replaced at build-time by Vite's define config
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    console.error("Gemini API Key is missing or invalid. Current value:", apiKey === "undefined" ? "string 'undefined'" : "falsy");
    return {
      status: 'error',
      scamDetected: false,
      confidenceScore: 0,
      engagementMetrics: { engagementDurationSeconds: 0, totalMessagesExchanged: 0 },
      extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
      agentNotes: "System Error: API Configuration Missing. Please ensure API_KEY is set in your Render Build Environment Variables."
    };
  }

  // Create instance right before use as per best practices
  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview';
  
  const historyString = session.conversationHistory
    .map(m => `${m.sender.toUpperCase()}: ${m.text}`)
    .join('\n');

  const prompt = `
    CURRENT PERSONA: ${session.persona}
    LAST SCAMMER INPUT: "${newMessage.text}"
    CONVERSATION HISTORY:
    ${historyString}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scamDetected: { type: Type.BOOLEAN },
            agentNotes: { type: Type.STRING },
            extractedIntelligence: {
              type: Type.OBJECT,
              properties: {
                bankAccounts: { type: Type.ARRAY, items: { type: Type.STRING } },
                upiIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                phishingLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                phoneNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
                suspiciousKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                scamTactics: { type: Type.ARRAY, items: { type: Type.STRING } },
                emotionalManipulation: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["bankAccounts", "upiIds", "phishingLinks", "phoneNumbers", "suspiciousKeywords", "scamTactics", "emotionalManipulation"]
            },
            nextResponse: { type: Type.STRING }
          },
          required: ["scamDetected", "agentNotes", "extractedIntelligence", "nextResponse"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    const duration = Math.floor((Date.now() - startTime) / 1000);

    return {
      status: 'success',
      scamDetected: result.scamDetected ?? false,
      confidenceScore: result.scamDetected ? 0.99 : 0.01,
      engagementMetrics: {
        engagementDurationSeconds: duration,
        totalMessagesExchanged: session.conversationHistory.length + 1
      },
      extractedIntelligence: result.extractedIntelligence || {
        bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [],
        suspiciousKeywords: [], scamTactics: [], emotionalManipulation: []
      },
      agentNotes: result.agentNotes || "No notes provided.",
      nextResponse: result.nextResponse || "I see. Tell me more."
    };
  } catch (error: any) {
    console.error("Gemini processing error:", error);
    
    // Check for specific API Key errors to provide better guidance
    const errorMessage = error?.message || "";
    let userNotes = "Agent engine error. Please check your internet connection.";
    
    if (errorMessage.includes("API key not valid")) {
      userNotes = "Critical: The API key provided is rejected by Google. Double-check your API_KEY in Render settings.";
    }

    return {
      status: 'error',
      scamDetected: false,
      confidenceScore: 0,
      engagementMetrics: { engagementDurationSeconds: 0, totalMessagesExchanged: 0 },
      extractedIntelligence: { bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [], suspiciousKeywords: [], scamTactics: [], emotionalManipulation: [] },
      agentNotes: userNotes
    };
  }
};