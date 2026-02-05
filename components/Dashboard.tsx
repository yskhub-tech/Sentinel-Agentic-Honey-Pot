import React from 'react';
import { HoneyPotSession } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  sessions: HoneyPotSession[];
  url: string;
  apiKey: string;
}

const Dashboard: React.FC<DashboardProps> = ({ sessions, url, apiKey }) => {
  const activeCount = sessions.filter(s => s.status === 'active').length;
  const scamCount = sessions.filter(s => s.scamDetected).length;
  
  const intelligenceCount = sessions.reduce((acc, s) => {
    return acc + 
           s.extractedIntelligence.bankAccounts.length + 
           s.extractedIntelligence.upiIds.length + 
           s.extractedIntelligence.phishingLinks.length +
           s.extractedIntelligence.phoneNumbers.length;
  }, 0);

  const mainStats = [
    { name: 'Active Ops', value: activeCount, color: '#3b82f6', icon: 'fa-satellite-dish' },
    { name: 'Detections', value: scamCount, color: '#ef4444', icon: 'fa-shield-virus' },
    { name: 'Intel Gathered', value: intelligenceCount, color: '#10b981', icon: 'fa-microchip' },
  ];

  const personaData = sessions.reduce((acc: any[], s) => {
    const existing = acc.find(p => p.name === s.persona);
    if (existing) existing.value++;
    else acc.push({ name: s.persona, value: 1 });
    return acc;
  }, []);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Access Credentials Widget */}
      <div className="bg-gradient-to-r from-blue-900/20 to-slate-900 border border-blue-500/20 p-6 rounded-3xl shadow-2xl mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-4 w-full">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Access Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group">
                <div className="overflow-hidden">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Deployment URL</p>
                  <p className="text-xs font-mono text-blue-300 truncate">{url}</p>
                </div>
                <button onClick={() => copyToClipboard(url)} className="p-2 text-slate-600 hover:text-blue-400 transition-colors">
                  <i className="fas fa-copy text-sm"></i>
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group">
                <div className="overflow-hidden">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Access Key (x-api-key)</p>
                  <p className="text-xs font-mono text-emerald-400 truncate">{apiKey}</p>
                </div>
                <button onClick={() => copyToClipboard(apiKey)} className="p-2 text-slate-600 hover:text-emerald-400 transition-colors">
                  <i className="fas fa-copy text-sm"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 shrink-0">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
               <i className="fas fa-check-circle text-2xl animate-pulse"></i>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-100">Gateway Status</p>
              <p className="text-[10px] font-mono text-emerald-500">READY FOR SYNC</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mainStats.map((stat, i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">{stat.name}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <i className={`fas ${stat.icon}`}></i>
              </div>
            </div>
            <p className="text-4xl font-black text-slate-100">{stat.value}</p>
            <div className="mt-2 text-[10px] text-slate-500 font-mono">LIVE STATUS: SYNCED</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl h-80">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <i className="fas fa-chart-bar text-blue-500"></i>
            Intelligence Extraction Trend
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessions.slice(0, 7).reverse().map(s => ({ name: s.sessionId.slice(-4), intel: Object.values(s.extractedIntelligence).flat().length }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="intel" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl h-80">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <i className="fas fa-users text-purple-500"></i>
            Persona Effectiveness
          </h3>
          <div className="flex items-center justify-center h-full pb-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={personaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {personaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 ml-4">
              {personaData.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-slate-400">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;