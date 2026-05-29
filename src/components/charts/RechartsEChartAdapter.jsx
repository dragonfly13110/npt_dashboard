import { Children, isValidElement } from 'react';
import EChart from '../widgets/EChart';

const BASE_COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff7875', '#9254de', '#13c2c2', '#fa8c16', '#8c8c8c'];

const roleOf = (node) => node?.type?.chartRole || node?.type?.displayName || node?.type?.name;

const flattenChildren = (children) => Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === Symbol.for('react.fragment')) return flattenChildren(child.props.children);
    return [child];
});

const childrenByRole = (children, role) => flattenChildren(children).filter((child) => roleOf(child) === role);

const formatNumber = (value) => {
    if (typeof value === 'number') return value.toLocaleString();
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : value;
};

const normalizeRadius = (value, fallback) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return `${Math.max(8, Math.min(90, value / 1.6))}%`;
    return fallback;
};

const axisTextStyle = (tick = {}) => ({
    color: tick.fill || '#667085',
    fontSize: tick.fontSize || 12,
});

const baseTooltip = {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    padding: [10, 14],
    extraCssText: 'box-shadow: 0 4px 12px rgba(15,23,42,0.12);',
    confine: true,
};

const marker = (color) => `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:8px;height:8px;background:${color};"></span>`;

function applyFormatter(formatter, value, name, item) {
    if (typeof formatter !== 'function') return { value: formatNumber(value), name };
    const result = formatter(value, name, item);
    if (Array.isArray(result)) return { value: result[0], name: result[1] || name };
    return { value: result, name };
}

function makeAxisTooltip(tooltipProps = {}) {
    return {
        ...baseTooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter(params) {
            const rows = Array.isArray(params) ? params : [params];
            const title = rows[0]?.axisValueLabel || rows[0]?.name || '';
            const lines = rows
                .filter((item) => item.value !== null && item.value !== undefined)
                .map((item) => {
                    const formatted = applyFormatter(tooltipProps.formatter, item.value, item.seriesName, item);
                    return `<div style="margin-top:4px;color:#334155">${marker(item.color)}${formatted.name}: <b>${formatted.value}</b></div>`;
                })
                .join('');
            return `<div style="font-weight:700;color:#0f172a;margin-bottom:4px">${title}</div>${lines}`;
        },
    };
}

function makeItemTooltip(tooltipProps = {}) {
    return {
        ...baseTooltip,
        trigger: 'item',
        formatter(item) {
            const formatted = applyFormatter(tooltipProps.formatter, item.value, item.name, item);
            const percent = typeof item.percent === 'number' ? ` <span style="color:#64748b">(${item.percent}%)</span>` : '';
            return `<div style="font-weight:700;color:#0f172a;margin-bottom:4px">${item.name}</div><div style="color:#334155">${marker(item.color)}${formatted.name}: <b>${formatted.value}</b>${percent}</div>`;
        },
    };
}

function getAxis(children, role, fallback = {}) {
    return childrenByRole(children, role)[0]?.props || fallback;
}

