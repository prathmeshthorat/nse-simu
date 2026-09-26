import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Gauge,
  Volume2,
  VolumeX,
  BarChart3,
} from "lucide-react";
import type { TickerInfo } from "../types/market";
import { NSE_TICKERS } from "../simulation/marketEngine";

interface HeaderProps {
  currentTicker: TickerInfo;
  onSelectTicker: (ticker: TickerInfo) => void;
  lastPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  isRunning: boolean;
  onTogglePlay: () => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  onReset: () => void;
  onOpenGuide: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenAnalytics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTicker,
  onSelectTicker,
  lastPrice,
  change,
  changePercent,
  high,
  low,
  volume,
  isRunning,
  onTogglePlay,
  speed,
  onChangeSpeed,
  onReset,
  onOpenGuide,
  isMuted,
  onToggleMute,
  onOpenAnalytics,
}) => {
  const isPositive = change >= 0;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 select-none shadow-lg">
      {/* Brand & Market Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center font-bold text-white shadow-md shadow-orange-500/20">
            NSE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wider text-slate-100">
                MARKET MAKER DESK
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SIM LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Order Flow & Avellaneda-Stoikov Microstructure
            </p>
          </div>
        </div>

        {/* Ticker Selector */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 ml-2">
          {Object.values(NSE_TICKERS).map((t) => (
            <button
              key={t.symbol}
              onClick={() => onSelectTicker(t)}
              title={`Switch symbol to ${t.symbol} (${t.name}) — Base Price: ${t.currency}${t.initialPrice.toFixed(2)}, Lot: ${t.lotSize}`}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                currentTicker.symbol === t.symbol
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {t.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Ticker Metrics */}
      <div className="flex items-center gap-6 bg-slate-950/60 px-4 py-1.5 rounded-lg border border-slate-800/80">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            LTP (Last Price)
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-mono font-black tabular-nums transition-colors duration-300 ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {currentTicker.currency}
              {lastPrice.toFixed(2)}
            </span>
            <span
              className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {isPositive ? "+" : ""}
              {change.toFixed(2)} ({isPositive ? "+" : ""}
              {changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-mono border-l border-slate-800 pl-4">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">
              24h High
            </span>
            <span className="text-slate-200 font-medium tabular-nums">
              {currentTicker.currency}
              {high.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">
              24h Low
            </span>
            <span className="text-slate-200 font-medium tabular-nums">
              {currentTicker.currency}
              {low.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">
              Volume
            </span>
            <span className="text-slate-200 font-medium tabular-nums">
              {volume.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">
              Lot Size
            </span>
            <span className="text-amber-400 font-medium tabular-nums">
              {currentTicker.lotSize}
            </span>
          </div>
        </div>
      </div>

      {/* Simulation Controls & Guide */}
      <div className="flex items-center gap-3">
        {/* Speed Toggles */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 text-xs font-mono">
          <span className="text-[10px] text-slate-400 px-2 flex items-center gap-1 font-sans">
            <Gauge className="w-3 h-3" />
            Speed:
          </span>
          {[0.5, 1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              title={`Set simulation speed to ${s}x rate`}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                speed === s
                  ? "bg-indigo-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          title={
            isRunning
              ? "Pause the real-time simulation"
              : "Resume the real-time simulation"
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
            isRunning
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20"
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" /> Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> Resume
            </>
          )}
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          title="Reset simulation, cash, inventory, and order book to initial state"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Sound FX Toggle */}
        <button
          onClick={onToggleMute}
          title={
            isMuted
              ? "Unmute trading audio chimes and execution sound FX"
              : "Mute trading audio chimes and sound FX"
          }
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isMuted
              ? "bg-slate-800 text-slate-500 border-slate-700/60 hover:text-slate-300"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
          }`}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Analytics Scorecard & CSV Exporter */}
        <button
          onClick={onOpenAnalytics}
          title="Open Quantitative Scorecard, Sharpe ratio, and export CSV execution logs"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline">Scorecard</span>
        </button>

        {/* Guide / Tutorial button */}
        <button
          onClick={onOpenGuide}
          title="Open educational guide explaining Market Making, the spread, and Avellaneda-Stoikov skew"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-xs text-amber-400 font-medium transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">How MM Works</span>
        </button>
      </div>
    </header>
  );
};
