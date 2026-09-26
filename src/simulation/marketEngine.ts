import type {
  Order,
  OrderSide,
  Trade,
  OrderBook,
  OrderBookLevel,
  Candle,
  MarketMakerConfig,
  MarketMakerStats,
  TickerInfo,
  MarketRegime,
} from '../types/market';

export const NSE_TICKERS: Record<string, TickerInfo> = {
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    initialPrice: 2980.50,
    tickSize: 0.05,
    lotSize: 25,
    currency: '₹',
    dailyHigh: 3012.00,
    dailyLow: 2965.00,
    prevClose: 2975.20,
  },
  TCS: {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    initialPrice: 4210.00,
    tickSize: 0.05,
    lotSize: 20,
    currency: '₹',
    dailyHigh: 4245.00,
    dailyLow: 4180.00,
    prevClose: 4202.50,
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    exchange: 'NSE',
    initialPrice: 1645.25,
    tickSize: 0.05,
    lotSize: 50,
    currency: '₹',
    dailyHigh: 1660.00,
    dailyLow: 1638.00,
    prevClose: 1640.00,
  },
  TATASTEEL: {
    symbol: 'TATASTEEL',
    name: 'Tata Steel Limited',
    exchange: 'NSE',
    initialPrice: 154.20,
    tickSize: 0.05,
    lotSize: 100,
    currency: '₹',
    dailyHigh: 158.50,
    dailyLow: 152.00,
    prevClose: 153.80,
  },
};

export class MarketEngine {
  ticker: TickerInfo;
  fairValue: number;
  orders: Order[] = [];
  trades: Trade[] = [];
  candles: Candle[] = [];
  currentCandle: Candle | null = null;
  lastTradePrice: number;
  
  mmConfig: MarketMakerConfig;
  mmStats: MarketMakerStats;
  
  regime: MarketRegime = 'NORMAL';
  regimeTimer: number = 0;
  
  volatility: number = 0.8;
  drift: number = 0;
  
  private nextOrderId = 1;
  private nextTradeId = 1;
  private userQuoteIds: { buyId?: string; sellId?: string } = {};

  constructor(
    ticker: TickerInfo = NSE_TICKERS.RELIANCE,
    initialConfig?: Partial<MarketMakerConfig>
  ) {
    this.ticker = ticker;
    this.fairValue = ticker.initialPrice;
    this.lastTradePrice = ticker.initialPrice;

    this.mmConfig = {
      autoQuoting: true,
      halfSpreadTicks: 2,
      quoteSize: ticker.lotSize,
      inventorySkewFactor: 0.25,
      maxInventory: ticker.lotSize * 10,
      autoHedge: true,
      hedgeThreshold: ticker.lotSize * 6,
      cancelReplaceFreqMs: 500,
      ...initialConfig,
    };

    this.mmStats = {
      cash: 1000000, // 10 Lakhs initial cash
      inventory: 0,
      avgCost: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      tradesCount: 0,
      userFillsCount: 0,
      volumeTraded: 0,
      spreadCaptured: 0,
      pnlHistory: [{ time: Date.now(), pnl: 0 }],
    };

    this.initializeOrderBook();
    this.initCandle(this.fairValue);
  }

  setTicker(ticker: TickerInfo) {
    this.ticker = ticker;
    this.fairValue = ticker.initialPrice;
    this.lastTradePrice = ticker.initialPrice;
    this.orders = [];
    this.trades = [];
    this.candles = [];
    this.currentCandle = null;
    this.userQuoteIds = {};
    
    this.mmStats = {
      cash: 1000000,
      inventory: 0,
      avgCost: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      tradesCount: 0,
      userFillsCount: 0,
      volumeTraded: 0,
      spreadCaptured: 0,
      pnlHistory: [{ time: Date.now(), pnl: 0 }],
    };
    
    this.mmConfig.quoteSize = ticker.lotSize;
    this.mmConfig.maxInventory = ticker.lotSize * 10;
    this.mmConfig.hedgeThreshold = ticker.lotSize * 6;

    this.initializeOrderBook();
    this.initCandle(this.fairValue);
  }

