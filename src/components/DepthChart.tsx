import React, { useRef, useEffect } from "react";
import type { OrderBook, TickerInfo } from "../types/market";

interface DepthChartProps {
  book: OrderBook;
  ticker: TickerInfo;
}

export const DepthChart: React.FC<DepthChartProps> = ({ book, ticker }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 20, right: 20, bottom: 30, left: 55 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    if (book.bids.length === 0 || book.asks.length === 0) return;

    // Prepare sorted bid points (from lowest price to best bid)
    const bidPoints = [...book.bids].reverse().map((b) => ({
      price: b.price,
      cumSize: b.cumulativeSize,
    }));

    // Prepare sorted ask points (from best ask to highest price)
    const askPoints = book.asks.map((a) => ({
      price: a.price,
      cumSize: a.cumulativeSize,
    }));

    const minPrice = bidPoints[0]?.price || book.midPrice - 1;
    const maxPrice =
      askPoints[askPoints.length - 1]?.price || book.midPrice + 1;
    const maxCumSize = Math.max(
      bidPoints[0]?.cumSize || 1,
      askPoints[askPoints.length - 1]?.cumSize || 1,
      10,
    );

    const priceRange = maxPrice - minPrice || 1;
    const getX = (price: number) =>
      margin.left + ((price - minPrice) / priceRange) * chartW;
    const getY = (size: number) =>
      margin.top + chartH - (size / maxCumSize) * chartH;

    // Grid lines
    ctx.strokeStyle = "rgba(30, 41, 59, 0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    for (let i = 0; i <= 4; i++) {
      const sizeVal = (maxCumSize * i) / 4;
      const y = getY(sizeVal);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(sizeVal).toString(), margin.left - 6, y + 3);
    }
    ctx.setLineDash([]);

    // 1. Draw Bid Cumulative Area (Green Mountain)
    ctx.beginPath();
    const firstBidX = getX(bidPoints[0].price);
    const bottomY = margin.top + chartH;

    ctx.moveTo(firstBidX, bottomY);
    bidPoints.forEach((pt) => {
      ctx.lineTo(getX(pt.price), getY(pt.cumSize));
    });

    const bestBidX = getX(book.bestBid);
    ctx.lineTo(bestBidX, bottomY);
    ctx.closePath();

    const bidGrad = ctx.createLinearGradient(0, margin.top, 0, bottomY);
    bidGrad.addColorStop(0, "rgba(34, 197, 94, 0.45)");
    bidGrad.addColorStop(1, "rgba(34, 197, 94, 0.05)");
    ctx.fillStyle = bidGrad;
    ctx.fill();

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Draw Ask Cumulative Area (Red Mountain)
    ctx.beginPath();
    const bestAskX = getX(book.bestAsk);
    ctx.moveTo(bestAskX, bottomY);

    askPoints.forEach((pt) => {
      ctx.lineTo(getX(pt.price), getY(pt.cumSize));
    });

    const lastAskX = getX(askPoints[askPoints.length - 1].price);
    ctx.lineTo(lastAskX, bottomY);
    ctx.closePath();

    const askGrad = ctx.createLinearGradient(0, margin.top, 0, bottomY);
    askGrad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
    askGrad.addColorStop(1, "rgba(239, 68, 68, 0.05)");
    ctx.fillStyle = askGrad;
    ctx.fill();

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mid Price Marker
    const midX = getX(book.midPrice);
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(midX, margin.top);
    ctx.lineTo(midX, bottomY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price Labels on Bottom Axis
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";

    const numLabels = 5;
    for (let i = 0; i <= numLabels; i++) {
      const p = minPrice + (priceRange * i) / numLabels;
      const x = getX(p);
      ctx.fillText(`${ticker.currency}${p.toFixed(2)}`, x, bottomY + 16);
    }
  }, [book, ticker]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 overflow-hidden">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-3 text-[11px] font-mono bg-slate-950/70 px-2.5 py-1 rounded-md border border-slate-800">
        <span className="flex items-center gap-1 text-emerald-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Bids Wall
        </span>
        <span className="flex items-center gap-1 text-rose-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-400" /> Asks Wall
        </span>
        <span className="text-amber-400">
          Mid: {ticker.currency}
          {book.midPrice.toFixed(2)}
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
