"use client";

import { createChart, ISeriesApi, LineStyle, Time, UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { LevelSet } from "@/lib/levels";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export default function TVChart({
  candles,
  rsi,
  rsiOb,
  rsiOs,
  levels,
}: {
  candles: Candle[];
  rsi: number[];
  rsiOb: number;
  rsiOs: number;
  levels?: LevelSet;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const priceChartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const rsiChartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const levelLinesRef = useRef<{[k: string]: ReturnType<ISeriesApi<"Line">["createPriceLine"]>}>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const priceDiv = document.createElement("div");
    const rsiDiv = document.createElement("div");
    priceDiv.style.height = "420px";
    rsiDiv.style.height = "160px";
    priceDiv.style.marginBottom = "8px";
    container.appendChild(priceDiv);
    container.appendChild(rsiDiv);

    const gridColor = "#1f2740";
    const textColor = "#a9b4d0";
    const up = "#26a69a";
    const down = "#ef5350";

    const priceChart = createChart(priceDiv, {
      layout: { background: { color: "#0f1524" }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      width: priceDiv.clientWidth,
      height: 420,
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor },
      crosshair: { mode: 1 },
    });
    const rsiChart = createChart(rsiDiv, {
      layout: { background: { color: "#0f1524" }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      width: rsiDiv.clientWidth,
      height: 160,
      rightPriceScale: { borderColor: gridColor },
      timeScale: { borderColor: gridColor },
      crosshair: { mode: 1 },
    });

    const candleSeries = priceChart.addCandlestickSeries({ upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down });
    const rsiSeries = rsiChart.addLineSeries({ color: "#9fb1ff", lineWidth: 2 });

    candleSeriesRef.current = candleSeries;
    rsiSeriesRef.current = rsiSeries;
    priceChartRef.current = priceChart;
    rsiChartRef.current = rsiChart;

    const handleResize = () => {
      priceChart.applyOptions({ width: priceDiv.clientWidth });
      rsiChart.applyOptions({ width: rsiDiv.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      priceChart.remove();
      rsiChart.remove();
      container.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;
    const data = candles.map(c => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }));
    series.setData(data);
    priceChartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!rsiSeriesRef.current) return;
    const series = rsiSeriesRef.current;
    const times = candles.map(c => c.time as UTCTimestamp);
    const rsiData = rsi.map((v, idx) => ({ time: times[idx] ?? (times[times.length - 1] as UTCTimestamp), value: v }));
    series.setData(rsiData);

    // Draw OB/OS zones as horizontal lines
    const chart = rsiChartRef.current;
    if (!chart) return;
    // Simple guides using extra line series (workaround for price lines on sub-chart)
    const obSeries = chart.addLineSeries({ color: "#ff8f8f", lineStyle: LineStyle.Dotted, lineWidth: 1 });
    obSeries.setData(times.map(t => ({ time: t, value: rsiOb })));
    const osSeries = chart.addLineSeries({ color: "#79e37d", lineStyle: LineStyle.Dotted, lineWidth: 1 });
    osSeries.setData(times.map(t => ({ time: t, value: rsiOs })));
    return () => {
      chart.removeSeries(obSeries);
      chart.removeSeries(osSeries);
    };
  }, [rsi, rsiOb, rsiOs, candles]);

  useEffect(() => {
    if (!levels || !candleSeriesRef.current || !priceChartRef.current) return;
    const chart = priceChartRef.current;
    const series = candleSeriesRef.current;

    // Remove previous price lines
    for (const key of Object.keys(levelLinesRef.current)) {
      try { series.removePriceLine(levelLinesRef.current[key]); } catch {}
    }
    levelLinesRef.current = {};

    const addLine = (price: number, color: string, title: string) => {
      const line = series.createPriceLine({ price, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title });
      return line;
    };

    levelLinesRef.current.A = addLine(levels.A, "#e57373", "A");
    levelLinesRef.current.B = addLine(levels.B, "#81c784", "B");
    levelLinesRef.current.A1 = addLine(levels.A1, "#ff6b6b", "A1");
    levelLinesRef.current.A2 = addLine(levels.A2, "#ff5252", "A2");
    levelLinesRef.current.A3 = addLine(levels.A3, "#ff3b3b", "A3");
    levelLinesRef.current.A4 = addLine(levels.A4, "#ff1f1f", "A4");
    levelLinesRef.current.B1 = addLine(levels.B1, "#66bb6a", "B1");
    levelLinesRef.current.B2 = addLine(levels.B2, "#4caf50", "B2");
    levelLinesRef.current.B3 = addLine(levels.B3, "#43a047", "B3");
    levelLinesRef.current.B4 = addLine(levels.B4, "#2e7d32", "B4");
  }, [levels]);

  return <div ref={containerRef} />;
}