  setRegime(regime: MarketRegime) {
    this.regime = regime;
    this.regimeTimer = 30; // 30 ticks of regime effect
    
    if (regime === 'HIGH_VOLATILITY') {
      this.volatility = 2.5;
      this.drift = 0;
    } else if (regime === 'BULL_RALLY') {
      this.volatility = 1.2;
      this.drift = 0.8;
    } else if (regime === 'FLASH_CRASH') {
      this.volatility = 3.0;
      this.drift = -2.2;
    } else if (regime === 'WHALE_ACCUMULATION') {
      this.volatility = 0.9;
      this.drift = 0.4;
    } else {
      this.volatility = 0.8;
      this.drift = 0;
    }
  }

  triggerWhaleOrder(side: OrderSide, multiplier: number = 8) {
    const size = this.ticker.lotSize * multiplier;
    this.executeMarketOrder({
      side,
      size,
      participantType: 'INSTITUTION',
    });
  }

  private roundTick(price: number): number {
    return Math.round(price / this.ticker.tickSize) * this.ticker.tickSize;
  }

  private initializeOrderBook() {
    const tick = this.ticker.tickSize;
    const mid = this.roundTick(this.fairValue);

    // Seed 12 bid levels and 12 ask levels around mid price
    for (let i = 1; i <= 12; i++) {
      const bidPrice = this.roundTick(mid - i * tick);
      const askPrice = this.roundTick(mid + i * tick);
      const baseSize = this.ticker.lotSize * (Math.floor(Math.random() * 4) + 1);

      this.orders.push({
        id: `seed-b-${i}`,
        side: 'BUY',
        price: bidPrice,
        size: baseSize,
        remainingSize: baseSize,
        timestamp: Date.now(),
        isUser: false,
        participantType: 'COMPETITOR_MM',
      });

      this.orders.push({
        id: `seed-a-${i}`,
        side: 'SELL',
        price: askPrice,
        size: baseSize,
        remainingSize: baseSize,
        timestamp: Date.now(),
        isUser: false,
        participantType: 'COMPETITOR_MM',
      });
    }

    if (this.mmConfig.autoQuoting) {
      this.updateMarketMakerQuotes();
    }
  }

  private initCandle(price: number) {
    const now = Math.floor(Date.now() / 1000) * 1000;
    this.currentCandle = {
      time: now,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
      userBuyVol: 0,
      userSellVol: 0,
    };
  }

  // Execute one tick step in the simulation
  step(deltaSeconds: number = 0.1) {
    if (this.regimeTimer > 0) {
      this.regimeTimer -= 1;
      if (this.regimeTimer <= 0) {
        this.setRegime('NORMAL');
      }
    }

    // 1. Latent fair value random walk with mean reversion & drift
    const normalRandom = (Math.random() - 0.5) * 2;
    const priceChange =
      (this.drift * 0.1 + normalRandom * this.volatility * Math.sqrt(deltaSeconds)) *
      (this.ticker.initialPrice * 0.0006);

    this.fairValue = Math.max(
      this.ticker.tickSize * 10,
      this.fairValue + priceChange
    );

    // 2. Liquidate or replenish competitor quotes around fair value
    this.maintainCompetitorLiquidity();

    // 3. User MM Auto-quoting update (Avellaneda-Stoikov style inventory skew)
    if (this.mmConfig.autoQuoting) {
      this.updateMarketMakerQuotes();
    }

    // 4. Simulate arrival of incoming market orders (retail, momentum, institutional)
    this.simulateIncomingFlow();

    // 5. Check auto-hedge threshold
    if (this.mmConfig.autoHedge && Math.abs(this.mmStats.inventory) >= this.mmConfig.hedgeThreshold) {
      this.performAutoHedge();
    }

    // 6. Update PnL & Candles
    this.updatePnL();
    this.updateCandle();
  }

