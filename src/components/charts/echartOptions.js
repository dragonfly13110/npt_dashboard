const FALLBACK_COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff7875', '#9254de', '#13c2c2', '#fa8c16', '#8c8c8c'];

export const CROP_COLORS = {
    'ข้าวนาปี': '#eab308',
    'ข้าวนาปรัง': '#f59e0b',
    'พืชไร่': '#b45309',
    'พืชสวน': '#10b981',
    'ไม้ผลไม้ยืนต้น': '#047857',
    'ไม้ผล/ไม้ยืนต้น': '#047857',
    'พืชผัก': '#34d399',
    'ไม้ดอกไม้ประดับ': '#ec4899',
    'ไม้ดอก/ไม้ประดับ': '#ec4899',
    'สมุนไพรเครื่องเทศ': '#8b5cf6',
    'สมุนไพร/เครื่องเทศ': '#8b5cf6'
};

export function getCropColor(cropName) {
    if (!cropName) return '#656d76';
    const name = cropName.trim();
    
    // Direct matches
    if (CROP_COLORS[name]) return CROP_COLORS[name];
    if (CROP_COLORS[name.replace('/', '')]) return CROP_COLORS[name.replace('/', '')];

    // Smart substring matching
    if (name.includes('ข้าวเจ้า') || name === 'ข้าว') {
        return CROP_COLORS['ข้าวนาปี']; // #eab308
    }
    if (name.includes('ข้าว') && name.includes('ผัก')) {
        return '#0ea5e9'; // Special cyan/blue for mixed crop
    }
    if (name.includes('อ้อย') || name.includes('ข้าวโพด') || name.includes('มันสำปะหลัง') || name.includes('พืชไร่')) {
        return CROP_COLORS['พืชไร่']; // #b45309
    }
    if (name.includes('ผัก') || name.includes('คะน้า') || name.includes('กุยช่าย') || name.includes('ถั่วฝักยาว') || name.includes('บัวบก') || name.includes('มะเขือ') || name.includes('หน่อไม้ฝรั่ง')) {
        return CROP_COLORS['พืชผัก']; // #34d399
    }
    if (name.includes('กระชาย') || name.includes('พืชสวน')) {
        return CROP_COLORS['พืชสวน']; // #10b981
    }
    if (name.includes('ฝรั่ง') || name.includes('มะม่วง') || name.includes('ส้มโอ') || name.includes('กล้วย') || name.includes('มะพร้าว') || name.includes('อินทผาลัม') || name.includes('ชมพู่') || name.includes('ลำไย') || name.includes('ไม้ผล') || name.includes('ไม้ยืนต้น')) {
        return CROP_COLORS['ไม้ผลไม้ยืนต้น']; // #047857
    }
    if (name.includes('ดอก') || name.includes('ประดับ') || name.includes('กล้วยไม้') || name.includes('ไทร')) {
        return CROP_COLORS['ไม้ดอกไม้ประดับ']; // #ec4899
    }
    if (name.includes('สมุนไพร') || name.includes('เครื่องเทศ') || name.includes('ขิง') || name.includes('ข่า')) {
        return CROP_COLORS['สมุนไพรเครื่องเทศ']; // #8b5cf6
    }
    
    return '#656d76';
}

export const compactGrid = {
    top: 18,
    right: 18,
    bottom: 32,
    left: 48,
    containLabel: true,
};

