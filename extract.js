const fs = require('fs');
const d = JSON.parse(fs.readFileSync('t:/web/npt_dashboard/tmp_districts.geojson'));
d.features = d.features.filter(f => f.properties.pro_th === 'นครปฐม');
fs.writeFileSync('t:/web/npt_dashboard/public/nakhon_pathom.geojson', JSON.stringify(d));
console.log('Done:', d.features.length);