  private maintainCompetitorLiquidity() {
    const tick = this.ticker.tickSize;
    const mid = this.roundTick(this.fairValue);
    
    // Remove stale competitor orders far away or inverted
    this.orders = this.orders.filter((o) => {
      if (o.isUser) return true; // keep user orders
      if (o.remainingSize <= 0) return false;
      const dist = Math.abs(o.price - mid) / tick;
      if (dist > 25) return false;
      // Inverted logic
      if (o.side === 'BUY' && o.price >= mid + 3 * tick) return false;
      if (o.side === 'SELL' && o.price <= mid - 3 * tick) return false;
      // Random cancellation of 5% of competitor orders per step
      if (Math.random() < 0.05) return false;
      return true;
    });

    // Ensure we have liquidity for 10 levels deep on both sides
    const existingBids = new Set(this.orders.filter((o) => o.side === 'BUY').map((o) => o.price));
    const existingAsks = new Set(this.orders.filter((o) => o.side === 'SELL').map((o) => o.price));

    for (let i = 1; i <= 10; i++) {
      const bidPrice = this.roundTick(mid - i * tick);
      const askPrice = this.roundTick(mid + i * tick);

      if (!existingBids.has(bidPrice)) {
        const size = this.ticker.lotSize * (Math.floor(Math.random() * 4) + 1);
        this.orders.push({
          id: `comp-b-${this.nextOrderId++}`,
          side: 'BUY',
          price: bidPrice,
          size,
          remainingSize: size,
          timestamp: Date.now(),
          isUser: false,
          participantType: 'COMPETITOR_MM',
        });
      }

      if (!existingAsks.has(askPrice)) {
        const size = this.ticker.lotSize * (Math.floor(Math.random() * 4) + 1);
        this.orders.push({
          id: `comp-a-${this.nextOrderId++}`,
          side: 'SELL',
          price: askPrice,
          size,
          remainingSize: size,
          timestamp: Date.now(),
          isUser: false,
          participantType: 'COMPETITOR_MM',
        });
      }
    }
  }

  // Avellaneda-Stoikov Market Maker Quote Generation
  private updateMarketMakerQuotes() {
    const tick = this.ticker.tickSize;
    const inv = this.mmStats.inventory;
    
    // Inventory Skew:
    // If long inventory (inv > 0), MM wants to sell, so reservation price lowers -> bid lower, ask lower
    // If short inventory (inv < 0), MM wants to buy, reservation price rises -> bid higher, ask higher
    const skewTicks = Math.round(inv * this.mmConfig.inventorySkewFactor / this.ticker.lotSize);
    
    const halfSpread = Math.max(1, this.mmConfig.halfSpreadTicks);
    const mid = this.roundTick(this.fairValue);

    // Reservation center price
    const resPrice = this.roundTick(mid - skewTicks * tick);

    let myBidPrice = this.roundTick(resPrice - halfSpread * tick);
    let myAskPrice = this.roundTick(resPrice + halfSpread * tick);

    // Enforce minimum 1 tick spread so quotes never cross
    if (myAskPrice <= myBidPrice) {
      myAskPrice = this.roundTick(myBidPrice + tick);
    }

    // Cancel previous user automated quotes
    if (this.userQuoteIds.buyId) {
      this.cancelOrder(this.userQuoteIds.buyId);
      this.userQuoteIds.buyId = undefined;
    }
    if (this.userQuoteIds.sellId) {
      this.cancelOrder(this.userQuoteIds.sellId);
      this.userQuoteIds.sellId = undefined;
    }

    // Place new MM quotes if within inventory limits
    if (inv < this.mmConfig.maxInventory) {
      const buyOrder = this.placeLimitOrder({
        side: 'BUY',
        price: myBidPrice,
        size: this.mmConfig.quoteSize,
        isUser: true,
        participantType: 'USER_MM',
      });
      this.userQuoteIds.buyId = buyOrder.id;
    }

    if (inv > -this.mmConfig.maxInventory) {
      const sellOrder = this.placeLimitOrder({
        side: 'SELL',
        price: myAskPrice,
        size: this.mmConfig.quoteSize,
        isUser: true,
        participantType: 'USER_MM',
      });
      this.userQuoteIds.sellId = sellOrder.id;
    }
  }

