import React from "react";
import type { MarketMakerStats, TickerInfo, Trade } from "../types/market";
import {
  X,
  Award,
  Shield,
  DollarSign,
  Download,
  Percent,
  BarChart3,
  TrendingDown,
  Scale,
} from "lucide-react";

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: MarketMakerStats;
  ticker: TickerInfo;
  trades: Trade[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  stats,
  ticker,
  trades,
}) => {
  if (!isOpen) return null;

  const userTrades = trades.filter((t) => t.isUserTrade);
  const makerCount = userTrades.filter((t) => t.userRole === "MAKER").length;
  const takerCount = userTrades.filter((t) => t.userRole === "TAKER").length;
  const makerRatio =
    userTrades.length > 0
      ? Math.round((makerCount / userTrades.length) * 100)
      : 0;

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = [
      "TradeID",
      "Timestamp",
      "Price",
      "Size",
      "UserSide",
      "Role",
      "FeeOrRebate",
    ];
    const rows = userTrades.map((t) => [
      t.id,
      new Date(t.timestamp).toISOString(),
      t.price.toFixed(2),
      t.size,
      t.userSide || "",
      t.userRole || "",
      t.feeOrRebate ? t.feeOrRebate.toFixed(2) : "0.00",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `nse_mm_analytics_${ticker.symbol}_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Quantitative Analytics & Strategy Scorecard
              </h3>
              <p className="text-xs text-slate-400">
                Performance Metrics, Risk Drawdowns & Exchange Rebates (
                {ticker.symbol})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close scorecard"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Sharpe Ratio */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-indigo-400" /> Sharpe Ratio
              </span>
              <div className="text-xl font-mono font-black text-indigo-400 mt-1">
                {stats.sharpeRatio.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-500">
                Annualized return / risk
              </span>
            </div>

            {/* Win Rate */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-400" /> Win Rate
              </span>
              <div className="text-xl font-mono font-black text-emerald-400 mt-1">
                {stats.winRate.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">
                {stats.profitableTrades} wins / {stats.losingTrades} losses
              </span>
            </div>

            {/* Max Drawdown */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> Max
                Drawdown
              </span>
              <div className="text-xl font-mono font-black text-rose-400 mt-1">
                -₹{stats.maxDrawdown.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-500">
                Peak PnL: ₹{stats.peakPnL.toFixed(0)}
              </span>
            </div>

            {/* Maker Fill Ratio */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Maker Ratio
              </span>
              <div className="text-xl font-mono font-black text-amber-400 mt-1">
                {makerRatio}%
              </div>
              <span className="text-[10px] text-slate-500">
                {makerCount} makers / {takerCount} takers
              </span>
            </div>
          </div>

          {/* Fee & Rebate Breakdown */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Exchange Fee & Maker Rebate Economics
            </h4>
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40">
                <span className="text-[10px] text-emerald-400 block uppercase font-sans">
                  Maker Rebates Earned (+0.005%)
                </span>
                <span className="text-base font-bold text-emerald-300">
                  +₹{stats.makerRebates.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40">
                <span className="text-[10px] text-rose-400 block uppercase font-sans">
                  Taker Fees Paid (-0.015%)
                </span>
                <span className="text-base font-bold text-rose-300">
                  -₹{stats.takerFees.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40">
                <span className="text-[10px] text-indigo-400 block uppercase font-sans">
                  Net Exchange Economics
                </span>
                <span
                  className={`text-base font-bold ${
                    stats.netRebates >= 0 ? "text-indigo-300" : "text-rose-300"
                  }`}
                >
                  {stats.netRebates >= 0 ? "+" : ""}₹
                  {stats.netRebates.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Professional high-frequency market makers often operate with
              razor-thin spread margins because exchange liquidity rebates
              provide a substantial structural revenue cushion.
            </p>
          </div>

          {/* Strategy Guide Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Strategies Available in this Terminal
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400 block">
                  1. Avellaneda-Stoikov
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Classic quantitative inventory risk model. Skews reservation
                  price away from accumulated stock.
                </p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-indigo-400 block">
                  2. Imbalance Alpha
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Uses top-of-book and level-2 volume imbalance to anticipate
                  toxic flow and tilt quotes.
                </p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-emerald-400 block">
                  3. Adaptive Volatility
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Dynamically widens bid-ask spread during high realized
                  volatility spikes to avoid adverse fills.
                </p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-cyan-400 block">
                  4. Multi-Level Grid
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Deploys tiered liquidity across 3-4 price levels with
                  increasing order sizes for maximum depth.
                </p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 col-span-1 sm:col-span-2">
                <span className="font-bold text-purple-400 block">
                  5. VWAP Mean Reversion
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Fades price deviations from intraday volume-weighted average
                  price (VWAP) to capture pullbacks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleExportCSV}
            title="Download CSV file of all user trades and execution fills"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            Export Execution Logs (.CSV)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