export function formatValue(value, digits = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return value ?? '-';
    return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatCompactValue(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return value ?? '-';
    const absVal = Math.abs(number);
    if (absVal >= 1e6) {
        return `${(number / 1e6).toLocaleString(undefined, { maximumFractionDigits: digits })} ล้าน`;
    }
    if (absVal >= 1e3) {
        return `${(number / 1e3).toLocaleString(undefined, { maximumFractionDigits: digits })} พัน`;
    }
    return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

const dot = (color) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></span>`;

function htmlTooltipTitle(title) {
    return `<div style="font-weight:700;color:#0f172a;margin-bottom:6px">${title || ''}</div>`;
}

export function pieOption(data, {
    colors = FALLBACK_COLORS,
    unit = '',
    digits = 0,
    radius = ['42%', '68%'],
    center = ['50%', '50%'],
    legend = false,
} = {}) {
    return {
        color: colors,
        tooltip: {
            trigger: 'item',
            formatter: (item) => {
                const value = formatValue(item.value, digits);
                return `${htmlTooltipTitle(item.name)}<div style="color:#334155">${dot(item.color)}จำนวน: <b>${value}${unit ? ` ${unit}` : ''}</b> <span style="color:#64748b">(${item.percent}%)</span></div>`;
            },
        },
        legend: legend ? {
            type: 'scroll',
            orient: legend === 'right' ? 'vertical' : 'horizontal',
            right: legend === 'right' ? 4 : undefined,
            top: legend === 'right' ? 'middle' : undefined,
            bottom: legend === 'right' ? undefined : 0,
            textStyle: { color: '#475569', fontSize: 12 },
        } : undefined,
        series: [{
            type: 'pie',
            data: data.map((item, index) => ({
                ...item,
                itemStyle: { color: item.color || colors[index % colors.length] },
            })),
            radius,
            center,
            padAngle: 2,
            avoidLabelOverlap: true,
            label: {
                formatter: ({ name, percent }) => `${name} ${Math.round(percent)}%`,
                color: '#334155',
                fontSize: 12,
            },
            labelLine: { smooth: true, length: 10, length2: 8 },
        }],
    };
}

export function barOption(data, series, {
    categoryKey = 'name',
    layout = 'horizontal',
    colors = FALLBACK_COLORS,
    unit = '',
    digits = 0,
    legend = series.length > 1,
    stacked = false,
    totalKey,
    grid = {},
    rotate = 0,
    compact = false,
} = {}) {
    const categoryData = data.map((item) => item[categoryKey] ?? item.name ?? '');
    const normalizedSeries = series.map((entry, index) => {
        const config = typeof entry === 'string' ? { key: entry, name: entry } : entry;
        return {
            type: 'bar',
            name: config.name || config.key,
            data: data.map((item, itemIndex) => {
                const value = item[config.key] ?? 0;
                const color = typeof config.color === 'function'
                    ? config.color(item, itemIndex)
                    : (config.color || item.color || colors[index % colors.length]);
                return { value, itemStyle: { color } };
            }),
            stack: stacked ? 'total' : config.stack,
            barMaxWidth: config.maxBarSize || (layout === 'vertical' ? 28 : 48),
            itemStyle: { borderRadius: layout === 'vertical' ? [0, 6, 6, 0] : [6, 6, 0, 0] },
        };
    });

    const valueAxis = {
        type: 'value',
        axisLabel: { formatter: (value) => compact ? formatCompactValue(value, digits) : formatValue(value, digits), color: '#667085', fontSize: 12 },
        splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
    };
    const categoryAxis = {
        type: 'category',
        data: categoryData,
        axisLabel: { color: '#667085', fontSize: 12, rotate },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
    };

    return {
        color: colors,
        tooltip: axisTooltip({ unit, digits, totalKey }),
        legend: legend ? { type: 'scroll', bottom: 0, textStyle: { color: '#475569', fontSize: 12 } } : undefined,
        grid: { ...compactGrid, bottom: legend ? 48 : compactGrid.bottom, ...grid },
        xAxis: layout === 'vertical' ? valueAxis : categoryAxis,
        yAxis: layout === 'vertical' ? categoryAxis : valueAxis,
        series: normalizedSeries,
    };
}

export function comboOption(data, series, options = {}) {
    const base = barOption(data, series.map((entry) => ({ ...entry, type: undefined })), options);
    return {
        ...base,
        series: series.map((entry, index) => {
            if (entry.type === 'line') {
                return {
                    type: 'line',
                    name: entry.name || entry.key,
                    data: data.map((item) => item[entry.key] ?? 0),
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: { color: entry.color || options.colors?.[index] || FALLBACK_COLORS[index], width: 3 },
                    itemStyle: { color: entry.color || options.colors?.[index] || FALLBACK_COLORS[index] },
                };
            }
            return base.series[index];
        }),
    };
}

export function areaOption(data, series, {
    categoryKey = 'name',
    colors = FALLBACK_COLORS,
    unit = '',
    digits = 0,
    rotate = 0,
    compact = false,
} = {}) {
    return {
        color: colors,
        tooltip: axisTooltip({ unit, digits }),
        legend: { type: 'scroll', bottom: 0, textStyle: { color: '#475569', fontSize: 12 } },
        grid: { ...compactGrid, bottom: 54 },
        xAxis: {
            type: 'category',
            data: data.map((item) => item[categoryKey] ?? item.name ?? ''),
            axisLabel: { color: '#667085', fontSize: 12, rotate },
            axisLine: { lineStyle: { color: '#e2e8f0' } },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: (value) => compact ? formatCompactValue(value, digits) : formatValue(value, digits), color: '#667085', fontSize: 12 },
            splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
            axisLine: { show: false },
            axisTick: { show: false },
        },
        series: series.map((entry, index) => ({
            type: 'line',
            name: entry.name || entry.key,
            data: data.map((item) => item[entry.key] ?? 0),
            smooth: true,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { color: entry.color || colors[index % colors.length], width: 2.5 },
            itemStyle: { color: entry.color || colors[index % colors.length] },
            areaStyle: { color: entry.color || colors[index % colors.length], opacity: entry.opacity ?? 0.14 },
        })),
    };
}

export function radarOption(data, {
    name = 'value',
    labelKey = 'subject',
    valueKey = 'value',
    color = '#1677ff',
    max = null,
} = {}) {
    const maxValue = max || Math.max(1, ...data.map((item) => Number(item[valueKey]) || 0));
    return {
        tooltip: {
            trigger: 'item',
            formatter: (item) => {
                const rows = data.map((row, index) => `<div style="margin-top:4px;color:#334155">${row[labelKey]}: <b>${formatValue(item.value[index], 0)}</b></div>`).join('');
                return `${htmlTooltipTitle(name)}${rows}`;
            },
        },
        radar: {
            indicator: data.map((item) => ({ name: item[labelKey], max: maxValue })),
            splitLine: { lineStyle: { color: '#e2e8f0' } },
            axisName: { color: '#475569', fontSize: 12 },
        },
        series: [{
            type: 'radar',
            data: [{ value: data.map((item) => item[valueKey] ?? 0), name }],
            lineStyle: { color, width: 2.5 },
            areaStyle: { color, opacity: 0.2 },
            itemStyle: { color },
        }],
    };
}

export function treemapOption(data, {
    colors = FALLBACK_COLORS,
    valueKey = 'size',
    unit = '',
} = {}) {
    return {
        tooltip: {
            trigger: 'item',
            formatter: (item) => `${htmlTooltipTitle(item.name)}<div style="color:#334155">${dot(item.color)}จำนวน: <b>${formatValue(item.value, 0)}${unit ? ` ${unit}` : ''}</b></div>`,
        },
        series: [{
            type: 'treemap',
            data: data.map((item, index) => ({
                name: item.name,
                value: item[valueKey] ?? item.value ?? 0,
                itemStyle: { color: item.color || colors[index % colors.length] },
            })),
            roam: false,
            nodeClick: false,
            breadcrumb: { show: false },
            top: 8,
            right: 8,
            bottom: 8,
            left: 8,
            label: {
                formatter: ({ name, value }) => `${name}\n${formatValue(value, 0)}`,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
            },
            itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2, borderRadius: 6 },
        }],
    };
}

function axisTooltip({ unit = '', digits = 0, totalKey } = {}) {
    return {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(15,23,42,0.045)' } },
        formatter: (params) => {
            const rows = Array.isArray(params) ? params : [params];
            const source = rows[0]?.data || {};
            const lines = rows
                .filter((item) => item.value !== null && item.value !== undefined)
                .map((item) => `${dot(item.color)}${item.seriesName}: <b>${formatValue(item.value, digits)}${unit ? ` ${unit}` : ''}</b>`)
                .map((line) => `<div style="margin-top:4px;color:#334155">${line}</div>`)
                .join('');
            const totalLine = totalKey && source[totalKey] != null
                ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;color:#0f172a;font-weight:700">รวม: ${formatValue(source[totalKey], digits)}${unit ? ` ${unit}` : ''}</div>`
                : '';
            return `${htmlTooltipTitle(rows[0]?.axisValueLabel || rows[0]?.name)}${lines}${totalLine}`;
        },
    };
}