  private simulateIncomingFlow() {
    // Poisson arrival probability
    // Order book imbalance dictates taker bias
    const book = this.getOrderBook();
    const imbalance = book.imbalance; // between -1 and +1

    // Baseline chance of market order hitting each step: ~45%
    if (Math.random() < 0.45) {
      // Probability of BUY is biased by order book imbalance and market regime
      let buyProb = 0.5 + imbalance * 0.25;
      if (this.regime === 'BULL_RALLY') buyProb += 0.3;
      if (this.regime === 'FLASH_CRASH') buyProb -= 0.35;

      buyProb = Math.max(0.1, Math.min(0.9, buyProb));
      const side: OrderSide = Math.random() < buyProb ? 'BUY' : 'SELL';
      
      // Order size
      let sizeMultiplier = 1;
      const rand = Math.random();
      if (rand > 0.92) {
        sizeMultiplier = 4; // block trade
      } else if (rand > 0.7) {
        sizeMultiplier = 2;
      }
      
      const size = this.ticker.lotSize * sizeMultiplier;
      this.executeMarketOrder({
        side,
        size,
        participantType: rand > 0.92 ? 'INSTITUTION' : 'RETAIL',
      });
    }
  }

  private performAutoHedge() {
    const inv = this.mmStats.inventory;
    if (inv === 0) return;

    // To hedge a long position (+inv), sell market order
    // To hedge a short position (-inv), buy market order
    const hedgeSide: OrderSide = inv > 0 ? 'SELL' : 'BUY';
    const hedgeAmount = Math.min(Math.abs(inv), this.ticker.lotSize * 2);

    this.executeMarketOrder({
      side: hedgeSide,
      size: hedgeAmount,
      participantType: 'USER_MM',
      isUser: true,
    });
  }

  placeLimitOrder(params: {
    side: OrderSide;
    price: number;
    size: number;
    isUser?: boolean;
    participantType?: Order['participantType'];
  }): Order {
    const roundedPrice = this.roundTick(params.price);
    const order: Order = {
      id: `ord-${this.nextOrderId++}`,
      side: params.side,
      price: roundedPrice,
      size: params.size,
      remainingSize: params.size,
      timestamp: Date.now(),
      isUser: !!params.isUser,
      participantType: params.participantType || (params.isUser ? 'USER_MM' : 'RETAIL'),
    };

    this.orders.push(order);
    return order;
  }

