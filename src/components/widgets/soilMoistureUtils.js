const MOISTURE_KEYS = [
    'soil_moisture_0_to_1cm',
    'soil_moisture_3_to_9cm',
    'soil_moisture_9_to_27cm',
    'soil_moisture_27_to_81cm',
];

const TEMPERATURE_KEYS = [
    'soil_temp_surface',
    'soil_temp_deep',
];

const CURRENT_KEYS = [...MOISTURE_KEYS, ...TEMPERATURE_KEYS];

function averageNumbers(values) {
    const valid = values.filter(value => typeof value === 'number' && !Number.isNaN(value));
    if (valid.length === 0) return null;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function averageSeries(seriesList, valueKeys) {
    if (!seriesList.length) return [];

    const maxLength = Math.max(...seriesList.map(series => series.length));

    return Array.from({ length: maxLength }, (_, index) => {
        const sample = seriesList.find(series => series[index]);
        if (!sample) return null;

        const averaged = { ...sample[index] };
        valueKeys.forEach(key => {
            averaged[key] = averageNumbers(seriesList.map(series => series[index]?.[key] ?? null));
        });
        return averaged;
    }).filter(Boolean);
}

export function parseSoilResponse(json, now = new Date()) {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
    });
    const nowStr = formatter.format(now).replace(' ', 'T');
    let idx = json.hourly.time.findIndex(time => time.startsWith(nowStr));
    if (idx === -1) idx = Math.max(0, json.hourly.time.length - 25);

    const current = {
        soil_moisture_0_to_1cm: json.hourly.soil_moisture_0_to_1cm[idx],
        soil_moisture_3_to_9cm: json.hourly.soil_moisture_3_to_9cm[idx],
        soil_moisture_9_to_27cm: json.hourly.soil_moisture_9_to_27cm[idx],
        soil_moisture_27_to_81cm: json.hourly.soil_moisture_27_to_81cm[idx],
        soil_temp_surface: json.hourly.soil_temperature_0cm?.[idx],
        soil_temp_deep: json.hourly.soil_temperature_18cm?.[idx],
        time: json.hourly.time[idx],
    };

    const trend = [];
    for (let i = 0; i < 12; i++) {
        const targetIndex = idx + i;
        if (targetIndex < json.hourly.time.length) {
            trend.push({
                time: `${new Date(json.hourly.time[targetIndex]).getHours()}:00`,
                value: json.hourly.soil_moisture_0_to_1cm[targetIndex] ?? 0,
            });
        }
    }

    const history = [];
    const startIdx = Math.max(0, idx - (7 * 24));
    for (let i = startIdx; i <= idx; i += 6) {
        const time = new Date(json.hourly.time[i]);
        history.push({
            label: `${time.getDate()}/${time.getMonth() + 1}`,
            surface: json.hourly.soil_moisture_0_to_1cm[i] ?? 0,
            root: json.hourly.soil_moisture_9_to_27cm[i] ?? 0,
            deep: json.hourly.soil_moisture_27_to_81cm[i] ?? 0,
        });
    }

    return { current, trend, history };
}

export function aggregateZoneData(zoneName, pointDataList) {
    const validPoints = pointDataList.filter(Boolean);
    if (!validPoints.length) return null;

    const current = {};
    CURRENT_KEYS.forEach(key => {
        current[key] = averageNumbers(validPoints.map(point => point.current?.[key] ?? null));
    });
    current.time = validPoints[0].current?.time ?? null;

    return {
        zoneName,
        pointCount: validPoints.length,
        current,
        trend: averageSeries(validPoints.map(point => point.trend || []), ['value']),
        history: averageSeries(validPoints.map(point => point.history || []), ['surface', 'root', 'deep']),
    };
}

export function aggregateDistrictData(zoneDataList) {
    const validZones = zoneDataList.filter(Boolean);
    if (!validZones.length) return null;

    const current = {};
    CURRENT_KEYS.forEach(key => {
        current[key] = averageNumbers(validZones.map(zone => zone.current?.[key] ?? null));
    });
    current.time = validZones[0].current?.time ?? null;

    return {
        zoneCount: validZones.length,
        pointCount: validZones.reduce((sum, zone) => sum + (zone.pointCount || 0), 0),
        current,
        trend: averageSeries(validZones.map(zone => zone.trend || []), ['value']),
        history: averageSeries(validZones.map(zone => zone.history || []), ['surface', 'root', 'deep']),
    };
}
