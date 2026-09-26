import React, { useState, useEffect, useRef, useCallback } from "react";
import { MarketEngine, NSE_TICKERS } from "./simulation/marketEngine";
import type {
  TickerInfo,
  OrderBook as OrderBookType,
  Candle,
  Trade,
  MarketMakerConfig,
  MarketMakerStats,
  MarketRegime,
  OrderSide,
} from "./types/market";
import { Header } from "./components/Header";
import { Chart } from "./components/Chart";
import { OrderBook } from "./components/OrderBook";
import { MarketMakerTerminal } from "./components/MarketMakerTerminal";
import { TimeAndSales } from "./components/TimeAndSales";
import { ScenarioBar } from "./components/ScenarioBar";
import { EducationalModal } from "./components/EducationalModal";

export const App: React.FC = () => {
  const [currentTicker, setCurrentTicker] = useState<TickerInfo>(
    NSE_TICKERS.RELIANCE,
  );
  const engineRef = useRef<MarketEngine>(
    new MarketEngine(NSE_TICKERS.RELIANCE),
  );

  // Simulation controls
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Live state snapshots
  const [lastPrice, setLastPrice] = useState<number>(
    NSE_TICKERS.RELIANCE.initialPrice,
  );
  const [dayHigh, setDayHigh] = useState<number>(
    NSE_TICKERS.RELIANCE.dailyHigh,
  );
  const [dayLow, setDayLow] = useState<number>(NSE_TICKERS.RELIANCE.dailyLow);
  const [totalVol, setTotalVol] = useState<number>(124500);

  const [orderBook, setOrderBook] = useState<OrderBookType>(() =>
    engineRef.current.getOrderBook(),
  );
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
  const [fairValue, setFairValue] = useState<number>(
    NSE_TICKERS.RELIANCE.initialPrice,
  );
  const [trades, setTrades] = useState<Trade[]>([]);
  const [mmConfig, setMmConfig] = useState<MarketMakerConfig>(
    engineRef.current.mmConfig,
  );
  const [mmStats, setMmStats] = useState<MarketMakerStats>(
    engineRef.current.mmStats,
  );
  const [currentRegime, setCurrentRegime] = useState<MarketRegime>("NORMAL");

  // Selected price from order book for manual ticket
  const [selectedBookPrice, setSelectedBookPrice] = useState<{
    price: number;
    side: OrderSide;
  } | null>(null);

  // Sync state from engine
  const syncFromEngine = useCallback(() => {
    const engine = engineRef.current;
    const book = engine.getOrderBook(10);
    const price = engine.lastTradePrice;

    setLastPrice(price);
    setFairValue(engine.fairValue);
    setOrderBook(book);
    setCandles([...engine.candles]);
    setCurrentCandle(engine.currentCandle ? { ...engine.currentCandle } : null);
    setTrades([...engine.trades]);
    setMmStats({
      ...engine.mmStats,
      pnlHistory: [...engine.mmStats.pnlHistory],
    });
    setMmConfig({ ...engine.mmConfig });
    setCurrentRegime(engine.regime);

    setDayHigh((prev) => Math.max(prev, price));
    setDayLow((prev) => Math.min(prev, price));
    setTotalVol((prev) => prev + (engine.trades[0]?.size || 0));
  }, []);

  // Main simulation tick loop
  useEffect(() => {
    if (!isRunning) return;

    // Simulation tick frequency in milliseconds based on speed multiplier
    const baseIntervalMs = 120;
    const intervalMs = Math.max(20, Math.floor(baseIntervalMs / speed));

    const intervalId = setInterval(() => {
      engineRef.current.step(0.1 * speed);
      syncFromEngine();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [isRunning, speed, syncFromEngine]);

  // Handle ticker change
  const handleSelectTicker = (ticker: TickerInfo) => {
    setCurrentTicker(ticker);
    engineRef.current.setTicker(ticker);
    setDayHigh(ticker.dailyHigh);
    setDayLow(ticker.dailyLow);
    setTotalVol(Math.floor(Math.random() * 50000) + 50000);
    syncFromEngine();
  };

  // Reset simulation
  const handleReset = () => {
    engineRef.current = new MarketEngine(currentTicker);
    setDayHigh(currentTicker.dailyHigh);
    setDayLow(currentTicker.dailyLow);
    syncFromEngine();
  };

  // Update MM Config
  const handleUpdateConfig = (newConfig: Partial<MarketMakerConfig>) => {
    engineRef.current.mmConfig = {
      ...engineRef.current.mmConfig,
      ...newConfig,
    };
    setMmConfig({ ...engineRef.current.mmConfig });
  };

  // Place manual order from ticket
  const handlePlaceManualOrder = (
    side: OrderSide,
    type: "LIMIT" | "MARKET",
    price: number,
    size: number,
  ) => {
    if (type === "MARKET") {
      engineRef.current.executeMarketOrder({
        side,
        size,
        participantType: "USER_MM",
        isUser: true,
      });
    } else {
      engineRef.current.placeLimitOrder({
        side,
        price,
        size,
        isUser: true,
        participantType: "USER_MM",
      });
    }
    syncFromEngine();
  };

  // Flatten position (Emergency market hedge)
  const handleFlattenPosition = () => {
    const inv = engineRef.current.mmStats.inventory;
    if (inv === 0) return;
    const hedgeSide: OrderSide = inv > 0 ? "SELL" : "BUY";
    engineRef.current.executeMarketOrder({
      side: hedgeSide,
      size: Math.abs(inv),
      participantType: "USER_MM",
      isUser: true,
    });
    syncFromEngine();
  };

  // Shocks & Regimes
  const handleSetRegime = (regime: MarketRegime) => {
    engineRef.current.setRegime(regime);
    setCurrentRegime(regime);
  };

  const handleTriggerWhale = (side: OrderSide) => {
    engineRef.current.triggerWhaleOrder(side, 8);
    syncFromEngine();
  };

  // Compute change from prev close
  const priceChange = lastPrice - currentTicker.prevClose;
  const priceChangePercent = (priceChange / currentTicker.prevClose) * 100;

  // Extract User Quotes for Chart Overlay
  const userBid = orderBook.bids.find((b) => b.hasUserOrder)?.price;
  const userAsk = orderBook.asks.find((a) => a.hasUserOrder)?.price;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        currentTicker={currentTicker}
        onSelectTicker={handleSelectTicker}
        lastPrice={lastPrice}
        change={priceChange}
        changePercent={priceChangePercent}
        high={dayHigh}
        low={dayLow}
        volume={totalVol}
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(!isRunning)}
        speed={speed}
        onChangeSpeed={setSpeed}
        onReset={handleReset}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Trading Floor Grid */}
      <main className="flex-1 p-3 grid grid-cols-1 xl:grid-cols-12 gap-3 max-w-[1920px] mx-auto w-full">
        {/* Left Area: Chart & Market Maker Terminal (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          {/* Real-time Candlestick & Tick Chart */}
          <div className="h-[400px] lg:h-[430px]">
            <Chart
              candles={candles}
              currentCandle={currentCandle}
              fairValue={fairValue}
              userBidPrice={userBid}
              userAskPrice={userAsk}
              trades={trades}
              ticker={currentTicker}
            />
          </div>

          {/* Market Maker Algorithm & Performance Terminal */}
          <div className="flex-1 min-h-[460px]">
            <MarketMakerTerminal
              config={mmConfig}
              stats={mmStats}
              ticker={currentTicker}
              midPrice={orderBook.midPrice || lastPrice}
              onUpdateConfig={handleUpdateConfig}
              onPlaceManualOrder={handlePlaceManualOrder}
              onFlattenPosition={handleFlattenPosition}
              selectedPrice={selectedBookPrice}
            />
          </div>
        </div>

        {/* Right Area: Level 2 Order Book & Time and Sales (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col gap-3">
          {/* Level 2 Order Book */}
          <div className="h-[470px]">
            <OrderBook
              book={orderBook}
              ticker={currentTicker}
              onSelectPrice={(price, side) =>
                setSelectedBookPrice({ price, side })
              }
            />
          </div>

          {/* Time & Sales (Live Tape) */}
          <div className="flex-1 min-h-[390px]">
            <TimeAndSales trades={trades} ticker={currentTicker} />
          </div>
        </div>
      </main>

      {/* Bottom Scenario & Market Shock Injection Bar */}
      <footer className="p-3 pt-0 max-w-[1920px] mx-auto w-full">
        <ScenarioBar
          currentRegime={currentRegime}
          onSetRegime={handleSetRegime}
          onTriggerWhale={handleTriggerWhale}
        />
      </footer>

      {/* Educational Guide Modal */}
      <EducationalModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};

export default App;