  cancelOrder(orderId: string): boolean {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      this.orders.splice(idx, 1);
      return true;
    }
    return false;
  }

  executeMarketOrder(params: {
    side: OrderSide;
    size: number;
    participantType?: Order['participantType'];
    isUser?: boolean;
  }): Trade[] {
    const { side, size, isUser = false } = params;
    let remainingToFill = size;
    const executedTrades: Trade[] = [];

    // If taker is BUYing, they match against resting SELL (Ask) orders, lowest price first
    // If taker is SELLing, they match against resting BUY (Bid) orders, highest price first
    if (side === 'BUY') {
      const asks = this.orders
        .filter((o) => o.side === 'SELL' && o.remainingSize > 0)
        .sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);

      for (const ask of asks) {
        if (remainingToFill <= 0) break;
        const fillQty = Math.min(remainingToFill, ask.remainingSize);
        ask.remainingSize -= fillQty;
        remainingToFill -= fillQty;

        const isUserInvolved = isUser || ask.isUser;
        const trade: Trade = {
          id: `trd-${this.nextTradeId++}`,
          timestamp: Date.now(),
          price: ask.price,
          size: fillQty,
          takerSide: 'BUY',
          isUserTrade: isUserInvolved,
          userSide: isUser ? 'BUY' : ask.isUser ? 'SELL' : undefined,
          userRole: isUser ? 'TAKER' : ask.isUser ? 'MAKER' : undefined,
        };

        executedTrades.push(trade);
        this.processTrade(trade);
      }
    } else {
      // side === 'SELL'
      const bids = this.orders
        .filter((o) => o.side === 'BUY' && o.remainingSize > 0)
        .sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);

      for (const bid of bids) {
        if (remainingToFill <= 0) break;
        const fillQty = Math.min(remainingToFill, bid.remainingSize);
        bid.remainingSize -= fillQty;
        remainingToFill -= fillQty;

        const isUserInvolved = isUser || bid.isUser;
        const trade: Trade = {
          id: `trd-${this.nextTradeId++}`,
          timestamp: Date.now(),
          price: bid.price,
          size: fillQty,
          takerSide: 'SELL',
          isUserTrade: isUserInvolved,
          userSide: isUser ? 'SELL' : bid.isUser ? 'BUY' : undefined,
          userRole: isUser ? 'TAKER' : bid.isUser ? 'MAKER' : undefined,
        };

        executedTrades.push(trade);
        this.processTrade(trade);
      }
    }

    // Clean up filled orders
    this.orders = this.orders.filter((o) => o.remainingSize > 0);

    // If user's automated quote was consumed, clear its reference so new one can be placed
    if (this.userQuoteIds.buyId && !this.orders.some((o) => o.id === this.userQuoteIds.buyId)) {
      this.userQuoteIds.buyId = undefined;
    }
    if (this.userQuoteIds.sellId && !this.orders.some((o) => o.id === this.userQuoteIds.sellId)) {
      this.userQuoteIds.sellId = undefined;
    }

    return executedTrades;
  }

  private processTrade(trade: Trade) {
    this.lastTradePrice = trade.price;
    this.trades.unshift(trade);
    if (this.trades.length > 100) {
      this.trades.pop();
    }

    // Market impact: nudge fair value slightly in the direction of the trade
    const impactDirection = trade.takerSide === 'BUY' ? 1 : -1;
    const impactAmount = (trade.size / this.ticker.lotSize) * this.ticker.tickSize * 0.15;
    this.fairValue += impactDirection * impactAmount;

    // Process user inventory & PnL if user participated
    if (trade.isUserTrade && trade.userSide) {
      this.handleUserFill(trade);
    }
  }

  private handleUserFill(trade: Trade) {
    const side = trade.userSide!;
    const size = trade.size;
    const price = trade.price;
    const oldInv = this.mmStats.inventory;

    this.mmStats.tradesCount += 1;
    this.mmStats.userFillsCount += 1;
    this.mmStats.volumeTraded += size;

    if (trade.userRole === 'MAKER') {
      // Maker captured the spread!
      const spreadCaptured = (this.ticker.tickSize * this.mmConfig.halfSpreadTicks) * size;
      this.mmStats.spreadCaptured += spreadCaptured;
    }

    if (side === 'BUY') {
      this.mmStats.cash -= price * size;
      const newInv = oldInv + size;

      if (oldInv >= 0) {
        // Adding to long position
        const totalOldCost = oldInv * this.mmStats.avgCost;
        const addedCost = size * price;
        this.mmStats.avgCost = (totalOldCost + addedCost) / newInv;
      } else {
        // Covering short position -> realize PnL
        const coveredSize = Math.min(Math.abs(oldInv), size);
        const pnl = (this.mmStats.avgCost - price) * coveredSize;
        this.mmStats.realizedPnL += pnl;

        if (newInv > 0) {
          // Flipped from short to long
          this.mmStats.avgCost = price;
        } else if (newInv === 0) {
          this.mmStats.avgCost = 0;
        }
      }
      this.mmStats.inventory = newInv;
    } else {
      // side === 'SELL'
      this.mmStats.cash += price * size;
      const newInv = oldInv - size;

      if (oldInv <= 0) {
        // Adding to short position
        const totalOldCost = Math.abs(oldInv) * this.mmStats.avgCost;
        const addedCost = size * price;
        this.mmStats.avgCost = (totalOldCost + addedCost) / Math.abs(newInv);
      } else {
        // Closing long position -> realize PnL
        const closedSize = Math.min(oldInv, size);
        const pnl = (price - this.mmStats.avgCost) * closedSize;
        this.mmStats.realizedPnL += pnl;

        if (newInv < 0) {
          // Flipped from long to short
          this.mmStats.avgCost = price;
        } else if (newInv === 0) {
          this.mmStats.avgCost = 0;
        }
      }
      this.mmStats.inventory = newInv;
    }
  }

  private updatePnL() {
    const mid = this.getOrderBook().midPrice || this.lastTradePrice;
    const inv = this.mmStats.inventory;

    if (inv !== 0 && this.mmStats.avgCost > 0) {
      if (inv > 0) {
        this.mmStats.unrealizedPnL = (mid - this.mmStats.avgCost) * inv;
      } else {
        this.mmStats.unrealizedPnL = (this.mmStats.avgCost - mid) * Math.abs(inv);
      }
    } else {
      this.mmStats.unrealizedPnL = 0;
    }

    this.mmStats.totalPnL = this.mmStats.realizedPnL + this.mmStats.unrealizedPnL;

    // Record PnL history every few steps
    const now = Date.now();
    const lastRec = this.mmStats.pnlHistory[this.mmStats.pnlHistory.length - 1];
    if (!lastRec || now - lastRec.time >= 1000) {
      this.mmStats.pnlHistory.push({ time: now, pnl: this.mmStats.totalPnL });
      if (this.mmStats.pnlHistory.length > 120) {
        this.mmStats.pnlHistory.shift();
      }
    }
  }

  private updateCandle() {
    const price = this.lastTradePrice;
    const now = Math.floor(Date.now() / 1000) * 1000;

    if (!this.currentCandle) {
      this.initCandle(price);
      return;
    }

    // New candle every 3 seconds for fast dynamic action
    if (now - this.currentCandle.time >= 3000) {
      this.candles.push({ ...this.currentCandle });
      if (this.candles.length > 80) {
        this.candles.shift();
      }
      this.currentCandle = {
        time: now,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        userBuyVol: 0,
        userSellVol: 0,
      };
    } else {
      this.currentCandle.high = Math.max(this.currentCandle.high, price);
      this.currentCandle.low = Math.min(this.currentCandle.low, price);
      this.currentCandle.close = price;
    }
  }

  getOrderBook(depth: number = 10): OrderBook {
    const bidsMap = new Map<number, { totalSize: number; orderCount: number; userSize: number }>();
    const asksMap = new Map<number, { totalSize: number; orderCount: number; userSize: number }>();

    for (const o of this.orders) {
      if (o.remainingSize <= 0) continue;
      const map = o.side === 'BUY' ? bidsMap : asksMap;
      const entry = map.get(o.price) || { totalSize: 0, orderCount: 0, userSize: 0 };
      entry.totalSize += o.remainingSize;
      entry.orderCount += 1;
      if (o.isUser) {
        entry.userSize += o.remainingSize;
      }
      map.set(o.price, entry);
    }

    const sortedBidPrices = Array.from(bidsMap.keys()).sort((a, b) => b - a);
    const sortedAskPrices = Array.from(asksMap.keys()).sort((a, b) => a - b);

    let cumBidSize = 0;
    const bids: OrderBookLevel[] = sortedBidPrices.slice(0, depth).map((price) => {
      const data = bidsMap.get(price)!;
      cumBidSize += data.totalSize;
      return {
        price,
        totalSize: data.totalSize,
        orderCount: data.orderCount,
        userSize: data.userSize,
        hasUserOrder: data.userSize > 0,
        cumulativeSize: cumBidSize,
        depthPercent: 0,
      };
    });

    let cumAskSize = 0;
    const asks: OrderBookLevel[] = sortedAskPrices.slice(0, depth).map((price) => {
      const data = asksMap.get(price)!;
      cumAskSize += data.totalSize;
      return {
        price,
        totalSize: data.totalSize,
        orderCount: data.orderCount,
        userSize: data.userSize,
        hasUserOrder: data.userSize > 0,
        cumulativeSize: cumAskSize,
        depthPercent: 0,
      };
    });

    // Calculate max depth for relative percentage bars
    const maxCumSize = Math.max(cumBidSize, cumAskSize, 1);
    bids.forEach((b) => (b.depthPercent = (b.cumulativeSize / maxCumSize) * 100));
    asks.forEach((a) => (a.depthPercent = (a.cumulativeSize / maxCumSize) * 100));

    const bestBid = bids.length > 0 ? bids[0].price : this.fairValue - this.ticker.tickSize;
    const bestAsk = asks.length > 0 ? asks[0].price : this.fairValue + this.ticker.tickSize;
    const spread = Math.max(0, bestAsk - bestBid);
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadBps = midPrice > 0 ? (spread / midPrice) * 10000 : 0;

    const topBidVol = bids.length > 0 ? bids[0].totalSize : 1;
    const topAskVol = asks.length > 0 ? asks[0].totalSize : 1;
    const microPrice = (topAskVol * bestBid + topBidVol * bestAsk) / (topBidVol + topAskVol);
    const totalTopVol = topBidVol + topAskVol;
    const imbalance = totalTopVol > 0 ? (topBidVol - topAskVol) / totalTopVol : 0;

    return {
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      spreadBps,
      midPrice,
      microPrice,
      imbalance,
    };
  }
}