function makeCartesianOption({ data = [], children, layout = 'horizontal', margin = {} }) {
    const nodes = flattenChildren(children);
    const xProps = getAxis(children, 'XAxis');
    const yAxes = childrenByRole(children, 'YAxis').map((child) => child.props);
    const yProps = yAxes[0] || {};
    const tooltipProps = childrenByRole(children, 'Tooltip')[0]?.props || {};
    const hasLegend = childrenByRole(children, 'Legend').length > 0;
    const hasGrid = childrenByRole(children, 'CartesianGrid').length > 0;
    const seriesNodes = nodes.filter((node) => ['Bar', 'Line', 'Area'].includes(roleOf(node)));
    const categoryKey = layout === 'vertical' ? yProps.dataKey || xProps.dataKey || 'name' : xProps.dataKey || 'name';
    const categories = data.map((item) => item?.[categoryKey] ?? item?.name ?? '');

    const series = seriesNodes.map((node, index) => {
        const props = node.props || {};
        const role = roleOf(node);
        const cells = childrenByRole(props.children, 'Cell');
        const common = {
            name: props.name || props.dataKey,
            data: data.map((item, itemIndex) => {
                const value = item?.[props.dataKey] ?? 0;
                const fill = cells[itemIndex]?.props?.fill;
                return fill ? { value, itemStyle: { color: fill } } : value;
            }),
            itemStyle: {
                color: props.fill || props.stroke || BASE_COLORS[index % BASE_COLORS.length],
                borderRadius: role === 'Bar' ? (props.radius || [4, 4, 0, 0]) : 0,
            },
            yAxisIndex: props.yAxisId && yAxes.length > 1 ? Math.max(0, yAxes.findIndex((axis) => axis.yAxisId === props.yAxisId || axis.id === props.yAxisId)) : 0,
        };
        if (role === 'Line') {
            return {
                ...common,
                type: 'line',
                smooth: props.type === 'monotone' || props.smooth !== false,
                symbol: props.dot === false ? 'none' : 'circle',
                lineStyle: { width: props.strokeWidth || 2, color: props.stroke || common.itemStyle.color },
                itemStyle: { color: props.stroke || common.itemStyle.color },
            };
        }
        if (role === 'Area') {
            return {
                ...common,
                type: 'line',
                smooth: props.type === 'monotone' || props.smooth !== false,
                symbol: props.dot === false ? 'none' : 'circle',
                lineStyle: { width: props.strokeWidth || 2, color: props.stroke || common.itemStyle.color },
                itemStyle: { color: props.stroke || props.fill || common.itemStyle.color },
                areaStyle: {
                    color: typeof props.fill === 'string' && props.fill.startsWith('url(')
                        ? (props.stroke || common.itemStyle.color)
                        : (props.fill || props.stroke || common.itemStyle.color),
                    opacity: props.fillOpacity ?? 0.18,
                },
            };
        }
        return {
            ...common,
            type: 'bar',
            stack: props.stackId,
            barMaxWidth: props.maxBarSize || 48,
        };
    });

    const valueAxis = (axisProps = {}, index = 0) => ({
        type: 'value',
        min: Array.isArray(axisProps.domain) ? axisProps.domain[0] : undefined,
        max: Array.isArray(axisProps.domain) ? axisProps.domain[1] : undefined,
        splitLine: { lineStyle: { color: '#eef2f7', type: hasGrid ? 'dashed' : 'solid' } },
        axisLabel: { color: '#667085', fontSize: 12, formatter: axisProps.tickFormatter },
        axisLine: { show: !!axisProps.axisLine },
        axisTick: { show: axisProps.tickLine !== false },
        position: axisProps.orientation || (index === 1 ? 'right' : 'left'),
    });

    const categoryAxis = (axisProps = {}) => ({
        type: 'category',
        data: categories,
        axisLabel: {
            ...axisTextStyle(axisProps.tick),
            rotate: axisProps.angle ? Math.abs(axisProps.angle) : 0,
            interval: axisProps.interval === 0 ? 0 : 'auto',
        },
        axisLine: { lineStyle: { color: axisProps.axisLine?.stroke || '#e2e8f0' } },
        axisTick: { show: axisProps.tickLine !== false },
    });

    return {
        color: BASE_COLORS,
        tooltip: makeAxisTooltip(tooltipProps),
        legend: hasLegend ? { bottom: 0, type: 'scroll', textStyle: { color: '#475569', fontSize: 12 } } : undefined,
        grid: {
            top: margin.top ?? 16,
            right: margin.right ?? 18,
            bottom: hasLegend ? 44 : (margin.bottom ?? 28),
            left: margin.left ?? 48,
            containLabel: true,
        },
        xAxis: layout === 'vertical' ? valueAxis(xProps) : categoryAxis(xProps),
        yAxis: layout === 'vertical'
            ? categoryAxis(yProps)
            : (yAxes.length > 1 ? yAxes.map(valueAxis) : valueAxis(yProps)),
        series,
    };
}

function makePieOption({ children }) {
    const pieProps = childrenByRole(children, 'Pie')[0]?.props || {};
    const tooltipProps = childrenByRole(children, 'Tooltip')[0]?.props || {};
    const hasLegend = childrenByRole(children, 'Legend').length > 0;
    const cells = childrenByRole(pieProps.children, 'Cell');
    const dataKey = pieProps.dataKey || 'value';
    const nameKey = pieProps.nameKey || 'name';
    const data = (pieProps.data || []).map((item, index) => ({
        name: item?.[nameKey] ?? item?.name ?? '',
        value: item?.[dataKey] ?? item?.value ?? 0,
        itemStyle: { color: cells[index]?.props?.fill || item?.color || BASE_COLORS[index % BASE_COLORS.length] },
    }));
    return {
        tooltip: makeItemTooltip(tooltipProps),
        legend: hasLegend ? { bottom: 0, type: 'scroll', textStyle: { color: '#475569', fontSize: 12 } } : undefined,
        series: [{
            type: 'pie',
            data,
            radius: [normalizeRadius(pieProps.innerRadius, '42%'), normalizeRadius(pieProps.outerRadius, '68%')],
            center: [pieProps.cx || '50%', pieProps.cy || '50%'],
            padAngle: pieProps.paddingAngle || 0,
            avoidLabelOverlap: true,
            label: pieProps.label === false ? { show: false } : {
                formatter: ({ name, percent }) => `${name} ${Math.round(percent)}%`,
                color: '#334155',
                fontSize: 12,
            },
            labelLine: { smooth: true, length: 10, length2: 8 },
            emphasis: { scale: true, scaleSize: 4 },
        }],
    };
}

