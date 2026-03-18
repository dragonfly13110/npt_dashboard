/**
 * Converts UTM coordinates (WGS84) to Latitude and Longitude.
 * Optimized for Thailand (Zone 47N/48N).
 * 
 * @param {number} easting - UTM Easting (X) in meters
 * @param {number} northing - UTM Northing (Y) in meters
 * @param {number} zone - UTM Zone (default 47 for Nakhon Pathom)
 * @param {string} hemisphere - 'N' or 'S' (default 'N')
 * @returns {object} { lat, lng }
 */
export function utmToLatLng(easting, northing, zone = 47, hemisphere = 'N') {
    if (!easting || !northing) return { lat: 0, lng: 0 };

    const northernHemisphere = hemisphere.toUpperCase() === 'N';
    let y = northing;
    if (!northernHemisphere) {
        y = 10000000 - northing;
    }

    const a = 6378137;           // WGS84 semi-major axis
    const e = 0.081819191;       // WGS84 eccentricity
    const e1sq = 0.006739497;    // WGS84 second eccentricity squared
    const k0 = 0.9996;           // UTM scale factor

    const arc = y / k0;
    const mu = arc / (a * (1 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4) / 64.0 - 5 * Math.pow(e, 6) / 256.0));

    const ei = (1 - Math.pow((1 - e * e), (1 / 2.0))) / (1 + Math.pow((1 - e * e), (1 / 2.0)));

    const ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32.0;
    const cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
    const cc = 151 * Math.pow(ei, 3) / 96;
    const cd = 1097 * Math.pow(ei, 4) / 512;
    const phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);

    const n0 = a / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (1 / 2.0));
    const r0 = a * (1 - e * e) / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (3 / 2.0));
    const fact1 = n0 * Math.tan(phi1) / r0;

    const _a1 = 500000 - easting;
    const dd0 = _a1 / (n0 * k0);
    const fact2 = dd0 * dd0 / 2;

    const t0 = Math.pow(Math.tan(phi1), 2);
    const Q0 = e1sq * Math.pow(Math.cos(phi1), 2);
    const fact3 = (5 + 3 * t0 + 10 * Q0 - 4 * Q0 * Q0 - 9 * e1sq) * Math.pow(dd0, 4) / 24;
    const fact4 = (61 + 90 * t0 + 298 * Q0 + 45 * t0 * t0 - 252 * e1sq - 3 * Q0 * Q0) * Math.pow(dd0, 6) / 720;

    const lof1 = _a1 / (n0 * k0);
    const lof2 = (1 + 2 * t0 + Q0) * Math.pow(dd0, 3) / 6.0;
    const lof3 = (5 - 2 * Q0 + 28 * t0 - 3 * Math.pow(Q0, 2) + 8 * e1sq + 24 * Math.pow(t0, 2)) * Math.pow(dd0, 5) / 120;
    const _a2 = (lof1 - lof2 + lof3) / Math.cos(phi1);
    const _a3 = _a2 * 180 / Math.PI;

    const lat = 180 * (phi1 - fact1 * (fact2 + fact3 + fact4)) / Math.PI;
    const lng = ((zone > 0) && (6 * zone - 183.0) || 3.0) - _a3;

    return {
        lat: northernHemisphere ? lat : -lat,
        lng: lng
    };
}
