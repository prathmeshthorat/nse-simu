import React from "react";
import type { MarketRegime, OrderSide } from "../types/market";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Waves,
  Wind,
} from "lucide-react";

interface ScenarioBarProps {
  currentRegime: MarketRegime;
  onSetRegime: (regime: MarketRegime) => void;
  onTriggerWhale: (side: OrderSide) => void;
}

export const ScenarioBar: React.FC<ScenarioBarProps> = ({
  currentRegime,
  onSetRegime,
  onTriggerWhale,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Market Shocks & Flow Injections:
        </span>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Test your Market Making strategy under stress
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Whale Buy Sweep */}
        <button
          onClick={() => onTriggerWhale("BUY")}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Inject massive institutional market BUY sweep across multiple Ask levels (test short inventory skew)"
        >
          <span>🐋</span> Whale Buy Sweep
        </button>

        {/* Whale Sell Dump */}
        <button
          onClick={() => onTriggerWhale("SELL")}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Inject massive institutional market SELL dump across multiple Bid levels (test long inventory skew)"
        >
          <span>🐋</span> Whale Sell Dump
        </button>

        {/* Flash Crash */}
        <button
          onClick={() => onSetRegime("FLASH_CRASH")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRegime === "FLASH_CRASH"
              ? "bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30 animate-pulse"
              : "bg-slate-800 text-rose-300 hover:bg-slate-700 border border-rose-900/60"
          }`}
          title="Trigger sudden cascade of toxic sell orders, collapsing price and testing auto-hedge stop loss"
        >
          <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> Flash Crash
        </button>

        {/* Bull Rally */}
        <button
          onClick={() => onSetRegime("BULL_RALLY")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRegime === "BULL_RALLY"
              ? "bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30 animate-pulse"
              : "bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-emerald-900/60"
          }`}
          title="Trigger continuous upward buying pressure and positive drift"
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Bull Rally
        </button>

        {/* High Volatility */}
        <button
          onClick={() => onSetRegime("HIGH_VOLATILITY")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRegime === "HIGH_VOLATILITY"
              ? "bg-amber-600 text-white font-bold shadow-lg shadow-amber-600/30 animate-pulse"
              : "bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-900/60"
          }`}
          title="Trigger extreme volatility with wide bid-ask spreads and rapid price whipsaws"
        >
          <Waves className="w-3.5 h-3.5 text-amber-400" /> Vol Spike
        </button>

        {/* Normal Calm */}
        <button
          onClick={() => onSetRegime("NORMAL")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            currentRegime === "NORMAL"
              ? "bg-indigo-600 text-white font-bold"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
          }`}
          title="Return to balanced, low-volatility two-way flow optimal for harvesting bid-ask spread"
        >
          <Wind className="w-3.5 h-3.5 text-indigo-400" /> Calm Two-Way
        </button>
      </div>
    </div>
  );
};