function makeRadarOption({ data = [], children }) {
    const radarProps = childrenByRole(children, 'Radar')[0]?.props || {};
    const angleProps = childrenByRole(children, 'PolarAngleAxis')[0]?.props || {};
    const tooltipProps = childrenByRole(children, 'Tooltip')[0]?.props || {};
    const nameKey = angleProps.dataKey || 'subject';
    const valueKey = radarProps.dataKey || 'value';
    const maxValue = Math.max(1, ...data.map((item) => Number(item?.[valueKey]) || 0));
    return {
        tooltip: makeItemTooltip(tooltipProps),
        radar: {
            indicator: data.map((item) => ({ name: item?.[nameKey] ?? '', max: Math.ceil(maxValue * 1.15) })),
            splitLine: { lineStyle: { color: '#e2e8f0' } },
            axisName: { color: '#475569', fontSize: 12 },
        },
        series: [{
            type: 'radar',
            name: radarProps.name || valueKey,
            data: [{ value: data.map((item) => item?.[valueKey] ?? 0), name: radarProps.name || valueKey }],
            lineStyle: { color: radarProps.stroke || '#1677ff' },
            areaStyle: { color: radarProps.fill || '#1677ff', opacity: radarProps.fillOpacity ?? 0.18 },
            itemStyle: { color: radarProps.stroke || radarProps.fill || '#1677ff' },
        }],
    };
}

function makeTreemapOption({ data = [], dataKey = 'value', nameKey = 'name', children }) {
    const tooltipProps = childrenByRole(children, 'Tooltip')[0]?.props || {};
    const items = data.map((item, index) => ({
        name: item?.[nameKey] ?? item?.name ?? '',
        value: item?.[dataKey] ?? item?.size ?? item?.value ?? 0,
        itemStyle: { color: item?.color || BASE_COLORS[index % BASE_COLORS.length] },
        raw: item,
    }));

    return {
        tooltip: makeItemTooltip(tooltipProps),
        series: [{
            type: 'treemap',
            data: items,
            roam: false,
            nodeClick: false,
            breadcrumb: { show: false },
            top: 8,
            right: 8,
            bottom: 8,
            left: 8,
            label: {
                show: true,
                formatter: ({ name, value }) => `${name}\n${formatNumber(value)}`,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
            },
            upperLabel: { show: false },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                gapWidth: 2,
            },
            levels: [
                {
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 2,
                        gapWidth: 2,
                    },
                },
            ],
        }],
    };
}

function ChartShell({ option, style }) {
    return <EChart option={option} style={{ width: '100%', height: '100%', minHeight: 160, ...style }} />;
}

export function ResponsiveContainer({ children, width = '100%', height = '100%' }) {
    return <div style={{ width, height }}>{children}</div>;
}

export function BarChart(props) {
    return <ChartShell option={makeCartesianOption(props)} />;
}

export function LineChart(props) {
    return <ChartShell option={makeCartesianOption(props)} />;
}

export function AreaChart(props) {
    return <ChartShell option={makeCartesianOption(props)} />;
}

export function ComposedChart(props) {
    return <ChartShell option={makeCartesianOption(props)} />;
}

export function PieChart(props) {
    return <ChartShell option={makePieOption(props)} />;
}

export function RadarChart(props) {
    return <ChartShell option={makeRadarOption(props)} />;
}

export function Treemap(props) {
    return <ChartShell option={makeTreemapOption(props)} />;
}

const markerComponent = (role) => Object.assign(function MarkerComponent() {
    return null;
}, { chartRole: role });

export const Pie = markerComponent('Pie');
export const Cell = markerComponent('Cell');
export const Bar = markerComponent('Bar');
export const Line = markerComponent('Line');
export const Area = markerComponent('Area');
export const XAxis = markerComponent('XAxis');
export const YAxis = markerComponent('YAxis');
export const CartesianGrid = markerComponent('CartesianGrid');
export const Tooltip = markerComponent('Tooltip');
export const Legend = markerComponent('Legend');
export const Radar = markerComponent('Radar');
export const PolarGrid = markerComponent('PolarGrid');
export const PolarAngleAxis = markerComponent('PolarAngleAxis');
export const PolarRadiusAxis = markerComponent('PolarRadiusAxis');
