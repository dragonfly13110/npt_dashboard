import fs from 'node:fs';
import path from 'node:path';
import utm from 'utm';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(
  ROOT,
  'data',
  'raw',
  'ldd',
  'sr_npt',
  'นครปฐม',
  'Soil_จ.นครปฐม'
);
const SHP_PATH = path.join(SOURCE_DIR, 'Soil_จ.นครปฐม.shp');
const DBF_PATH = path.join(SOURCE_DIR, 'Soil_จ.นครปฐม.dbf');
const OUTPUT_DIR = path.join(ROOT, 'public', 'gis', 'soil');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'nakhon-pathom-soil-series.geojson');

const decoder = new TextDecoder('windows-874');

function readDbf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = [];

  for (let offset = 32; offset < headerLength - 1; offset += 32) {
    if (buffer[offset] === 0x0d) break;
    const rawName = buffer.subarray(offset, offset + 11);
    const nullIndex = rawName.indexOf(0);
    const name = decoder
      .decode(nullIndex >= 0 ? rawName.subarray(0, nullIndex) : rawName)
      .trim();
    fields.push({
      name,
      type: String.fromCharCode(buffer[offset + 11]),
      length: buffer[offset + 16],
      decimals: buffer[offset + 17],
    });
  }

  const records = [];
  for (let i = 0; i < recordCount; i += 1) {
    const recordOffset = headerLength + i * recordLength;
    if (buffer[recordOffset] === 0x2a) continue;
    let fieldOffset = recordOffset + 1;
    const record = {};

    for (const field of fields) {
      const raw = buffer.subarray(fieldOffset, fieldOffset + field.length);
      const text = decoder.decode(raw).trim();
      fieldOffset += field.length;

      if (!text) {
        record[field.name] = null;
      } else if (field.type === 'N' || field.type === 'F') {
        const value = Number(text);
        record[field.name] = Number.isFinite(value) ? value : text;
      } else {
        record[field.name] = text;
      }
    }

    records.push(record);
  }

  return records;
}

function readShpPolygons(filePath) {
  const buffer = fs.readFileSync(filePath);
  const fileShapeType = buffer.readInt32LE(32);
  if (![5, 15, 25].includes(fileShapeType)) {
    throw new Error(`Unsupported shapefile type: ${fileShapeType}`);
  }

  const polygons = [];
  let offset = 100;

  while (offset < buffer.length) {
    const recordNumber = buffer.readInt32BE(offset);
    const contentLengthBytes = buffer.readInt32BE(offset + 4) * 2;
    const contentOffset = offset + 8;
    const shapeType = buffer.readInt32LE(contentOffset);

    if (shapeType === 0) {
      polygons.push(null);
      offset += 8 + contentLengthBytes;
      continue;
    }

    if (![5, 15, 25].includes(shapeType)) {
      throw new Error(
        `Unsupported record shape type ${shapeType} at record ${recordNumber}`
      );
    }

    const numParts = buffer.readInt32LE(contentOffset + 36);
    const numPoints = buffer.readInt32LE(contentOffset + 40);
    const partsOffset = contentOffset + 44;
    const pointsOffset = partsOffset + numParts * 4;
    const parts = [];

    for (let i = 0; i < numParts; i += 1) {
      parts.push(buffer.readInt32LE(partsOffset + i * 4));
    }

    const utmPoints = [];
    const points = [];
    for (let i = 0; i < numPoints; i += 1) {
      const pointOffset = pointsOffset + i * 16;
      const easting = buffer.readDoubleLE(pointOffset);
      const northing = buffer.readDoubleLE(pointOffset + 8);
      const { latitude, longitude } = utm.toLatLon(easting, northing, 47, 'N');
      utmPoints.push([easting, northing]);
      points.push([roundCoordinate(longitude), roundCoordinate(latitude)]);
    }

    const rings = parts.map((start, index) => {
      const end = parts[index + 1] ?? points.length;
      return points.slice(start, end);
    });
    const utmRings = parts.map((start, index) => {
      const end = parts[index + 1] ?? utmPoints.length;
      return utmPoints.slice(start, end);
    });

    polygons.push({
      geometry: ringsToPolygonGeometry(rings),
      areaSqm: Math.abs(
        utmRings.reduce((sum, ring) => sum + ringArea(ring), 0)
      ),
    });
    offset += 8 + contentLengthBytes;
  }

  return polygons;
}

function roundCoordinate(value) {
  return Math.round(value * 1e7) / 1e7;
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function ringsToPolygonGeometry(rings) {
  if (rings.length <= 1) {
    return { type: 'Polygon', coordinates: rings };
  }

  const polygons = [];
  for (const ring of rings) {
    const isHole = ringArea(ring) > 0;
    if (!isHole || polygons.length === 0) {
      polygons.push([ring]);
    } else {
      polygons[polygons.length - 1].push(ring);
    }
  }

  if (polygons.length === 1) {
    return { type: 'Polygon', coordinates: polygons[0] };
  }
  return { type: 'MultiPolygon', coordinates: polygons };
}

function main() {
  const properties = readDbf(DBF_PATH);
  const geometries = readShpPolygons(SHP_PATH);
  const features = geometries
    .map((geometry, index) => {
      if (!geometry) return null;
      const areaRai = geometry.areaSqm / 1600;
      return {
        type: 'Feature',
        properties: {
          ...(properties[index] || {}),
          area_sqm: Math.round(geometry.areaSqm),
          area_rai: Math.round(areaRai * 100) / 100,
        },
        geometry: geometry.geometry,
      };
    })
    .filter(Boolean);

  const collection = {
    type: 'FeatureCollection',
    name: 'ldd_soil_series_nakhon_pathom_2561',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    metadata: {
      source: 'Land Development Department (LDD), Thailand',
      source_dataset: 'Soil Series, Nakhon Pathom',
      source_file: 'sr_npt.rar',
      original_projection: 'WGS 1984 UTM Zone 47N',
      scale: '1:25,000',
      production_year_be: 2561,
    },
    features,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collection));
  const sizeMb = fs.statSync(OUTPUT_PATH).size / 1024 / 1024;
  console.log(
    `Wrote ${features.length} features to ${OUTPUT_PATH} (${sizeMb.toFixed(2)} MB)`
  );
}

main();