export function dualAxisOption(data, series, {
    categoryKey = 'name',
    rotate = 0,
    grid = {},
    legend = true,
} = {}) {
    if (series.length < 2) return areaOption(data, series, { categoryKey });
    
    const leftSeries = series[0];
    const rightSeries = series[1];
    
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(15,23,42,0.045)' } },
            formatter: (params) => {
                const rows = Array.isArray(params) ? params : [params];
                const lines = rows
                    .map((item) => `${dot(item.color)}${item.seriesName}: <b>${formatValue(item.value, 1)} ${item.seriesIndex === 0 ? 'mm' : '°C'}</b>`)
                    .map((line) => `<div style="margin-top:4px;color:#334155">${line}</div>`)
                    .join('');
                return `${htmlTooltipTitle(rows[0]?.axisValueLabel || rows[0]?.name)}${lines}`;
            }
        },
        legend: legend ? { type: 'scroll', bottom: 0, textStyle: { color: '#475569', fontSize: 12 } } : undefined,
        grid: { ...compactGrid, bottom: legend ? 48 : compactGrid.bottom, right: 48, ...grid },
        xAxis: {
            type: 'category',
            data: data.map((item) => item[categoryKey] ?? item.name ?? ''),
            axisLabel: { color: '#667085', fontSize: 12, rotate },
            axisLine: { lineStyle: { color: '#e2e8f0' } },
            axisTick: { show: false },
        },
        yAxis: [
            {
                type: 'value',
                name: leftSeries.name,
                nameTextStyle: { color: '#667085', fontSize: 11 },
                axisLabel: { formatter: (value) => `${formatValue(value, 0)} mm`, color: '#667085', fontSize: 11 },
                splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
                axisLine: { show: false },
                axisTick: { show: false },
            },
            {
                type: 'value',
                name: rightSeries.name,
                nameTextStyle: { color: '#667085', fontSize: 11 },
                axisLabel: { formatter: (value) => `${formatValue(value, 0)} °C`, color: '#667085', fontSize: 11 },
                splitLine: { show: false },
                axisLine: { show: false },
                axisTick: { show: false },
            }
        ],
        series: [
            {
                type: leftSeries.type || 'bar',
                name: leftSeries.name || leftSeries.key,
                yAxisIndex: 0,
                data: data.map((item) => item[leftSeries.key] ?? 0),
                itemStyle: { color: leftSeries.color, borderRadius: [4, 4, 0, 0] },
            },
            {
                type: 'line',
                name: rightSeries.name || rightSeries.key,
                yAxisIndex: 1,
                data: data.map((item) => item[rightSeries.key] ?? 0),
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: rightSeries.color, width: 2.5 },
                itemStyle: { color: rightSeries.color },
            }
        ]
    };
}
