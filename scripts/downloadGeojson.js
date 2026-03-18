import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const URL = 'https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/districts.geojson';
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const OUT_FILE = path.join(DATA_DIR, 'nakhon_pathom_districts.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('Downloading district GeoJSON from GitHub...');

https.get(URL, (res) => {
    let data = '';

    // A chunk of data has been received.
    res.on('data', (chunk) => {
        data += chunk;
    });

    // The whole response has been received.
    res.on('end', () => {
        console.log('Download complete. Parsing and filtering data...');
        try {
            const geojson = JSON.parse(data);
            
            // Filter features for Nakhon Pathom (นครปฐม)
            // Search for "นครปฐม" in any column of the properties object
            const nakhonPathomFeatures = geojson.features.filter(feature => {
                const propsString = JSON.stringify(feature.properties);
                return propsString.includes('นครปฐม');
            });

            const filteredGeojson = {
                type: 'FeatureCollection',
                features: nakhonPathomFeatures
            };

            fs.writeFileSync(OUT_FILE, JSON.stringify(filteredGeojson, null, 2));
            console.log(`Successfully saved ${nakhonPathomFeatures.length} districts to ${OUT_FILE}`);
        } catch (e) {
            console.error('Error parsing or filtering GeoJSON:', e.message);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
