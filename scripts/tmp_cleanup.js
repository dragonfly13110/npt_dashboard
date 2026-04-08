const fs = require('fs');
const filesToMove = ['test_data.js', 'test_rss.js', 'test_api.json', 'extract.js', 'tmp_districts.geojson'];

// Add any files starting with C that have hotspot_old.jsx
const files = fs.readdirSync('.');
const weirdCFile = files.find(f => f.startsWith('C') && f.includes('hotspot_old.jsx'));
if (weirdCFile) {
    filesToMove.push(weirdCFile);
}

filesToMove.forEach(file => {
    if (fs.existsSync(file)) {
        fs.renameSync(file, `scripts/${file}`);
        console.log(`Moved ${file} to scripts/`);
    } else {
        console.log(`File ${file} does not exist`);
    }
});
