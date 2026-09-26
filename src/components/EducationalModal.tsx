import React from "react";
import {
  X,
  BookOpen,
  CheckCircle,
  ShieldAlert,
  Cpu,
  Award,
} from "lucide-react";

interface EducationalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                How Market Making Works in Modern Exchanges
              </h3>
              <p className="text-xs text-slate-400">
                Microstructure, The Spread, & The Avellaneda-Stoikov Model
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {/* Section 1: The Core Idea */}
          <div className="space-y-2">
            <h4 className="text-amber-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
              <Award className="w-4 h-4" /> 1. The Market Maker's Business Model
            </h4>
            <p className="leading-relaxed text-slate-300 text-xs sm:text-sm">
              In any stock exchange like the NSE, traders who want to trade
              immediately submit{" "}
              <strong className="text-white">Market Orders</strong> (Takers).
              They cross the spread to execute. As a{" "}
              <strong className="text-white">Market Maker (Maker)</strong>, you
              do the opposite: you post{" "}
              <strong className="text-emerald-400">Limit Bids</strong> below the
              mid-price and{" "}
              <strong className="text-rose-400">Limit Asks</strong> above it.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs flex justify-around items-center">
              <div className="text-emerald-400 font-bold">
                You Buy at Bid: ₹2,980.00
              </div>
              <div className="text-amber-400 font-extrabold text-sm">
                ➔ SPREAD: +₹0.20 ➔
              </div>
              <div className="text-rose-400 font-bold">
                You Sell at Ask: ₹2,980.20
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Every round trip (buy + sell) nets you the spread without needing
              the stock to rise or fall!
            </p>
          </div>

          {/* Section 2: The Two Big Risks */}
          <div className="space-y-3">
            <h4 className="text-rose-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4" /> 2. Why Isn't It Free Money?
              The 2 Major Risks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs block text-amber-300">
                  ⚠️ Inventory Risk
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If more people sell to your bid than buy from your ask, you
                  accumulate a large long position. If the stock price crashes,
                  your inventory loss exceeds the spread you earned!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs block text-rose-300">
                  ⚡ Adverse Selection (Toxic Flow)
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Institutional "Whales" have information or large block orders.
                  When they sweep the book, they fill your quotes right before
                  the price blows through them.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: The Avellaneda-Stoikov Formula */}
          <div className="space-y-2">
            <h4 className="text-indigo-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
              <Cpu className="w-4 h-4" /> 3. The Quantitative Solution:
              Avellaneda-Stoikov Skew
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              To defend against inventory risk, high-frequency algorithms
              compute an{" "}
              <strong className="text-white">
                Indifference (Reservation) Price
              </strong>
              :
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-center text-amber-300">
              Reservation Price = MidPrice - (Inventory × SkewFactor × TickSize)
            </div>
            <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-emerald-400">
                  When Long (q &gt; 0):
                </strong>{" "}
                The algorithm lowers both bid and ask. A lower bid deters more
                sellers; a lower ask attracts buyers to take your inventory off
                your hands.
              </li>
              <li>
                <strong className="text-rose-400">
                  When Short (q &lt; 0):
                </strong>{" "}
                The algorithm raises quotes to buy back stock and cover the
                short.
              </li>
            </ul>
          </div>

          {/* Section 4: What to observe in this simulator */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
            <h5 className="font-bold text-emerald-400 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> What to test in this
              simulation:
            </h5>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              <li>
                Watch the stock price ticking in the{" "}
                <strong className="text-white">Candlestick Chart</strong>.
              </li>
              <li>
                Look for the <strong className="text-emerald-400">MY MM</strong>{" "}
                badges in the Level-2 Order Book.
              </li>
              <li>
                Notice your{" "}
                <strong className="text-amber-400">Spread Captured</strong>{" "}
                climb on every fill.
              </li>
              <li>
                Click <strong className="text-white">"Whale Buy Sweep"</strong>{" "}
                or <strong className="text-white">"Flash Crash"</strong> in the
                bottom bar to see how inventory skew and auto-hedging respond to
                market volatility!
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20"
          >
            Start Trading Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
