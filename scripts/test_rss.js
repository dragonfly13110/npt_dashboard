const fetch = require('node-fetch');

async function testRss() {
    const url = "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.prachachat.net%2Ffeed%2Fagriculture&count=6";
    const res = await fetch(url);
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}

testRss();
