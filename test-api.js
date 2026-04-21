const API_KEY = 'AIzaSyDP_9fVV6MDd3jv-2RVkkqAb5Vncet8DkU';
const MODEL = 'gemma-4-31b-it';

async function testGeminiOnly() {
    console.log(`\n🔎 กำลังทดสอบโมเดล: ${MODEL} (โหมดต่อเน็ตเท่านั้น)...`);
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: 'สรุปราคาหมูวันนี้ล่าสุดในไทยให้หน่อย (ระบุวันที่สำรวจ)' }]
                }],
                tools: [{ googleSearch: {} }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error(`❌ Error: ${data.error.code} - ${data.error.message}`);
            return;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ [คำตอบจาก ${MODEL}]:\n${text}`);

    } catch (error) {
        console.error(`❌ Fetch Error: ${error.message}`);
    }
}

testGeminiOnly();
