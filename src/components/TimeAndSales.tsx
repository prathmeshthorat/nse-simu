import React, { useState, useMemo } from "react";
import type { Trade, TickerInfo } from "../types/market";
import {
  ListOrdered,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Download,
  Trash2,
  Layers,
} from "lucide-react";

interface TimeAndSalesProps {
  trades: Trade[];
  userTrades: Trade[];
  ticker: TickerInfo;
  onClearUserTrades?: () => void;
}

type TabType = "TAPE" | "MY_TRADES";
type FilterType = "ALL" | "BUY" | "SELL" | "MAKER" | "TAKER";

export const TimeAndSales: React.FC<TimeAndSalesProps> = ({
  trades,
  userTrades,
  ticker,
  onClearUserTrades,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("TAPE");
  const [tradeFilter, setTradeFilter] = useState<FilterType>("ALL");

  // Compute tape volume pressure (last 30 market trades)
  const recentTrades = trades.slice(0, 30);
  const buyVol = recentTrades
    .filter((t) => t.takerSide === "BUY")
    .reduce((sum, t) => sum + t.size, 0);
  const sellVol = recentTrades
    .filter((t) => t.takerSide === "SELL")
    .reduce((sum, t) => sum + t.size, 0);
  const totalRecentVol = buyVol + sellVol || 1;
  const buyPercent = Math.round((buyVol / totalRecentVol) * 100);

  // User Trades Metrics
  const userStats = useMemo(() => {
    let totalQty = 0;
    let totalNotional = 0;
    let totalRebates = 0;
    let totalFees = 0;
    let buyCount = 0;
    let sellCount = 0;
    let makerCount = 0;
    let takerCount = 0;

    userTrades.forEach((t) => {
      totalQty += t.size;
      totalNotional += t.price * t.size;
      if (t.userRole === "MAKER") {
        makerCount++;
        totalRebates += t.feeOrRebate || 0;
      } else {
        takerCount++;
        totalFees += Math.abs(t.feeOrRebate || 0);
      }
      if (t.userSide === "BUY") buyCount++;
      if (t.userSide === "SELL") sellCount++;
    });

    const netRebatesFees = totalRebates - totalFees;
    const makerRate =
      userTrades.length > 0 ? Math.round((makerCount / userTrades.length) * 100) : 0;

    return {
      count: userTrades.length,
      totalQty,
      totalNotional,
      netRebatesFees,
      makerRate,
      buyCount,
      sellCount,
      makerCount,
      takerCount,
    };
  }, [userTrades]);

  // Filtered user trades
  const filteredUserTrades = useMemo(() => {
    return userTrades.filter((t) => {
      if (tradeFilter === "BUY") return t.userSide === "BUY";
      if (tradeFilter === "SELL") return t.userSide === "SELL";
      if (tradeFilter === "MAKER") return t.userRole === "MAKER";
      if (tradeFilter === "TAKER") return t.userRole === "TAKER";
      return true;
    });
  }, [userTrades, tradeFilter]);

  // Export User Trades to CSV
  const handleExportCSV = () => {
    if (userTrades.length === 0) return;
    const headers = [
      "TradeID",
      "Timestamp",
      "Symbol",
      "Side",
      "Role",
      "Price",
      "Size",
      "NotionalValue",
      "FeeOrRebate",
    ];
    const rows = userTrades.map((t) => [
      t.id,
      new Date(t.timestamp).toISOString(),
      ticker.symbol,
      t.userSide || t.takerSide,
      t.userRole || "UNKNOWN",
      t.price.toFixed(2),
      t.size,
      (t.price * t.size).toFixed(2),
      t.feeOrRebate !== undefined ? t.feeOrRebate.toFixed(4) : "0.0000",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${ticker.symbol}_executions_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      {/* Header Tabs */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("TAPE")}
            title="Real-time public exchange tape of all participant orders"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === "TAPE"
                ? "bg-slate-800 text-emerald-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Market Tape</span>
          </button>

          <button
            onClick={() => setActiveTab("MY_TRADES")}
            title="Audit log and execution history of your market maker and manual orders"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === "MY_TRADES"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Trades</span>
            {userTrades.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
                  activeTab === "MY_TRADES"
                    ? "bg-amber-400 text-slate-950"
                    : "bg-amber-500/30 text-amber-300"
                }`}
              >
                {userTrades.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {activeTab === "MY_TRADES" && userTrades.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                title="Export your execution history to CSV file"
                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 rounded transition-colors flex items-center gap-1 text-[11px] font-mono"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              {onClearUserTrades && (
                <button
                  onClick={onClearUserTrades}
                  title="Clear personal trade history audit log"
                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
          {activeTab === "TAPE" && (
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Flow
            </span>
          )}
        </div>
      </div>

      {/* VIEW 1: MARKET TAPE */}
      {activeTab === "TAPE" && (
        <>
          {/* Tape Volume Pressure */}
          <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
            <span
              className="text-emerald-400 font-semibold flex items-center gap-0.5"
              title="Percentage of volume driven by aggressive taker buys"
            >
              <ArrowUpRight className="w-3 h-3" />
              Taker Buy: {buyPercent}%
            </span>
            <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${buyPercent}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${100 - buyPercent}%` }}
              />
            </div>
            <span
              className="text-rose-400 font-semibold flex items-center gap-0.5"
              title="Percentage of volume driven by aggressive taker sells"
            >
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
              <div className="p-8 text-center text-xs text-slate-500">
                Awaiting market flow...
              </div>
            ) : (
              trades.slice(0, 60).map((t) => {
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
                        <span
                          title={`Your fill: ${t.userSide} as ${t.userRole}`}
                          className="px-1 py-0.2 bg-amber-500 text-slate-950 rounded text-[9px] font-black uppercase tracking-tight flex items-center gap-0.5 cursor-pointer"
                        >
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
        </>
      )}

      {/* VIEW 2: MY TRADES (EXECUTION HISTORY) */}
      {activeTab === "MY_TRADES" && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Summary Metric Ribbon */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div
              className="bg-slate-900/80 px-1 py-1 rounded border border-slate-800/60"
              title="Total number of user order executions recorded"
            >
              <div className="text-[9px] text-slate-400 uppercase">Fills</div>
              <div className="font-bold text-slate-100 tabular-nums">
                {userStats.count}
              </div>
            </div>

            <div
              className="bg-slate-900/80 px-1 py-1 rounded border border-slate-800/60"
              title="Total shares / contracts filled across all executions"
            >
              <div className="text-[9px] text-slate-400 uppercase">Volume</div>
              <div className="font-bold text-slate-200 tabular-nums">
                {userStats.totalQty}
              </div>
            </div>

            <div
              className="bg-slate-900/80 px-1 py-1 rounded border border-slate-800/60"
              title="Net Maker liquidity rebates earned minus Taker execution fees paid"
            >
              <div className="text-[9px] text-slate-400 uppercase">Net Rebate</div>
              <div
                className={`font-bold tabular-nums ${
                  userStats.netRebatesFees >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {userStats.netRebatesFees >= 0 ? "+" : ""}
                {ticker.currency}
                {userStats.netRebatesFees.toFixed(2)}
              </div>
            </div>

            <div
              className="bg-slate-900/80 px-1 py-1 rounded border border-slate-800/60"
              title="Maker order ratio: Percentage of executions filled as passive liquidity provider (Maker)"
            >
              <div className="text-[9px] text-slate-400 uppercase">Maker %</div>
              <div className="font-bold text-amber-300 tabular-nums">
                {userStats.makerRate}%
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-1.5 bg-slate-950/30 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
            <button
              onClick={() => setTradeFilter("ALL")}
              title="Show all executions"
              className={`px-2 py-0.5 rounded transition-colors ${
                tradeFilter === "ALL"
                  ? "bg-slate-800 text-slate-100 font-bold border border-slate-700"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              All ({userStats.count})
            </button>
            <button
              onClick={() => setTradeFilter("BUY")}
              title="Show only BUY executions"
              className={`px-2 py-0.5 rounded transition-colors ${
                tradeFilter === "BUY"
                  ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30"
                  : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40"
              }`}
            >
              Buys ({userStats.buyCount})
            </button>
            <button
              onClick={() => setTradeFilter("SELL")}
              title="Show only SELL executions"
              className={`px-2 py-0.5 rounded transition-colors ${
                tradeFilter === "SELL"
                  ? "bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30"
                  : "text-slate-400 hover:text-rose-400 hover:bg-slate-800/40"
              }`}
            >
              Sells ({userStats.sellCount})
            </button>
            <button
              onClick={() => setTradeFilter("MAKER")}
              title="Show passive liquidity fills (Maker rebate +0.005%)"
              className={`px-2 py-0.5 rounded transition-colors ${
                tradeFilter === "MAKER"
                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                  : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/40"
              }`}
            >
              Makers ({userStats.makerCount})
            </button>
            <button
              onClick={() => setTradeFilter("TAKER")}
              title="Show aggressive market fills (Taker fee 0.015%)"
              className={`px-2 py-0.5 rounded transition-colors ${
                tradeFilter === "TAKER"
                  ? "bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30"
                  : "text-slate-400 hover:text-blue-300 hover:bg-slate-800/40"
              }`}
            >
              Takers ({userStats.takerCount})
            </button>
          </div>

          {/* Table Column Headers */}
          <div className="grid grid-cols-6 text-[10px] uppercase font-semibold text-slate-400 bg-slate-950/90 border-b border-slate-800/80 px-3 py-1.5">
            <span>Time</span>
            <span>Side</span>
            <span>Role</span>
            <span className="text-right">Price</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Fee/Rebate</span>
          </div>

          {/* User Trades Log List */}
          <div className="flex-1 overflow-y-auto font-mono text-xs select-none divide-y divide-slate-800/30">
            {filteredUserTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500">
                <Layers className="w-8 h-8 mb-2 text-slate-600" />
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  {userTrades.length === 0
                    ? "No Trade Executions Yet"
                    : "No Trades Match Filter"}
                </div>
                <div className="text-[11px] max-w-[240px] text-slate-500 leading-relaxed">
                  {userTrades.length === 0
                    ? "Activate Auto-Quoting or place manual orders from the terminal to see your executions recorded here."
                    : "Switch filter above to view all executions."}
                </div>
              </div>
            ) : (
              filteredUserTrades.map((t) => {
                const isBuy = (t.userSide || t.takerSide) === "BUY";
                const isMaker = t.userRole === "MAKER";
                const date = new Date(t.timestamp);
                const timeStr = `${date.toTimeString().split(" ")[0]}.${Math.floor(
                  date.getMilliseconds() / 100,
                )}`;
                const notional = t.price * t.size;
                const feeRebate = t.feeOrRebate ?? 0;

                return (
                  <div
                    key={t.id}
                    title={`Trade ID: ${t.id} | Notional Value: ${ticker.currency}${notional.toFixed(2)}`}
                    className="grid grid-cols-6 items-center px-3 py-1.5 hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Time */}
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {timeStr}
                    </span>

                    {/* Side Badge */}
                    <div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-tight ${
                          isBuy
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {t.userSide || (isBuy ? "BUY" : "SELL")}
                      </span>
                    </div>

                    {/* Role Badge */}
                    <div>
                      <span
                        className={`inline-block px-1 py-0.2 rounded text-[9px] font-bold uppercase tracking-tight ${
                          isMaker
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {isMaker ? "MAKER" : "TAKER"}
                      </span>
                    </div>

                    {/* Price */}
                    <span
                      className={`text-right font-bold tabular-nums ${
                        isBuy ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {ticker.currency}
                      {t.price.toFixed(2)}
                    </span>

                    {/* Qty */}
                    <span className="text-right text-slate-200 tabular-nums">
                      {t.size}
                    </span>

                    {/* Fee / Rebate */}
                    <span
                      className={`text-right text-[10px] font-bold tabular-nums ${
                        feeRebate >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                      title={
                        feeRebate >= 0
                          ? `Liquidity Provider Rebate (+₹${feeRebate.toFixed(4)})`
                          : `Liquidity Taker Fee (-₹${Math.abs(feeRebate).toFixed(4)})`
                      }
                    >
                      {feeRebate >= 0 ? "+" : ""}
                      {ticker.currency}
                      {feeRebate.toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
