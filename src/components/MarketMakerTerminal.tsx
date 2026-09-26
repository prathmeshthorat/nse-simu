import React, { useState } from "react";
import type {
  MarketMakerConfig,
  MarketMakerStats,
  TickerInfo,
  OrderSide,
} from "../types/market";
import {
  Cpu,
  Sliders,
  DollarSign,
  ShieldAlert,
  Zap,
  TrendingUp,
  Layers,
  Flame,
} from "lucide-react";

interface MarketMakerTerminalProps {
  config: MarketMakerConfig;
  stats: MarketMakerStats;
  ticker: TickerInfo;
  midPrice: number;
  onUpdateConfig: (newConfig: Partial<MarketMakerConfig>) => void;
  onPlaceManualOrder: (
    side: OrderSide,
    type: "LIMIT" | "MARKET",
    price: number,
    size: number,
  ) => void;
  onFlattenPosition: () => void;
  selectedPrice?: { price: number; side: OrderSide } | null;
}

export const MarketMakerTerminal: React.FC<MarketMakerTerminalProps> = ({
  config,
  stats,
  ticker,
  midPrice,
  onUpdateConfig,
  onPlaceManualOrder,
  onFlattenPosition,
  selectedPrice,
}) => {
  // Manual order inputs
  const [manualPrice, setManualPrice] = useState<number>(ticker.initialPrice);
  const [manualSize, setManualSize] = useState<number>(ticker.lotSize);
  const [manualSide, setManualSide] = useState<OrderSide>("BUY");

  // React to selected price from OrderBook click
  React.useEffect(() => {
    if (selectedPrice) {
      setManualPrice(selectedPrice.price);
      setManualSide(selectedPrice.side);
    }
  }, [selectedPrice]);

  const isLong = stats.inventory > 0;
  const isShort = stats.inventory < 0;
  const isPnlPositive = stats.totalPnL >= 0;

  // Reservation price calculation
  const skewTicks = Math.round(
    (stats.inventory * config.inventorySkewFactor) / ticker.lotSize,
  );
  const reservationPrice = midPrice - skewTicks * ticker.tickSize;

  // Mini equity curve SVG path
  const pnlPoints = stats.pnlHistory.slice(-40);
  const minPnl = Math.min(...pnlPoints.map((p) => p.pnl), -10);
  const maxPnl = Math.max(...pnlPoints.map((p) => p.pnl), 10);
  const pnlRange = maxPnl - minPnl || 1;

  const svgWidth = 280;
  const svgHeight = 45;
  const svgPath = pnlPoints
    .map((pt, idx) => {
      const x = (idx / (pnlPoints.length - 1 || 1)) * svgWidth;
      const y = svgHeight - ((pt.pnl - minPnl) / pnlRange) * svgHeight;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const handleManualSubmit = (type: "LIMIT" | "MARKET") => {
    onPlaceManualOrder(manualSide, type, manualPrice, manualSize);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      {/* Panel Header */}
      <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Market Maker Strategy Engine
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
            <input
              type="checkbox"
              checked={config.autoQuoting}
              onChange={(e) =>
                onUpdateConfig({ autoQuoting: e.target.checked })
              }
              className="w-3.5 h-3.5 text-amber-500 rounded bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
            />
            <span
              className={
                config.autoQuoting
                  ? "text-amber-400 font-bold"
                  : "text-slate-400"
              }
            >
              {config.autoQuoting ? "AUTO QUOTING ACTIVE" : "AUTO QUOTING OFF"}
            </span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* PnL & Performance Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Total PnL Card */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-medium">
              Total PnL
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-lg font-mono font-black tabular-nums ${
                  isPnlPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isPnlPositive ? "+" : ""}₹{stats.totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
              <span>
                Realized: {stats.realizedPnL >= 0 ? "+" : ""}₹
                {stats.realizedPnL.toFixed(0)}
              </span>
              <span>
                Unreal: {stats.unrealizedPnL >= 0 ? "+" : ""}₹
                {stats.unrealizedPnL.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Spread Captured */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              Spread Captured
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-black text-amber-300 tabular-nums">
                +₹{stats.spreadCaptured.toFixed(2)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1">
              Edge harvested from bid/ask
            </span>
          </div>

          {/* Current Inventory Position */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              Inventory Position (q)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-lg font-mono font-black tabular-nums ${
                  isLong
                    ? "text-emerald-400"
                    : isShort
                      ? "text-rose-400"
                      : "text-slate-300"
                }`}
              >
                {stats.inventory > 0 ? `+${stats.inventory}` : stats.inventory}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {isLong ? "LONG" : isShort ? "SHORT" : "FLAT"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1">
              Avg Cost:{" "}
              {stats.avgCost > 0 ? `₹${stats.avgCost.toFixed(2)}` : "N/A"}
            </span>
          </div>

          {/* Fills & Volume */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-medium">
              MM Fills & Volume
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-black text-slate-200 tabular-nums">
                {stats.userFillsCount}
              </span>
              <span className="text-[11px] text-slate-400">fills</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1">
              Vol: {stats.volumeTraded.toLocaleString()} shares
            </span>
          </div>
        </div>

        {/* Inventory Risk Gauge & Skew Indicator */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Inventory Risk & Avellaneda-Stoikov Skew
            </span>
            <div className="font-mono text-[11px] text-slate-400">
              Limit: ±{config.maxInventory} shares | Hedge at: ±
              {config.hedgeThreshold}
            </div>
          </div>

          {/* Gauge Bar */}
          <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            {/* Center Line (0 inventory) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-500 z-10" />

            {/* Inventory fill */}
            {stats.inventory > 0 ? (
              <div
                className="absolute top-0 bottom-0 left-1/2 bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${Math.min(50, (stats.inventory / config.maxInventory) * 50)}%`,
                }}
              />
            ) : stats.inventory < 0 ? (
              <div
                className="absolute top-0 bottom-0 bg-rose-500 transition-all duration-200"
                style={{
                  left: `${50 - Math.min(50, (Math.abs(stats.inventory) / config.maxInventory) * 50)}%`,
                  width: `${Math.min(50, (Math.abs(stats.inventory) / config.maxInventory) * 50)}%`,
                }}
              />
            ) : null}
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span className="text-rose-400 font-semibold">-Max Short</span>
            <span className="text-slate-300">
              Reservation Price:{" "}
              <strong className="text-amber-400">
                ₹{reservationPrice.toFixed(2)}
              </strong>{" "}
              (
              {skewTicks !== 0
                ? `${skewTicks > 0 ? "-" : "+"}${Math.abs(skewTicks)} ticks skew`
                : "Unskewed"}
              )
            </span>
            <span className="text-emerald-400 font-semibold">+Max Long</span>
          </div>
        </div>

        {/* Real-time MM Equity Curve */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Cumulative PnL Equity Curve
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Last 40s
            </span>
          </div>
          <div className="w-full h-12 flex items-center justify-center">
            {pnlPoints.length > 1 ? (
              <svg
                className="w-full h-full"
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              >
                <path
                  d={svgPath}
                  fill="none"
                  stroke={isPnlPositive ? "#10b981" : "#f43f5e"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <span className="text-[10px] text-slate-500">
                Accumulating trading data...
              </span>
            )}
          </div>
        </div>

        {/* Algorithm Configuration Sliders */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Algorithm Parameters
            </span>
            <button
              onClick={onFlattenPosition}
              className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
            >
              <Flame className="w-3 h-3 text-rose-400" /> Flatten Position
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Half Spread */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Half-Spread (δ):</span>
                <span className="font-mono text-amber-400 font-bold">
                  {config.halfSpreadTicks} ticks (₹
                  {(config.halfSpreadTicks * ticker.tickSize).toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={config.halfSpreadTicks}
                onChange={(e) =>
                  onUpdateConfig({ halfSpreadTicks: parseInt(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[9px] text-slate-500 block">
                Narrower = more fills & higher adverse selection risk; Wider =
                safer spread
              </span>
            </div>

            {/* Inventory Skew Sensitivity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Inventory Skew (γ):</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {config.inventorySkewFactor.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={config.inventorySkewFactor}
                onChange={(e) =>
                  onUpdateConfig({
                    inventorySkewFactor: parseFloat(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[9px] text-slate-500 block">
                How urgently reservation price moves to offload accumulated
                inventory
              </span>
            </div>

            {/* Quote Size */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Quote Size per Side:</span>
                <span className="font-mono text-slate-200 font-bold">
                  {config.quoteSize} shares
                </span>
              </div>
              <input
                type="range"
                min={ticker.lotSize}
                max={ticker.lotSize * 6}
                step={ticker.lotSize}
                value={config.quoteSize}
                onChange={(e) =>
                  onUpdateConfig({ quoteSize: parseInt(e.target.value) })
                }
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Auto Hedge Toggle */}
            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-slate-300">
                  Auto-Hedge Limit
                </span>
                <span className="text-[9px] text-slate-500">
                  Market sweep if inv &gt; threshold
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoHedge}
                  onChange={(e) =>
                    onUpdateConfig({ autoHedge: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Manual Order Entry Ticket */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Manual Order Placement (User Discretionary)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Click any price in Order Book to fill price
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">
                Side
              </span>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setManualSide("BUY")}
                  className={`py-1 rounded text-xs font-bold transition-colors ${
                    manualSide === "BUY"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setManualSide("SELL")}
                  className={`py-1 rounded text-xs font-bold transition-colors ${
                    manualSide === "SELL"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">
                Price (₹)
              </span>
              <input
                type="number"
                step={ticker.tickSize}
                value={manualPrice}
                onChange={(e) =>
                  setManualPrice(parseFloat(e.target.value) || 0)
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">
                Qty (Shares)
              </span>
              <input
                type="number"
                step={ticker.lotSize}
                min={ticker.lotSize}
                value={manualSize}
                onChange={(e) =>
                  setManualSize(parseInt(e.target.value) || ticker.lotSize)
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleManualSubmit("LIMIT")}
              className={`py-1.5 rounded text-xs font-bold transition-all ${
                manualSide === "BUY"
                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
              }`}
            >
              Post Limit {manualSide}
            </button>
            <button
              onClick={() => handleManualSubmit("MARKET")}
              className={`py-1.5 rounded text-xs font-bold text-white shadow-md transition-all ${
                manualSide === "BUY"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              Instant Market {manualSide}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
