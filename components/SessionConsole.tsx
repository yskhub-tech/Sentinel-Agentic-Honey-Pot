
import React, { useState, useEffect, useRef } from 'react';
import { HoneyPotSession, Message, PersonaType, EngagementStrategy } from '../types';
import { processScamMessage } from '../services/gemini';

interface SessionConsoleProps {
  session: HoneyPotSession;
  onUpdate: (updatedSession: HoneyPotSession) => void;
  onFinalize: (session: HoneyPotSession) => void;
}

const PRESET_SCRIPTS = [
  { label: 'Bank Alert', text: 'Dear Customer, your SBI account is blocked. Verify at: http://sbi-verify.net' },
  { label: 'Job Offer', text: 'Earn 5000/day. Send 500 registration fee to upi: hr-recruiter@paytm' },
  { label: 'Lottery', text: 'You won 25 Lakhs! Provide bank account and OTP to receive prize.' },
];

const SessionConsole: React.FC<SessionConsoleProps> = ({ session, onUpdate, onFinalize }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.conversationHistory]);

  const handleSend = async (text: string = inputText) => {
    const finalMsg = text.trim();
    if (!finalMsg || isProcessing) return;

    const newScammerMsg: Message = {
      sender: 'scammer',
      text: finalMsg,
      timestamp: new Date().toISOString()
    };

    const updatedSession = {
      ...session,
      status: 'active' as const,
      conversationHistory: [...session.conversationHistory, newScammerMsg]
    };
    
    onUpdate(updatedSession);
    setInputText('');
    setIsProcessing(true);

    const apiResponse = await processScamMessage(updatedSession, newScammerMsg);

    if (apiResponse.status === 'success' && apiResponse.nextResponse) {
      const newUserMsg: Message = {
        sender: 'user',
        text: apiResponse.nextResponse,
        timestamp: new Date().toISOString()
      };

      const finalUpdate = {
        ...updatedSession,
        scamDetected: apiResponse.scamDetected,
        confidenceScore: apiResponse.confidenceScore,
        agentNotes: apiResponse.agentNotes,
        extractedIntelligence: {
          bankAccounts: [...new Set([...updatedSession.extractedIntelligence.bankAccounts, ...apiResponse.extractedIntelligence.bankAccounts])],
          upiIds: [...new Set([...updatedSession.extractedIntelligence.upiIds, ...apiResponse.extractedIntelligence.upiIds])],
          phishingLinks: [...new Set([...updatedSession.extractedIntelligence.phishingLinks, ...apiResponse.extractedIntelligence.phishingLinks])],
          phoneNumbers: [...new Set([...updatedSession.extractedIntelligence.phoneNumbers, ...apiResponse.extractedIntelligence.phoneNumbers])],
          suspiciousKeywords: [...new Set([...updatedSession.extractedIntelligence.suspiciousKeywords, ...apiResponse.extractedIntelligence.suspiciousKeywords])],
          scamTactics: [...new Set([...updatedSession.extractedIntelligence.scamTactics, ...apiResponse.extractedIntelligence.scamTactics])],
          emotionalManipulation: [...new Set([...updatedSession.extractedIntelligence.emotionalManipulation, ...apiResponse.extractedIntelligence.emotionalManipulation])],
        },
        engagementMetrics: {
          ...updatedSession.engagementMetrics,
          totalMessagesExchanged: apiResponse.engagementMetrics.totalMessagesExchanged,
          engagementDurationSeconds: apiResponse.engagementMetrics.engagementDurationSeconds
        },
        conversationHistory: [...updatedSession.conversationHistory, newUserMsg]
      };
      
      onUpdate(finalUpdate);
    }
    
    setIsProcessing(false);
  };

  const updateConfig = (field: 'persona' | 'strategy', value: any) => {
    onUpdate({ ...session, [field]: value });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* Control Header */}
      <div className="bg-slate-900 px-8 py-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
          <i className="fas fa-message-square text-blue-500"></i>
          <h3 className="font-bold text-slate-100 text-sm tracking-tight uppercase">Conversation Hub</h3>
        </div>
        <div className="flex gap-2">
          <select 
            value={session.persona} 
            onChange={(e) => updateConfig('persona', e.target.value as PersonaType)}
            className="bg-slate-950 text-[10px] font-bold text-slate-400 border border-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
          >
            <option>Elderly</option>
            <option>Student</option>
            <option>Job Seeker</option>
            <option>Small Business Owner</option>
          </select>
          <button 
            onClick={() => onFinalize(session)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
          >
            Finalize Report
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-900/40 relative">
        {session.conversationHistory.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-4">
              <i className="fas fa-radar fa-pulse text-2xl"></i>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Scanning Signal...</p>
          </div>
        )}
        
        {session.conversationHistory.map((msg, i) => (
          <div key={i} className={`flex flex-col animate-in fade-in duration-300`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${msg.sender === 'scammer' ? 'text-red-400' : 'text-blue-400'}`}>
                {msg.sender === 'scammer' ? 'Scammer' : `Agent (${session.persona})`}
              </span>
              <span className="text-[9px] font-mono text-slate-600">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
              msg.sender === 'scammer' 
                ? 'bg-slate-800 text-slate-100 border border-slate-700' 
                : 'bg-slate-700 text-slate-100 border border-slate-600'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Agent</span>
            <div className="bg-slate-700/50 border border-blue-500/30 text-blue-200 p-4 rounded-2xl text-xs flex items-center gap-3 animate-pulse">
              <i className="fas fa-brain fa-spin"></i>
              <span>Generating believable response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Terminal */}
      <div className="p-6 bg-slate-950/80 border-t border-slate-800">
        <div className="flex gap-4 mb-4 overflow-x-auto pb-2 custom-scrollbar">
          {PRESET_SCRIPTS.map((script, i) => (
            <button 
              key={i}
              onClick={() => handleSend(script.text)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
            >
              {script.label}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Input Scammer Message..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-100 placeholder:text-slate-600"
          />
          <button 
            onClick={() => handleSend()}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white w-14 rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center border border-blue-400/20"
          >
            <i className="fas fa-bolt"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionConsole;
