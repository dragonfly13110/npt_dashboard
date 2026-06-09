import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  filterSubdistrictGeojsonByProvince,
  NAKHON_PATHOM_PROVINCE_CODE,
} from '../src/utils/geojsonBoundaries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_URL =
  'https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/subdistricts.geojson';
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const OUT_FILE = path.join(DATA_DIR, 'nakhon_pathom_subdistricts.json');

function downloadJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`));
          res.resume();
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Invalid JSON from source: ${error.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

const source = await downloadJson(SOURCE_URL);
const filtered = filterSubdistrictGeojsonByProvince(
  source,
  NAKHON_PATHOM_PROVINCE_CODE
);

if (!filtered.features.length) {
  throw new Error('No Nakhon Pathom subdistrict features found');
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(filtered));

const sizeKb = Math.round(fs.statSync(OUT_FILE).size / 1024);
console.log(
  `Saved ${filtered.features.length} subdistrict boundaries to ${OUT_FILE} (${sizeKb} KB)`
);
