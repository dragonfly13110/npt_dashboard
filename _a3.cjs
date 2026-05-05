const fs=require('fs');
const a=[
'',
'.google-btn { height: 50px !important; font-size: 15px !important; font-weight: 600 !important; border-radius: 12px !important; background: #fff !important; border: none !important; color: #1a1a2e !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 10px !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05) !important; position: relative; overflow: hidden; }',
'.google-btn::after { content: ""; position: absolute; inset: 0; border-radius: 12px; background: linear-gradient(135deg, rgba(66,133,244,0.1), rgba(234,67,53,0.04), rgba(251,188,5,0.08)); opacity: 0; transition: opacity 0.3s; }',
'.google-btn:hover::after { opacity: 1; }',
'.google-btn:hover { background: #fafafa !important; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.35), 0 0 20px rgba(66,133,244,0.08) !important; }',
'.google-btn:active { transform: translateY(0); }',
'.google-btn .anticon { font-size: 20px !important; }',
];
fs.appendFileSync('T:/web/npt_dashboard/src/styles/login.css',a.join('\n'));
console.log('done');
