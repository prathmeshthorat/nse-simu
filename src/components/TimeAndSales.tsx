import React from "react";
import type { Trade, TickerInfo } from "../types/market";
import { ListOrdered, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TimeAndSalesProps {
  trades: Trade[];
  ticker: TickerInfo;
}

export const TimeAndSales: React.FC<TimeAndSalesProps> = ({
  trades,
  ticker,
}) => {
  // Compute recent buy vs sell volume
  const recentTrades = trades.slice(0, 30);
  const buyVol = recentTrades
    .filter((t) => t.takerSide === "BUY")
    .reduce((sum, t) => sum + t.size, 0);
  const sellVol = recentTrades
    .filter((t) => t.takerSide === "SELL")
    .reduce((sum, t) => sum + t.size, 0);
  const totalRecentVol = buyVol + sellVol || 1;
  const buyPercent = Math.round((buyVol / totalRecentVol) * 100);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Time & Sales (Tape)
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Real-time Stream
        </span>
      </div>

      {/* Tape Volume Pressure */}
      <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
          <ArrowUpRight className="w-3 h-3" />
          Taker Buy: {buyPercent}%
        </span>
        <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${buyPercent}%` }}
          />
          <div
            className="h-full bg-rose-500"
            style={{ width: `${100 - buyPercent}%` }}
          />
        </div>
        <span className="text-rose-400 font-semibold flex items-center gap-0.5">
          Taker Sell: {100 - buyPercent}%
          <ArrowDownRight className="w-3 h-3" />
        </span>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-4 text-[10px] uppercase font-semibold text-slate-400 bg-slate-950/90 border-b border-slate-800/80 px-3 py-1.5">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Side / Role</span>
      </div>

      {/* Trades Stream */}
      <div className="flex-1 overflow-y-auto font-mono text-xs select-none divide-y divide-slate-800/30">
        {trades.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Awaiting market flow...
          </div>
        ) : (
          trades.slice(0, 50).map((t) => {
            const isBuy = t.takerSide === "BUY";
            const date = new Date(t.timestamp);
            const timeStr = `${date.toTimeString().split(" ")[0]}.${Math.floor(
              date.getMilliseconds() / 100,
            )}`;

            return (
              <div
                key={t.id}
                className={`grid grid-cols-4 items-center px-3 py-1 transition-colors ${
                  t.isUserTrade
                    ? "bg-amber-500/15 border-l-2 border-amber-400"
                    : "hover:bg-slate-800/40"
                }`}
              >
                {/* Time */}
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {timeStr}
                </span>

                {/* Price */}
                <span
                  className={`text-right font-bold tabular-nums ${
                    isBuy ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {ticker.currency}
                  {t.price.toFixed(2)}
                </span>

                {/* Size */}
                <span className="text-right text-slate-200 tabular-nums">
                  {t.size}
                </span>

                {/* Side & User Fill Badge */}
                <div className="text-right flex items-center justify-end gap-1">
                  {t.isUserTrade ? (
                    <span className="px-1 py-0.2 bg-amber-500 text-slate-950 rounded text-[9px] font-black uppercase tracking-tight flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 fill-current" /> YOU{" "}
                      {t.userSide}
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold ${
                        isBuy ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {t.takerSide}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
