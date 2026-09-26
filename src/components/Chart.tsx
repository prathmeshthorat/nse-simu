import React, { useEffect, useRef, useState } from "react";
import type { Candle, Trade, TickerInfo, OrderBook } from "../types/market";
import { BarChart2, TrendingUp, Zap, Activity } from "lucide-react";
import { DepthChart } from "./DepthChart";

interface ChartProps {
  candles: Candle[];
  currentCandle: Candle | null;
  fairValue: number;
  userBidPrice?: number;
  userAskPrice?: number;
  trades: Trade[];
  ticker: TickerInfo;
  orderBook: OrderBook;
}

export const Chart: React.FC<ChartProps> = ({
  candles,
  currentCandle,
  fairValue,
  userBidPrice,
  userAskPrice,
  trades,
  ticker,
  orderBook,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartType, setChartType] = useState<"candles" | "line" | "depth">("candles");
  const [showFairValue, setShowFairValue] = useState(true);
  const [showQuotes, setShowQuotes] = useState(true);
  const [hoverData, setHoverData] = useState<{
    candle?: Candle;
    price?: number;
    x: number;
    y: number;
  } | null>(null);

  // Combine historical candles with the live in-progress candle
  const allCandles = React.useMemo(() => {
    if (!currentCandle) return candles;
    return [...candles, currentCandle];
  }, [candles, currentCandle]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Chart margins
    const margin = { top: 25, right: 65, bottom: 40, left: 15 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const volumeHeight = chartHeight * 0.22;
    const priceHeight = chartHeight - volumeHeight - 15;

    // Clear background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    if (allCandles.length === 0) return;

    // Compute min/max price for auto-scaling
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 1;

    // Consider the last 50 candles
    const visibleCandles = allCandles.slice(-50);

    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    }

    if (fairValue > 0) {
      minPrice = Math.min(minPrice, fairValue);
      maxPrice = Math.max(maxPrice, fairValue);
    }
    if (userBidPrice) minPrice = Math.min(minPrice, userBidPrice);
    if (userAskPrice) maxPrice = Math.max(maxPrice, userAskPrice);

    // Add padding to price range
    const pricePadding = (maxPrice - minPrice) * 0.1 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;

    const getY = (price: number) => {
      return (
        margin.top +
        priceHeight -
        ((price - minPrice) / priceRange) * priceHeight
      );
    };

    // Grid lines & price labels
    const numGridLines = 6;
    ctx.strokeStyle = "rgba(30, 41, 59, 0.7)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.font = '10px "Roboto Mono", monospace';
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";

    for (let i = 0; i <= numGridLines; i++) {
      const p = minPrice + (priceRange * i) / numGridLines;
      const y = getY(p);

      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();

      // Right axis price label
      ctx.fillText(
        `${ticker.currency}${p.toFixed(2)}`,
        margin.left + chartWidth + 6,
        y + 3,
      );
    }

    // Volume baseline
    const volBaseY = margin.top + chartHeight;
    ctx.beginPath();
    ctx.moveTo(margin.left, volBaseY);
    ctx.lineTo(margin.left + chartWidth, volBaseY);
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();

    // Candle bar width
    const n = visibleCandles.length;
    const barWidth = Math.max(3, (chartWidth / n) * 0.75);
    const stepX = chartWidth / n;

    // Draw Volume Bars
    visibleCandles.forEach((c, i) => {
      const x = margin.left + i * stepX + stepX / 2;
      const vH = (c.volume / maxVolume) * volumeHeight;
      const isUp = c.close >= c.open;

      ctx.fillStyle = isUp
        ? "rgba(34, 197, 94, 0.25)"
        : "rgba(239, 68, 68, 0.25)";
      ctx.fillRect(x - barWidth / 2, volBaseY - vH, barWidth, vH);
    });

    // Draw Candlesticks or Area Line
    if (chartType === "candles") {
      visibleCandles.forEach((c, i) => {
        const x = margin.left + i * stepX + stepX / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? "#22c55e" : "#ef4444";

        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Candle body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));
        ctx.fillStyle = color;
        ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
      });
    } else {
      // Area / Line chart
      ctx.beginPath();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      visibleCandles.forEach((c, i) => {
        const x = margin.left + i * stepX + stepX / 2;
        const y = getY(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Gradient fill
      const lastX =
        margin.left + (visibleCandles.length - 1) * stepX + stepX / 2;
      const firstX = margin.left + stepX / 2;
      ctx.lineTo(lastX, margin.top + priceHeight);
      ctx.lineTo(firstX, margin.top + priceHeight);
      ctx.closePath();
      const grad = ctx.createLinearGradient(
        0,
        margin.top,
        0,
        margin.top + priceHeight,
      );
      grad.addColorStop(0, "rgba(56, 189, 248, 0.25)");
      grad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Draw VWAP line
    let cumVol = 0;
    let cumPriceVol = 0;
    ctx.beginPath();
    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    visibleCandles.forEach((c, i) => {
      const x = margin.left + i * stepX + stepX / 2;
      const typPrice = (c.high + c.low + c.close) / 3;
      const v = Math.max(c.volume, 1);
      cumVol += v;
      cumPriceVol += typPrice * v;
      const vwap = cumPriceVol / cumVol;
      const y = getY(vwap);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Fair Value line
    if (showFairValue && fairValue > 0) {
      const fvY = getY(fairValue);
      ctx.beginPath();
      ctx.strokeStyle = "#eab308"; // Amber
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 3]);
      ctx.moveTo(margin.left, fvY);
      ctx.lineTo(margin.left + chartWidth, fvY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fair value badge on axis
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(margin.left + chartWidth + 2, fvY - 9, 60, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(
        `FV ${fairValue.toFixed(2)}`,
        margin.left + chartWidth + 4,
        fvY + 4,
      );
    }

    // Draw Market Maker Quotes Lines
    if (showQuotes) {
      if (
        userBidPrice &&
        userBidPrice >= minPrice &&
        userBidPrice <= maxPrice
      ) {
        const bidY = getY(userBidPrice);
        ctx.beginPath();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.moveTo(margin.left, bidY);
        ctx.lineTo(margin.left + chartWidth, bidY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#059669";
        ctx.fillRect(margin.left + chartWidth + 2, bidY - 8, 60, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`MY BID`, margin.left + chartWidth + 4, bidY + 4);
      }

      if (
        userAskPrice &&
        userAskPrice >= minPrice &&
        userAskPrice <= maxPrice
      ) {
        const askY = getY(userAskPrice);
        ctx.beginPath();
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.moveTo(margin.left, askY);
        ctx.lineTo(margin.left + chartWidth, askY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#e11d48";
        ctx.fillRect(margin.left + chartWidth + 2, askY - 8, 60, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`MY ASK`, margin.left + chartWidth + 4, askY + 4);
      }
    }

    // Draw Recent User Trade Execution Markers
    const recentUserTrades = trades.filter((t) => t.isUserTrade).slice(0, 10);
    const lastX = margin.left + (visibleCandles.length - 1) * stepX + stepX / 2;

    recentUserTrades.forEach((t, idx) => {
      const y = getY(t.price);
      const isBuy = t.userSide === "BUY";
      const markerX = Math.max(margin.left + 20, lastX - idx * 18);

      ctx.beginPath();
      if (isBuy) {
        // Upward Green Arrow
        ctx.fillStyle = "#22c55e";
        ctx.moveTo(markerX, y - 2);
        ctx.lineTo(markerX - 5, y + 8);
        ctx.lineTo(markerX + 5, y + 8);
        ctx.closePath();
        ctx.fill();
      } else {
        // Downward Red Arrow
        ctx.fillStyle = "#ef4444";
        ctx.moveTo(markerX, y + 2);
        ctx.lineTo(markerX - 5, y - 8);
        ctx.lineTo(markerX + 5, y - 8);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Time Axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    const timeStep = Math.max(1, Math.floor(n / 5));
    for (let i = 0; i < n; i += timeStep) {
      const c = visibleCandles[i];
      const x = margin.left + i * stepX + stepX / 2;
      const d = new Date(c.time);
      const timeStr = `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
      ctx.fillText(timeStr, x, margin.top + chartHeight + 18);
    }

    // Crosshair line on hover
    if (hoverData) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverData.x, margin.top);
      ctx.lineTo(hoverData.x, margin.top + chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(margin.left, hoverData.y);
      ctx.lineTo(margin.left + chartWidth, hoverData.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    allCandles,
    fairValue,
    userBidPrice,
    userAskPrice,
    trades,
    chartType,
    showFairValue,
    showQuotes,
    hoverData,
    ticker,
  ]);

  // Handle mouse move for interactive crosshair
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverData({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  const latestCandle = allCandles[allCandles.length - 1];

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md"
    >
      {/* Chart Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700/60">
            <button
              onClick={() => setChartType("candles")}
              title="Switch chart view to Japanese Candlesticks with OHLC wicks and bodies"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                chartType === "candles"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              Candles
            </button>
            <button
              onClick={() => setChartType("line")}
              title="Switch chart view to continuous Line & gradient area chart"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                chartType === "line"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Line
            </button>
            <button
              onClick={() => setChartType("depth")}
              title="Switch to cumulative Market Depth Mountain visualization"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                chartType === "depth"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3 h-3" />
              Depth
            </button>
          </div>

          {/* Indicators Toggle (Only for candle/line view) */}
          {chartType !== 'depth' && (
            <>
              <button
                onClick={() => setShowFairValue(!showFairValue)}
                title="Toggle latent theoretical Fair Value line (dashed gold)"
                className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  showFairValue
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Fair Value
              </button>

              <button
                onClick={() => setShowQuotes(!showQuotes)}
                title="Toggle Market Maker Limit Bid (green) and Ask (red) quote bands on the chart"
                className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  showQuotes
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                MM Quotes
              </button>
            </>
          )}
        </div>

        {/* OHLC Bar */}
        {latestCandle && chartType !== 'depth' && (
          <div className="hidden lg:flex items-center gap-3 font-mono text-[11px] text-slate-300">
            <span>
              O:{" "}
              <span className="text-white font-bold">
                {latestCandle.open.toFixed(2)}
              </span>
            </span>
            <span>
              H:{" "}
              <span className="text-emerald-400 font-bold">
                {latestCandle.high.toFixed(2)}
              </span>
            </span>
            <span>
              L:{" "}
              <span className="text-rose-400 font-bold">
                {latestCandle.low.toFixed(2)}
              </span>
            </span>
            <span>
              C:{" "}
              <span className="text-white font-bold">
                {latestCandle.close.toFixed(2)}
              </span>
            </span>
            <span>
              Vol: <span className="text-slate-400">{latestCandle.volume}</span>
            </span>
          </div>
        )}
      </div>

      {/* Main Display Area (Canvas or DepthChart) */}
      <div className="relative flex-1 w-full min-h-[340px]">
        {chartType === 'depth' ? (
          <DepthChart book={orderBook} ticker={ticker} />
        ) : (
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="absolute inset-0 w-full h-full cursor-crosshair block"
          />
        )}
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-400 inline-block" />
            <span>Fair Value (Latent Price)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-indigo-400 inline-block" />
            <span>VWAP</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-400 inline-block" />
            <span>MM Bid</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block" />
            <span>MM Ask</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 font-bold">▲</span>
            <span className="text-rose-400 font-bold">▼</span>
            <span>User Fills</span>
          </div>
        </div>
        <div>
          <span>Candle Interval: 3s</span>
        </div>
      </div>
    </div>
  );
};
