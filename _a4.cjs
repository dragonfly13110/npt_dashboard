const fs=require('fs');
const a=[
'',
'.login-submit-btn { height: 50px !important; font-size: 16px !important; font-weight: 700 !important; border-radius: 12px !important; background: linear-gradient(135deg, #1a7f37 0%, #2da44e 100%) !important; border: none !important; box-shadow: 0 4px 15px rgba(26,127,55,0.35) !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; letter-spacing: 0.3px; position: relative; overflow: hidden; animation: loginGlow 3s ease-in-out infinite; }',
'.login-submit-btn::before { content: ""; position: absolute; inset: 0; border-radius: 12px; background: linear-gradient(135deg, transparent, rgba(255,255,255,0.08), transparent); opacity: 0; transition: opacity 0.3s; }',
'.login-submit-btn:hover::before { opacity: 1; }',
'.login-submit-btn:hover { background: linear-gradient(135deg, #1d8a3d 0%, #34b854 100%) !important; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(26,127,55,0.5), 0 0 30px rgba(26,127,55,0.15) !important; }',
'.login-submit-btn:active { transform: translateY(0); }',
'',
'.guest-btn { height: 44px !important; font-size: 14px !important; font-weight: 500 !important; border-radius: 12px !important; background: transparent !important; border: 1px solid rgba(26,127,55,0.18) !important; color: #2da44e !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }',
'.guest-btn:hover { background: rgba(26,127,55,0.06) !important; border-color: rgba(26,127,55,0.35) !important; color: #3fb950 !important; transform: translateY(-1px); box-shadow: 0 4px 15px rgba(26,127,55,0.1) !important; }',
'',
'.login-footer { text-align: center; margin-top: 28px; position: relative; z-index: 1; }',
'.login-footer a { color: #6e7681; font-size: 14px; text-decoration: none; transition: all 0.25s; display: inline-flex; align-items: center; }',
'.login-footer a:hover { color: #c9d1d9; transform: translateX(-4px); }',
];
fs.appendFileSync('T:/web/npt_dashboard/src/styles/login.css',a.join('\n'));
console.log('done');
