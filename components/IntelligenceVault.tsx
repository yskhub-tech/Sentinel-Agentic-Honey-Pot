
import React from 'react';
import { HoneyPotSession } from '../types';

interface IntelligenceVaultProps {
  session: HoneyPotSession;
}

const IntelligenceVault: React.FC<IntelligenceVaultProps> = ({ session }) => {
  const { extractedIntelligence, agentNotes } = session;

  const IntelSection = ({ title, icon, items, color, bg }: { title: string, icon: string, items: string[], color: string, bg: string }) => (
    <div className={`bg-slate-950/40 border border-slate-800 rounded-2xl p-5 transition-all hover:bg-slate-950 group/section`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center border border-slate-700/50 group-hover/section:scale-110 transition-transform`}>
            <i className={`fas ${icon} ${color} text-sm`}></i>
          </div>
          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">{items.length}</span>
      </div>
      
      {items.length === 0 ? (
        <div className="py-6 border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20 text-center">
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">No Data Cached</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-[11px] font-mono bg-slate-900/50 border border-slate-800/50 px-4 py-3 rounded-xl flex items-center justify-between group animate-in slide-in-from-right-4 duration-500 hover:border-blue-500/30 transition-colors">
              <span className="truncate text-slate-300 pr-6 select-all">{item}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(item)}
                className="text-slate-600 hover:text-blue-400 transition-colors flex-shrink-0"
              >
                <i className="fas fa-copy"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="h-full bg-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col shadow-inner">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]"></div>
          <div>
            <h3 className="text-xl font-black text-slate-100 tracking-tighter uppercase">Signal Intel</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Real-time Extraction</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-xl">
          <i className="fas fa-satellite-dish"></i>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {/* Behavioral Fingerprint */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
             <i className="fas fa-fingerprint text-blue-500 text-xs"></i>
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Tactical Summary</h4>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl shadow-inner relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
               <i className="fas fa-quote-right text-4xl"></i>
            </div>
            <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
              {agentNotes || "Monitoring incoming packets for behavioral patterns..."}
            </p>
          </div>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 gap-5">
           <IntelSection 
            title="Attack Vectors" 
            icon="fa-shield-virus" 
            items={extractedIntelligence.scamTactics} 
            color="text-amber-500" 
            bg="bg-amber-500/10"
          />
          <IntelSection 
            title="Emotional Triggers" 
            icon="fa-brain" 
            items={extractedIntelligence.emotionalManipulation} 
            color="text-purple-500" 
            bg="bg-purple-500/10"
          />
          <IntelSection 
            title="Payment Rails" 
            icon="fa-money-check-alt" 
            items={[...extractedIntelligence.upiIds, ...extractedIntelligence.bankAccounts]} 
            color="text-emerald-500" 
            bg="bg-emerald-500/10"
          />
          <IntelSection 
            title="Active Domains" 
            icon="fa-link" 
            items={extractedIntelligence.phishingLinks} 
            color="text-red-500" 
            bg="bg-red-500/10"
          />
          <IntelSection 
            title="Burner IDs" 
            icon="fa-phone" 
            items={extractedIntelligence.phoneNumbers} 
            color="text-blue-500" 
            bg="bg-blue-500/10"
          />
        </div>
      </div>
      
      {/* Engine Status */}
      <div className="mt-8 pt-6 border-t border-slate-900">
         <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/60 group hover:border-blue-500/30 transition-colors">
            <div className="relative">
               <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 font-black text-sm">AI</div>
               <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse"></div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black text-slate-100 uppercase tracking-widest">Sentinel Extraction Engine</div>
              <div className="text-[10px] text-slate-500 font-mono">STATUS: HIGH_FIDELITY_STREAMING</div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default IntelligenceVault;
