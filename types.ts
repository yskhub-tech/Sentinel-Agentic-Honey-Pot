
export type PersonaType = 'Elderly' | 'Student' | 'Job Seeker' | 'Small Business Owner';
export type EngagementStrategy = 'Confused' | 'Cooperative' | 'Skeptical' | 'Urgent';

export interface Message {
  sender: 'scammer' | 'user';
  text: string;
  timestamp: string;
}

export interface Intelligence {
  bankAccounts: string[];
  upiIds: string[];
  phishingLinks: string[];
  phoneNumbers: string[];
  suspiciousKeywords: string[];
  scamTactics: string[];
  emotionalManipulation: string[];
}

export interface HoneyPotSession {
  sessionId: string;
  status: 'active' | 'completed' | 'idle';
  persona: PersonaType;
  strategy: EngagementStrategy;
  scamDetected: boolean;
  confidenceScore: number;
  engagementMetrics: {
    engagementDurationSeconds: number;
    totalMessagesExchanged: number;
    startTime: string;
  };
  extractedIntelligence: Intelligence;
  agentNotes: string;
  conversationHistory: Message[];
  metadata: {
    channel: string;
    language: string;
    locale: string;
  };
}

export interface ApiResponse {
  status: 'success' | 'error';
  scamDetected: boolean;
  confidenceScore: number;
  engagementMetrics: {
    engagementDurationSeconds: number;
    totalMessagesExchanged: number;
  };
  extractedIntelligence: Intelligence;
  agentNotes: string;
  nextResponse?: string;
}
