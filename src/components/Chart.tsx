import React, { useEffect, useRef, useState, useMemo } from "react";
import type { Candle, Trade, TickerInfo, OrderBook } from "../types/market";
import {
  BarChart2,
  TrendingUp,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  FastForward,
  Check,
} from "lucide-react";
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

export interface IndicatorSettings {
  ema9: boolean;
  ema21: boolean;
  bollinger: boolean;
  vwap: boolean;
  rsi: boolean;
  fairValue: boolean;
  mmQuotes: boolean;
  userFills: boolean;
  volume: boolean;
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

  // View mode
  const [chartType, setChartType] = useState<"candles" | "line" | "depth">("candles");

  // Indicators toggle state
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    ema9: true,
    ema21: false,
    bollinger: false,
    vwap: true,
    rsi: false,
    fairValue: true,
    mmQuotes: true,
    userFills: true,
    volume: true,
  });

  const [isIndicatorsMenuOpen, setIsIndicatorsMenuOpen] = useState(false);

  // Scroll & Zoom state
  const [visibleCount, setVisibleCount] = useState<number>(45);
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 = locked to live edge, >0 = viewing past
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);

  // Crosshair hover state
  const [hoverData, setHoverData] = useState<{
    candle?: Candle;
    price?: number;
    x: number;
    y: number;
  } | null>(null);

  // Combine historical candles with live candle
  const allCandles = useMemo(() => {
    if (!currentCandle) return candles;
    return [...candles, currentCandle];
  }, [candles, currentCandle]);

  // Compute Full Series Technical Indicators
  const indicatorSeries = useMemo(() => {
    const n = allCandles.length;
    const ema9Arr: (number | null)[] = new Array(n).fill(null);
    const ema21Arr: (number | null)[] = new Array(n).fill(null);
    const bbUpper: (number | null)[] = new Array(n).fill(null);
    const bbLower: (number | null)[] = new Array(n).fill(null);
    const bbMiddle: (number | null)[] = new Array(n).fill(null);
    const vwapArr: (number | null)[] = new Array(n).fill(null);
    const rsiArr: (number | null)[] = new Array(n).fill(null);

    if (n === 0) return { ema9Arr, ema21Arr, bbUpper, bbLower, bbMiddle, vwapArr, rsiArr };

    // 1. EMA 9
    const k9 = 2 / (9 + 1);
    let prevEma9 = allCandles[0].close;
    ema9Arr[0] = prevEma9;
    for (let i = 1; i < n; i++) {
      prevEma9 = allCandles[i].close * k9 + prevEma9 * (1 - k9);
      ema9Arr[i] = prevEma9;
    }

    // 2. EMA 21
    const k21 = 2 / (21 + 1);
    let prevEma21 = allCandles[0].close;
    ema21Arr[0] = prevEma21;
    for (let i = 1; i < n; i++) {
      prevEma21 = allCandles[i].close * k21 + prevEma21 * (1 - k21);
      ema21Arr[i] = prevEma21;
    }

    // 3. Bollinger Bands (20 periods, 2 std dev)
    for (let i = 0; i < n; i++) {
      if (i >= 19) {
        let sum = 0;
        for (let j = i - 19; j <= i; j++) {
          sum += allCandles[j].close;
        }
        const sma = sum / 20;
        let sumSq = 0;
        for (let j = i - 19; j <= i; j++) {
          sumSq += Math.pow(allCandles[j].close - sma, 2);
        }
        const std = Math.sqrt(sumSq / 20);
        bbMiddle[i] = sma;
        bbUpper[i] = sma + 2 * std;
        bbLower[i] = sma - 2 * std;
      }
    }

    // 4. VWAP
    let cumVol = 0;
    let cumPriceVol = 0;
    for (let i = 0; i < n; i++) {
      const c = allCandles[i];
      const typ = (c.high + c.low + c.close) / 3;
      const v = Math.max(c.volume, 1);
      cumVol += v;
      cumPriceVol += typ * v;
      vwapArr[i] = cumPriceVol / cumVol;
    }

    // 5. RSI 14
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < n; i++) {
      const diff = allCandles[i].close - allCandles[i - 1].close;
      if (i <= 14) {
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
        if (i === 14) {
          let avgGain = gains / 14;
          let avgLoss = losses / 14;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsiArr[i] = 100 - 100 / (1 + rs);
        }
      } else {
        const prevRsi = rsiArr[i - 1];
        if (prevRsi !== null) {
          const curGain = diff > 0 ? diff : 0;
          const curLoss = diff < 0 ? Math.abs(diff) : 0;
          // Wilder smoothing
          gains = (gains * 13 + curGain) / 14;
          losses = (losses * 13 + curLoss) / 14;
          const rs = losses === 0 ? 100 : gains / losses;
          rsiArr[i] = 100 - 100 / (1 + rs);
        }
      }
    }

    return { ema9Arr, ema21Arr, bbUpper, bbLower, bbMiddle, vwapArr, rsiArr };
  }, [allCandles]);

  // Determine slice of visible candles based on scrollOffset and visibleCount
  const maxScrollOffset = Math.max(0, allCandles.length - visibleCount);
  const effectiveOffset = Math.min(scrollOffset, maxScrollOffset);
  const endIndex = allCandles.length - effectiveOffset;
  const startIndex = Math.max(0, endIndex - visibleCount);

  const visibleCandles = useMemo(
    () => allCandles.slice(startIndex, endIndex),
    [allCandles, startIndex, endIndex]
  );

  // Canvas render loop
  useEffect(() => {
    if (chartType === "depth") return;
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

    // Layout dimensions
    const margin = { top: 25, right: 70, bottom: 35, left: 15 };
    const chartWidth = width - margin.left - margin.right;
    const totalAvailH = height - margin.top - margin.bottom;

    // Panel heights allocation
    const rsiHeight = indicators.rsi ? Math.max(55, totalAvailH * 0.22) : 0;
    const volumeHeight = indicators.volume ? Math.max(40, totalAvailH * 0.18) : 0;
    const gap = 12;
    const priceHeight = totalAvailH - rsiHeight - volumeHeight - (rsiHeight > 0 ? gap : 0) - (volumeHeight > 0 ? gap : 0);

    // Clear background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    if (visibleCandles.length === 0) return;

    // Auto-scale price bounds across visible candles
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 1;

    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    if (indicators.fairValue && fairValue > 0) {
      minPrice = Math.min(minPrice, fairValue);
      maxPrice = Math.max(maxPrice, fairValue);
    }
    if (indicators.mmQuotes && userBidPrice) minPrice = Math.min(minPrice, userBidPrice);
    if (indicators.mmQuotes && userAskPrice) maxPrice = Math.max(maxPrice, userAskPrice);

    // Add 8% vertical padding
    const pricePadding = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;

    const getY = (p: number) => {
      return margin.top + priceHeight - ((p - minPrice) / priceRange) * priceHeight;
    };

    const n = visibleCandles.length;
    const stepX = chartWidth / n;
    const barWidth = Math.max(3, stepX * 0.72);

    // 1. Grid Lines & Price Labels
    const numGridLines = 5;
    ctx.strokeStyle = "rgba(30, 41, 59, 0.6)";
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

      ctx.fillText(`${ticker.currency}${p.toFixed(2)}`, margin.left + chartWidth + 6, y + 3);
    }

    // 2. Bollinger Bands (if enabled)
    if (indicators.bollinger) {
      const { bbUpper, bbLower, bbMiddle } = indicatorSeries;
      // Draw shaded area
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const fullIdx = startIndex + i;
        const up = bbUpper[fullIdx];
        if (up !== null) {
          const x = margin.left + i * stepX + stepX / 2;
          const y = getY(up);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let i = n - 1; i >= 0; i--) {
        const fullIdx = startIndex + i;
        const low = bbLower[fullIdx];
        if (low !== null) {
          const x = margin.left + i * stepX + stepX / 2;
          const y = getY(low);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
      ctx.fill();

      // Draw upper & lower boundaries
      const drawBBLine = (arr: (number | null)[], color: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        let active = false;
        for (let i = 0; i < n; i++) {
          const val = arr[startIndex + i];
          if (val !== null) {
            const x = margin.left + i * stepX + stepX / 2;
            const y = getY(val);
            if (!active) {
              ctx.moveTo(x, y);
              active = true;
            } else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      drawBBLine(bbUpper, "rgba(59, 130, 246, 0.6)");
      drawBBLine(bbMiddle, "rgba(59, 130, 246, 0.35)");
      drawBBLine(bbLower, "rgba(59, 130, 246, 0.6)");
    }

    // 3. Draw Candlesticks or Line
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

        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));
        ctx.fillStyle = color;
        ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
      });
    } else if (chartType === "line") {
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

      // Gradient area fill
      const lastX = margin.left + (visibleCandles.length - 1) * stepX + stepX / 2;
      const firstX = margin.left + stepX / 2;
      ctx.lineTo(lastX, margin.top + priceHeight);
      ctx.lineTo(firstX, margin.top + priceHeight);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, margin.top, 0, margin.top + priceHeight);
      grad.addColorStop(0, "rgba(56, 189, 248, 0.22)");
      grad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 4. Indicator Line Helper
    const drawIndicatorLine = (arr: (number | null)[], color: string, width = 1.5, dashed = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dashed) ctx.setLineDash([4, 3]);
      else ctx.setLineDash([]);

      let started = false;
      for (let i = 0; i < n; i++) {
        const val = arr[startIndex + i];
        if (val !== null) {
          const x = margin.left + i * stepX + stepX / 2;
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Draw EMA 9 (Cyan)
    if (indicators.ema9) {
      drawIndicatorLine(indicatorSeries.ema9Arr, "#06b6d4", 1.8);
    }

    // Draw EMA 21 (Purple)
    if (indicators.ema21) {
      drawIndicatorLine(indicatorSeries.ema21Arr, "#a855f7", 1.8);
    }

    // Draw VWAP (Indigo dashed)
    if (indicators.vwap) {
      drawIndicatorLine(indicatorSeries.vwapArr, "#818cf8", 1.6, true);
    }

    // 5. Fair Value line (Dashed Gold)
    if (indicators.fairValue && fairValue > 0) {
      const fvY = getY(fairValue);
      ctx.beginPath();
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 3]);
      ctx.moveTo(margin.left, fvY);
      ctx.lineTo(margin.left + chartWidth, fvY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(margin.left + chartWidth + 2, fvY - 9, 62, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`FV ${fairValue.toFixed(2)}`, margin.left + chartWidth + 4, fvY + 4);
    }

    // 6. Market Maker Quotes (Green Bid, Red Ask)
    if (indicators.mmQuotes) {
      if (userBidPrice && userBidPrice >= minPrice && userBidPrice <= maxPrice) {
        const bidY = getY(userBidPrice);
        ctx.beginPath();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 2]);
        ctx.moveTo(margin.left, bidY);
        ctx.lineTo(margin.left + chartWidth, bidY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#059669";
        ctx.fillRect(margin.left + chartWidth + 2, bidY - 8, 62, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`MY BID`, margin.left + chartWidth + 4, bidY + 4);
      }

      if (userAskPrice && userAskPrice >= minPrice && userAskPrice <= maxPrice) {
        const askY = getY(userAskPrice);
        ctx.beginPath();
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 2]);
        ctx.moveTo(margin.left, askY);
        ctx.lineTo(margin.left + chartWidth, askY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#e11d48";
        ctx.fillRect(margin.left + chartWidth + 2, askY - 8, 62, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`MY ASK`, margin.left + chartWidth + 4, askY + 4);
      }
    }

    // 7. Recent User Trade Execution Markers (▲ Buy / ▼ Sell)
    if (indicators.userFills) {
      const recentUserTrades = trades.filter((t) => t.isUserTrade).slice(0, 15);
      const rightEdgeX = margin.left + (visibleCandles.length - 1) * stepX + stepX / 2;

      recentUserTrades.forEach((t, idx) => {
        const y = getY(t.price);
        const isBuy = t.userSide === "BUY";
        const markerX = Math.max(margin.left + 25, rightEdgeX - idx * 18);

        ctx.beginPath();
        if (isBuy) {
          ctx.fillStyle = "#22c55e";
          ctx.moveTo(markerX, y - 2);
          ctx.lineTo(markerX - 5, y + 8);
          ctx.lineTo(markerX + 5, y + 8);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = "#ef4444";
          ctx.moveTo(markerX, y + 2);
          ctx.lineTo(markerX - 5, y - 8);
          ctx.lineTo(markerX + 5, y - 8);
          ctx.closePath();
          ctx.fill();
        }
      });
    }

    // 8. Volume Sub-chart
    let currentYOffset = margin.top + priceHeight + (volumeHeight > 0 ? gap : 0);
    if (indicators.volume && volumeHeight > 0) {
      const volBaseY = currentYOffset + volumeHeight;

      // Baseline
      ctx.beginPath();
      ctx.moveTo(margin.left, volBaseY);
      ctx.lineTo(margin.left + chartWidth, volBaseY);
      ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
      ctx.stroke();

      visibleCandles.forEach((c, i) => {
        const x = margin.left + i * stepX + stepX / 2;
        const vH = (c.volume / maxVolume) * (volumeHeight - 5);
        const isUp = c.close >= c.open;

        ctx.fillStyle = isUp ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)";
        ctx.fillRect(x - barWidth / 2, volBaseY - vH, barWidth, vH);
      });

      // Volume axis tag
      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`VOL`, margin.left + chartWidth + 6, volBaseY - 4);

      currentYOffset = volBaseY + (rsiHeight > 0 ? gap : 0);
    }

    // 9. RSI (14) Sub-chart
    if (indicators.rsi && rsiHeight > 0) {
      // RSI bounding box
      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.fillRect(margin.left, currentYOffset, chartWidth, rsiHeight);
      ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
      ctx.strokeRect(margin.left, currentYOffset, chartWidth, rsiHeight);

      const getRsiY = (val: number) => currentYOffset + rsiHeight - (val / 100) * rsiHeight;

      // 70 Overbought & 30 Oversold lines
      const y70 = getRsiY(70);
      const y30 = getRsiY(30);

      // Shaded middle band
      ctx.fillStyle = "rgba(168, 85, 247, 0.05)";
      ctx.fillRect(margin.left, y70, chartWidth, y30 - y70);

      ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(margin.left, y70);
      ctx.lineTo(margin.left + chartWidth, y70);
      ctx.stroke();

      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
      ctx.beginPath();
      ctx.moveTo(margin.left, y30);
      ctx.lineTo(margin.left + chartWidth, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#a855f7";
      ctx.font = "9px monospace";
      ctx.fillText(`RSI 70`, margin.left + chartWidth + 6, y70 + 3);
      ctx.fillText(`RSI 30`, margin.left + chartWidth + 6, y30 + 3);

      // Draw RSI Curve
      ctx.beginPath();
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 1.6;
      let rsiStarted = false;

      for (let i = 0; i < n; i++) {
        const val = indicatorSeries.rsiArr[startIndex + i];
        if (val !== null) {
          const x = margin.left + i * stepX + stepX / 2;
          const y = getRsiY(val);
          if (!rsiStarted) {
            ctx.moveTo(x, y);
            rsiStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }

    // 10. Time Axis Labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    const timeStep = Math.max(1, Math.floor(n / 6));

    for (let i = 0; i < n; i += timeStep) {
      const c = visibleCandles[i];
      const x = margin.left + i * stepX + stepX / 2;
      const d = new Date(c.time);
      const timeStr = `${d.getMinutes().toString().padStart(2, "0")}:${d
        .getSeconds()
        .toString()
        .padStart(2, "0")}`;
      ctx.fillText(timeStr, x, height - 8);
    }

    // 11. Crosshair Hover
    if (hoverData) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverData.x, margin.top);
      ctx.lineTo(hoverData.x, height - margin.bottom);
      ctx.stroke();

      // Horizontal line
      if (hoverData.y <= margin.top + priceHeight) {
        ctx.beginPath();
        ctx.moveTo(margin.left, hoverData.y);
        ctx.lineTo(margin.left + chartWidth, hoverData.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [
    visibleCandles,
    startIndex,
    chartType,
    indicators,
    indicatorSeries,
    fairValue,
    userBidPrice,
    userAskPrice,
    trades,
    hoverData,
    ticker,
  ]);

  // Handle Drag to Scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = scrollOffset;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      const deltaX = e.clientX - dragStartXRef.current;
      const stepX = (rect.width - 85) / visibleCount;
      const candleDelta = Math.round(deltaX / stepX);
      const newOffset = Math.max(0, Math.min(maxScrollOffset, dragStartOffsetRef.current + candleDelta));
      setScrollOffset(newOffset);
    } else {
      setHoverData({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel Zoom & Scroll
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom in/out
      const delta = Math.sign(e.deltaY) * 4;
      setVisibleCount((prev) => Math.max(15, Math.min(120, prev + delta)));
    } else {
      // Scroll horizontally
      const delta = Math.sign(e.deltaY) * 3;
      setScrollOffset((prev) => Math.max(0, Math.min(maxScrollOffset, prev + delta)));
    }
  };

  const handleZoomIn = () => setVisibleCount((prev) => Math.max(15, prev - 8));
  const handleZoomOut = () => setVisibleCount((prev) => Math.min(120, prev + 8));
  const handleResetView = () => {
    setScrollOffset(0);
    setVisibleCount(45);
  };

  const latestCandle = allCandles[allCandles.length - 1];
  const latestEma9 = indicatorSeries.ema9Arr[allCandles.length - 1];
  const latestEma21 = indicatorSeries.ema21Arr[allCandles.length - 1];
  const latestVwap = indicatorSeries.vwapArr[allCandles.length - 1];
  const latestRsi = indicatorSeries.rsiArr[allCandles.length - 1];

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md select-none"
    >
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700/60">
            <button
              onClick={() => setChartType("candles")}
              title="Switch chart view to Japanese Candlesticks"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
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
              title="Switch chart view to continuous Line chart"
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

          {/* Indicators Toggle Menu */}
          {chartType !== "depth" && (
            <div className="relative">
              <button
                onClick={() => setIsIndicatorsMenuOpen(!isIndicatorsMenuOpen)}
                title="Open Indicator settings: EMA, Bollinger Bands, VWAP, RSI, Quotes"
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isIndicatorsMenuOpen
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <Sliders className="w-3 h-3" />
                Indicators
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </button>

              {/* Dropdown Menu */}
              {isIndicatorsMenuOpen && (
                <div className="absolute top-8 left-0 z-30 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                    Toggle Indicators
                  </div>

                  {/* EMA 9 */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, ema9: !prev.ema9 }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-cyan-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" /> EMA 9 (Fast)
                    </span>
                    {indicators.ema9 && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>

                  {/* EMA 21 */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, ema21: !prev.ema21 }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-purple-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-purple-400" /> EMA 21 (Slow)
                    </span>
                    {indicators.ema21 && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>

                  {/* Bollinger Bands */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, bollinger: !prev.bollinger }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-blue-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-blue-400" /> Bollinger Bands (20,2)
                    </span>
                    {indicators.bollinger && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  {/* VWAP */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, vwap: !prev.vwap }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-indigo-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" /> VWAP
                    </span>
                    {indicators.vwap && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>

                  {/* RSI */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, rsi: !prev.rsi }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-violet-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-violet-400" /> RSI (14) Oscillator
                    </span>
                    {indicators.rsi && <Check className="w-3.5 h-3.5 text-violet-400" />}
                  </button>

                  <div className="border-t border-slate-800 my-1" />

                  {/* Fair Value */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, fairValue: !prev.fairValue }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-amber-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Fair Value Line
                    </span>
                    {indicators.fairValue && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>

                  {/* MM Quotes */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, mmQuotes: !prev.mmQuotes }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> MM Quotes
                    </span>
                    {indicators.mmQuotes && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  {/* User Fills */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, userFills: !prev.userFills }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-slate-300 font-semibold">
                      <span>▲▼</span> User Fills Markers
                    </span>
                    {indicators.userFills && <Check className="w-3.5 h-3.5 text-slate-200" />}
                  </button>

                  {/* Volume */}
                  <button
                    onClick={() => setIndicators((prev) => ({ ...prev, volume: !prev.volume }))}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-slate-400 font-semibold">
                      <span>📊</span> Volume Histogram
                    </span>
                    {indicators.volume && <Check className="w-3.5 h-3.5 text-slate-200" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Zoom & Pan Controls */}
          {chartType !== "depth" && (
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-md border border-slate-700/60">
              <button
                onClick={handleZoomIn}
                title="Zoom in on price action"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom out (view more candles)"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={handleResetView}
                title="Reset zoom & snap to live edge"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Live Values Legend */}
        {latestCandle && chartType !== "depth" && (
          <div className="hidden xl:flex items-center gap-3 font-mono text-[11px] text-slate-300">
            {indicators.ema9 && latestEma9 !== null && (
              <span className="text-cyan-400">
                EMA9: <strong>{latestEma9.toFixed(2)}</strong>
              </span>
            )}
            {indicators.ema21 && latestEma21 !== null && (
              <span className="text-purple-400">
                EMA21: <strong>{latestEma21.toFixed(2)}</strong>
              </span>
            )}
            {indicators.vwap && latestVwap !== null && (
              <span className="text-indigo-400">
                VWAP: <strong>{latestVwap.toFixed(2)}</strong>
              </span>
            )}
            {indicators.rsi && latestRsi !== null && (
              <span className="text-violet-400">
                RSI: <strong>{latestRsi.toFixed(1)}</strong>
              </span>
            )}
            <span className="text-slate-400 border-l border-slate-800 pl-2">
              C: <strong className="text-white">{latestCandle.close.toFixed(2)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Canvas / Depth Viewport */}
      <div className="relative flex-1 w-full min-h-[340px]">
        {chartType === "depth" ? (
          <DepthChart book={orderBook} ticker={ticker} />
        ) : (
          <>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                handleMouseUp();
                setHoverData(null);
              }}
              onWheel={handleWheel}
              className={`absolute inset-0 w-full h-full block ${
                isDragging ? "cursor-grabbing" : "cursor-crosshair"
              }`}
            />

            {/* Jump to Live Edge floating badge when scrolled back */}
            {effectiveOffset > 0 && (
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-slate-950/90 border border-amber-500/50 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md animate-in fade-in duration-150">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-mono text-amber-300">
                  Viewing Past (-{effectiveOffset} candles)
                </span>
                <button
                  onClick={() => setScrollOffset(0)}
                  title="Snap back to current live market action"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  <FastForward className="w-3 h-3 fill-current" /> Live Edge
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Instructions / Scroll Help Footer */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>🖱️ Click &amp; Drag or Mouse Wheel to scroll past candles</span>
          <span>•</span>
          <span>Ctrl + Wheel to Zoom</span>
        </div>
        <div className="font-mono text-slate-500">
          Showing {visibleCandles.length} of {allCandles.length} candles (3s)
        </div>
      </div>
    </div>
  );
};
