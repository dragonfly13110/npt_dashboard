import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const premiumTooltip = {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(226,232,240,0.92)',
    borderWidth: 1,
    borderRadius: 12,
    padding: [10, 14],
    extraCssText: [
        'box-shadow: 0 14px 34px rgba(15,23,42,0.14)',
        'backdrop-filter: blur(14px)',
        '-webkit-backdrop-filter: blur(14px)',
    ].join(';'),
    confine: true,
};

const premiumText = {
    color: '#64748b',
    fontSize: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

function mergeObject(base, value) {
    return { ...base, ...(value || {}) };
}

function polishTooltip(tooltip) {
    if (!tooltip) return premiumTooltip;
    if (Array.isArray(tooltip)) return tooltip.map(polishTooltip);
    return {
        ...premiumTooltip,
        ...tooltip,
        extraCssText: [premiumTooltip.extraCssText, tooltip.extraCssText].filter(Boolean).join(';'),
    };
}

function polishAxis(axis) {
    if (!axis) return axis;
    if (Array.isArray(axis)) return axis.map(polishAxis);
    return {
        ...axis,
        axisLabel: mergeObject(premiumText, axis.axisLabel),
        axisLine: mergeObject({ lineStyle: { color: '#e2e8f0' } }, axis.axisLine),
        axisTick: mergeObject({ lineStyle: { color: '#e2e8f0' } }, axis.axisTick),
        splitLine: mergeObject({ lineStyle: { color: '#eef2f7', type: 'dashed' } }, axis.splitLine),
    };
}

function polishSeries(series) {
    if (!series) return series;
    return (Array.isArray(series) ? series : [series]).map((item) => {
        const next = { ...item };
        if (next.type === 'bar') {
            next.itemStyle = {
                borderRadius: [6, 6, 0, 0],
                shadowBlur: 8,
                shadowColor: 'rgba(15,23,42,0.08)',
                shadowOffsetY: 3,
                ...(next.itemStyle || {}),
            };
            next.emphasis = {
                focus: 'series',
                itemStyle: {
                    shadowBlur: 14,
                    shadowColor: 'rgba(15,23,42,0.14)',
                    shadowOffsetY: 5,
                },
                ...(next.emphasis || {}),
            };
        }
        if (next.type === 'pie') {
            next.itemStyle = {
                borderRadius: 6,
                borderColor: '#fff',
                borderWidth: 2,
                ...(next.itemStyle || {}),
            };
            next.emphasis = {
                scale: true,
                scaleSize: 5,
                itemStyle: {
                    shadowBlur: 18,
                    shadowColor: 'rgba(15,23,42,0.16)',
                },
                ...(next.emphasis || {}),
            };
        }
        if (next.type === 'line') {
            next.lineStyle = {
                width: 2.5,
                cap: 'round',
                join: 'round',
                ...(next.lineStyle || {}),
            };
            next.emphasis = {
                focus: 'series',
                ...(next.emphasis || {}),
            };
        }
        return next;
    });
}

function polishOption(option) {
    if (!option) return option;
    return {
        animationDuration: 650,
        animationEasing: 'cubicOut',
        ...option,
        textStyle: mergeObject(premiumText, option.textStyle),
        tooltip: polishTooltip(option.tooltip),
        xAxis: polishAxis(option.xAxis),
        yAxis: polishAxis(option.yAxis),
        series: polishSeries(option.series),
    };
}

export default function EChart({ option, style, theme = null }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!chartRef.current) return;

        // Initialize chart
        const chart = echarts.init(chartRef.current, theme);
        chartInstanceRef.current = chart;

        // Set option
        if (option) {
            chart.setOption(polishOption(option), true);
        }

        // Handle window resize
        const handleResize = () => {
            chart.resize();
        };
        window.addEventListener('resize', handleResize);

        // ResizeObserver to handle container size changes (e.g. Sidebar toggle)
        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                if (chartInstanceRef.current) {
                    chartInstanceRef.current.resize();
                }
            });
            if (chartRef.current.parentElement) {
                resizeObserver.observe(chartRef.current.parentElement);
            }
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            chart.dispose();
            chartInstanceRef.current = null;
        };
    }, [theme]); // Re-initialize only if theme changes

    // Update option when props option changes
    useEffect(() => {
        if (chartInstanceRef.current && option) {
            chartInstanceRef.current.setOption(polishOption(option), {
                notMerge: true,
                lazyUpdate: true
            });
        }
    }, [option]);

    return <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: 200, borderRadius: 8, overflow: 'hidden', ...style }} />;
}
