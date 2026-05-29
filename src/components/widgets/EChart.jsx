import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

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
            chart.setOption(option, true);
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
            chartInstanceRef.current.setOption(option, {
                notMerge: true,
                lazyUpdate: true
            });
        }
    }, [option]);

    return <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: 200, ...style }} />;
}
