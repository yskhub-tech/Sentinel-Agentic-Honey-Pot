import React, { useState, useEffect } from 'react';
import { HoneyPotSession, Message, ApiResponse } from './types';
import Dashboard from './components/Dashboard';
import SessionConsole from './components/SessionConsole';
import IntelligenceVault from './components/IntelligenceVault';
import { APP_SECRET_KEY, processScamMessage } from './services/api';

const INITIAL_SESSION: HoneyPotSession = {
  sessionId: `ST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
  status: 'idle',
  persona: 'Elderly',
  strategy: 'Confused',
  scamDetected: false,
  confidenceScore: 0,
  engagementMetrics: {
    engagementDurationSeconds: 0,
    totalMessagesExchanged: 0,
    startTime: new Date().toISOString()
  },
  extractedIntelligence: {
    bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [],
    suspiciousKeywords: [], scamTactics: [], emotionalManipulation: []
  },
  agentNotes: '',
  conversationHistory: [],
  metadata: { channel: 'SMS', language: 'English', locale: 'IN' }
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<HoneyPotSession[]>([]);
  const [currentSession, setCurrentSession] = useState<HoneyPotSession>(INITIAL_SESSION);
  const [view, setView] = useState<'dashboard' | 'console' | 'dev-portal'>('dev-portal');
  const [isReporting, setIsReporting] = useState(false);
  const [testLogs, setTestLogs] = useState<{ msg: string, status: 'pass' | 'fail' | 'info' }[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);
  const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<'offline' | 'active'>('offline');

  // Submission Metadata - Dynamically detect origin for Cloud Run compatibility
  const [submissionUrl, setSubmissionUrl] = useState(window.location.origin);
  const [platformKey, setPlatformKey] = useState("SENTINEL_SECURE_2026_X1");

  useEffect(() => {
    const saved = localStorage.getItem('sentineltrap_sessions_v3');
    if (saved) setSessions(JSON.parse(saved));

    const checkGateway = () => {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        setGatewayStatus('active');
        setReadinessScore(prev => Math.max(prev, 50));
      }
    };

    checkGateway();
    const interval = setInterval(checkGateway, 2000);

    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'API_REQUEST') {
        const { payload } = event.data;
        const incomingText = payload.message?.text || payload.text || "Hello";

        const mockMsg: Message = {
          sender: 'scammer',
          text: incomingText,
          timestamp: new Date().toISOString()
        };

        const result = await processScamMessage(currentSession, mockMsg);

        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage(result);
        }

        setTestLogs(prev => [{ msg: `Intercepted: "${incomingText.substring(0, 30)}..."`, status: 'info' }, ...prev]);
        setLastResponse(result);
        setReadinessScore(100);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [currentSession]);

  const triggerRealApiTest = async () => {
    setIsTesting(true);
    setTestLogs(prev => [{ msg: "Verifying Edge Gateway (sw.js)...", status: 'info' }, ...prev]);

    try {
      const response = await fetch('/api/honeypot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': platformKey
        },
        body: JSON.stringify({
          sessionId: "VALIDATION-RUN",
          text: "Urgent: Your account is locked. Verify at http://fake-bank.co"
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setTestLogs(prev => [{ msg: "GATEWAY VERIFIED: Intelligence Extracted!", status: 'pass' }, ...prev]);
        setLastResponse(data);
        setReadinessScore(100);
      } else {
        setTestLogs(prev => [{ msg: "Gateway returned error: " + data.message, status: 'fail' }, ...prev]);
      }
    } catch (err) {
      setTestLogs(prev => [{ msg: "Network error. Is Service Worker active?", status: 'fail' }, ...prev]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFinalize = async (session: HoneyPotSession) => {
    setIsReporting(true);
    try {
      const payload = {
        submissionUrl: submissionUrl,
        sessionId: session.sessionId,
        scamDetected: session.scamDetected,
        totalMessagesExchanged: session.conversationHistory.length,
        extractedIntelligence: session.extractedIntelligence,
        agentNotes: session.agentNotes
      };

      const response = await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': platformKey
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Success: Evaluation data submitted to platform.");
      } else {
        alert("Platform submission failed. Check x-api-key.");
      }
    } catch (err) {
      alert("Submission Error: Check your internet connection.");
    } finally {
      setIsReporting(false);
    }
  };

  const copyCurl = () => {
    const curl = `curl -X POST ${submissionUrl}/api/honeypot \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${platformKey}" \\
  -d '{"sessionId": "EXT-TEST", "text": "Win 1Cr! Pay 1k tax to upi: win@upi"}'`;
    navigator.clipboard.writeText(curl);
    alert("CURL command copied!");
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans">
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col p-6 space-y-8 sticky top-0 h-screen z-50">
        <div className="flex items-center gap-3 mb-4 group cursor-default">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <i className="fas fa-spider text-xl"></i>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter uppercase italic">SENTINEL<span className="text-blue-500">TRAP</span></h1>
            <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">v3.5 Final</span>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${view === 'dashboard' ? 'bg-slate-900 text-blue-400 border border-slate-800' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <i className="fas fa-grid-2"></i> Dashboard
          </button>
          <button onClick={() => setView('console')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${view === 'console' ? 'bg-slate-900 text-blue-400 border border-slate-800' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <i className="fas fa-satellite"></i> Active Ops
          </button>
          <div className="pt-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 pl-2">Compliance</div>
          <button onClick={() => setView('dev-portal')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${view === 'dev-portal' ? 'bg-slate-900 text-emerald-400 border border-slate-800' : 'text-slate-400 hover:bg-slate-900/50'}`}>
            <div className="relative">
              <i className="fas fa-check-double"></i>
              {gatewayStatus === 'active' && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>}
            </div>
            Submission Hub
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col p-8 space-y-6 overflow-y-auto">
        {view === 'dev-portal' ? (
          <div className="max-w-5xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Final Evaluation Portal</h2>
                  <div className="flex items-center gap-4">
                    <p className="text-slate-400 text-sm italic">Service Worker Gateway (Programmable API) is active.</p>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${gatewayStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      <div className={`w-2 h-2 rounded-full ${gatewayStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                      Status: {gatewayStatus.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="text-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Score</div>
                  <div className={`text-5xl font-black ${readinessScore >= 90 ? 'text-emerald-500' : 'text-slate-700'}`}>{readinessScore}%</div>
                </div>
              </div>

              {/* Submission Identity Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Submission URL</label>
                  <input
                    type="text"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-blue-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Platform API Key (x-api-key)</label>
                  <input
                    type="text"
                    value={platformKey}
                    onChange={(e) => setPlatformKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold text-slate-100 uppercase flex items-center gap-2">
                        <i className="fas fa-terminal text-blue-500"></i> Verification Terminal
                      </h4>
                      <button onClick={copyCurl} className="text-[9px] font-black text-blue-400 uppercase hover:text-blue-300">Copy Curl</button>
                    </div>
                    <div className="bg-black/50 p-4 rounded-xl font-mono text-[10px] space-y-2 h-[200px] overflow-y-auto mb-4 border border-slate-900">
                      {testLogs.map((log, i) => (
                        <div key={i} className={`flex gap-3 ${log.status === 'pass' ? 'text-emerald-400' : log.status === 'fail' ? 'text-red-400' : 'text-blue-400'}`}>
                          <span>[{log.status.toUpperCase()}]</span>
                          <span>{log.msg}</span>
                        </div>
                      ))}
                      {testLogs.length === 0 && <div className="text-slate-700 italic text-center py-10">Trigger a test to verify the Agentic engine.</div>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={triggerRealApiTest}
                        disabled={isTesting}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                      >
                        {isTesting ? 'Testing...' : 'Test Gateway API'}
                      </button>
                      <button
                        onClick={() => handleFinalize(currentSession)}
                        className="bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                      >
                        Submit Report
                      </button>
                    </div>
                  </div>
                  <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                    <p className="text-[10px] text-blue-400 italic">Note: The Edge Gateway (Service Worker) must have the app tab open to process requests. Ensure the tab is active during judging.</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col">
                  <h4 className="text-xs font-bold text-slate-100 uppercase mb-4">Intelligence Payload (JSON)</h4>
                  <div className="flex-1 bg-black/60 p-6 rounded-xl border border-slate-900 overflow-hidden">
                    <pre className="text-[10px] text-emerald-500 font-mono h-[350px] overflow-y-auto">
                      {lastResponse ? JSON.stringify(lastResponse, null, 2) : '// No interception detected.'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : view === 'dashboard' ? (
          <Dashboard sessions={sessions} url={submissionUrl} apiKey={platformKey} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 min-h-0">
            <div className="lg:col-span-2 h-full flex flex-col">
              <SessionConsole session={currentSession} onUpdate={(s) => setCurrentSession(s)} onFinalize={handleFinalize} />
            </div>
            <div className="lg:col-span-1 h-full overflow-y-auto">
              <IntelligenceVault session={currentSession} />
            </div>
          </div>
        )}
      </main>

      {isReporting && (
        <div className="fixed inset-0 bg-slate-950/98 z-[200] flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="mt-8 text-xs font-black uppercase tracking-widest text-blue-500 animate-pulse">Updating Hackathon Platform...</p>
        </div>
      )}
    </div>
  );
};

export default App;