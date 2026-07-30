import React, { useState } from 'react';
import { TrendingUp, Bot, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { getApmcMandiPrices, queryAiAgronomyBot, MandiPrice, AiAdvisoryQuery } from '../../platform/remainingPlatformServices';

export const MandiAndAiWorkspace: React.FC = () => {
  const [mandiPrices] = useState<MandiPrice[]>(getApmcMandiPrices('Nagpur APMC'));
  const [aiQuestion, setAiQuestion] = useState<string>('What is the best fertilizer dose for Soybean?');
  const [aiResponse, setAiResponse] = useState<AiAdvisoryQuery | null>(null);

  const handleAskAi = () => {
    const res = queryAiAgronomyBot('FMR_101', aiQuestion);
    setAiResponse(res);
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            <h2 className="text-base font-black tracking-tight">Market Linkage & AI Agronomy Bot (Chapters 22 & 24)</h2>
          </div>
          <p className="text-xs text-emerald-100 mt-1 font-medium">
            APMC Mandi MSP Price Ticker & Generative AI Crop Disease Advisory Models
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* APMC Mandi Ticker Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center">
              <TrendingUp className="w-4 h-4 text-emerald-600 mr-1.5" />
              Live APMC Mandi MSP Prices
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">UPDATED TODAY</span>
          </div>

          <div className="space-y-2">
            {mandiPrices.map(p => (
              <div key={p.price_id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900">{p.commodity_name}</span>
                  <p className="text-[10px] text-slate-500">{p.mandi_name}</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-emerald-700">₹{p.modal_price_quintal.toLocaleString('en-IN')} / Qtl</span>
                  <span className="block text-[9px] text-slate-400">Range: ₹{p.min_price_quintal} - ₹{p.max_price_quintal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Agronomy Bot Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center">
              <Bot className="w-4 h-4 text-purple-600 mr-1.5" />
              AI Multilingual Agronomy Advisory Bot
            </h3>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">LLM MODEL v3.0</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-purple-600"
              placeholder="Ask crop disease or fertilizer query..."
            />
            <button
              onClick={handleAskAi}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white p-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ask AI Agronomist Bot</span>
            </button>

            {aiResponse && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[10px] text-purple-700 font-bold">
                  <span>AI CONFIDENCE: {(aiResponse.confidence_score * 100).toFixed(1)}%</span>
                  <span>QUERY ID: {aiResponse.query_id}</span>
                </div>
                <p className="text-xs font-bold text-purple-950 mt-1">{aiResponse.response_text}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
