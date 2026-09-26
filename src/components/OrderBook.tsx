import React from "react";
import type { OrderBook as OrderBookType, TickerInfo } from "../types/market";
import { Shield, Sparkles, ArrowDown, ArrowUp } from "lucide-react";

interface OrderBookProps {
  book: OrderBookType;
  ticker: TickerInfo;
  onSelectPrice: (price: number, side: "BUY" | "SELL") => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  book,
  ticker,
  onSelectPrice,
}) => {
  const { bids, asks, spread, spreadBps, midPrice, microPrice, imbalance } =
    book;

  // Imbalance percentage: [-1, +1] mapped to [0%, 100%]
  const buyerPercent = Math.round(((imbalance + 1) / 2) * 100);
  const sellerPercent = 100 - buyerPercent;

  const totalBidQty = bids.reduce((acc, b) => acc + b.totalSize, 0);
  const totalAskQty = asks.reduce((acc, a) => acc + a.totalSize, 0);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Level 2 Order Book (LOB)
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Depth: 10 Levels | Tick: {ticker.currency}
          {ticker.tickSize.toFixed(2)}
        </span>
      </div>

      {/* Book Imbalance Pressure Gauge */}
      <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80">
        <div className="flex justify-between items-center text-[10px] font-mono mb-1">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ArrowUp className="w-3 h-3" /> Buyers {buyerPercent}% (
            {totalBidQty.toLocaleString()})
          </span>
          <span className="text-slate-400 font-semibold">Book Imbalance</span>
          <span className="text-rose-400 font-bold flex items-center gap-1">
            Sellers {sellerPercent}% ({totalAskQty.toLocaleString()}){" "}
            <ArrowDown className="w-3 h-3" />
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${buyerPercent}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${sellerPercent}%` }}
          />
        </div>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-2 text-[10px] uppercase font-semibold text-slate-400 bg-slate-950/90 border-b border-slate-800/80 px-2 py-1.5">
        <div className="grid grid-cols-3 text-left">
          <span>Orders</span>
          <span className="text-right">Size</span>
          <span className="text-right text-emerald-400">Bid (₹)</span>
        </div>
        <div className="grid grid-cols-3 text-right">
          <span className="text-left text-rose-400">Ask (₹)</span>
          <span>Size</span>
          <span>Orders</span>
        </div>
      </div>

      {/* Book Depth Grid (Side-by-side 10 levels) */}
      <div className="flex-1 overflow-y-auto font-mono text-xs select-none">
        <div className="grid grid-cols-2 divide-x divide-slate-800/60 h-full">
          {/* BIDS COLUMN */}
          <div className="flex flex-col divide-y divide-slate-800/20">
            {bids.map((b, idx) => {
              const isBest = idx === 0;
              return (
                <div
                  key={`bid-${b.price}`}
                  onClick={() => onSelectPrice(b.price, "BUY")}
                  className={`relative grid grid-cols-3 items-center px-2 py-1 cursor-pointer transition-colors hover:bg-emerald-950/40 ${
                    b.hasUserOrder ? "bg-emerald-950/30" : ""
                  }`}
                >
                  {/* Depth Bar Background */}
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-emerald-500/10 pointer-events-none transition-all duration-150"
                    style={{ width: `${Math.min(100, b.depthPercent)}%` }}
                  />

                  {/* Order Count / User Quote Marker */}
                  <div className="relative z-10 flex items-center gap-1 text-[11px] text-slate-400">
                    <span>{b.orderCount}</span>
                    {b.hasUserOrder && (
                      <span className="px-1 py-0.2 bg-emerald-500 text-slate-950 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> MY MM
                      </span>
                    )}
                  </div>

                  {/* Size */}
                  <div className="relative z-10 text-right text-slate-200 tabular-nums">
                    {b.totalSize}
                  </div>

                  {/* Price */}
                  <div
                    className={`relative z-10 text-right font-bold tabular-nums ${
                      isBest ? "text-emerald-400" : "text-emerald-500/90"
                    }`}
                  >
                    {b.price.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ASKS COLUMN */}
          <div className="flex flex-col divide-y divide-slate-800/20">
            {asks.map((a, idx) => {
              const isBest = idx === 0;
              return (
                <div
                  key={`ask-${a.price}`}
                  onClick={() => onSelectPrice(a.price, "SELL")}
                  className={`relative grid grid-cols-3 items-center px-2 py-1 cursor-pointer transition-colors hover:bg-rose-950/40 ${
                    a.hasUserOrder ? "bg-rose-950/30" : ""
                  }`}
                >
                  {/* Depth Bar Background */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-rose-500/10 pointer-events-none transition-all duration-150"
                    style={{ width: `${Math.min(100, a.depthPercent)}%` }}
                  />

                  {/* Price */}
                  <div
                    className={`relative z-10 text-left font-bold tabular-nums ${
                      isBest ? "text-rose-400" : "text-rose-500/90"
                    }`}
                  >
                    {a.price.toFixed(2)}
                  </div>

                  {/* Size */}
                  <div className="relative z-10 text-right text-slate-200 tabular-nums">
                    {a.totalSize}
                  </div>

                  {/* Order Count / User Quote Marker */}
                  <div className="relative z-10 flex items-center justify-end gap-1 text-[11px] text-slate-400">
                    {a.hasUserOrder && (
                      <span className="px-1 py-0.2 bg-rose-500 text-white rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> MY MM
                      </span>
                    )}
                    <span>{a.orderCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center Spread Ribbon */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-slate-400 font-sans">
            Spread:
          </span>
          <span className="font-bold text-amber-400 tabular-nums">
            {ticker.currency}
            {spread.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400">
            ({Math.round(spread / ticker.tickSize)} ticks /{" "}
            {spreadBps.toFixed(1)} bps)
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div>
            <span className="text-slate-400 text-[10px] mr-1">Mid:</span>
            <span className="text-slate-100 font-bold tabular-nums">
              {midPrice.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] mr-1">Micro:</span>
            <span className="text-indigo-400 font-bold tabular-nums">
              {microPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
