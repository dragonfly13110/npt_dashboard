const fs=require('fs');
const a=[
'.login-card-new::before { content: ""; position: absolute; top: 0; left: -100%; width: 80%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.015), transparent); animation: loginShimmer 6s ease-in-out infinite; z-index: 0; }',
'.login-card-new::after { content: ""; position: absolute; top: 0; left: 30px; right: 30px; height: 1px; background: linear-gradient(90deg, transparent, rgba(26,127,55,0.25), rgba(26,127,55,0.08), transparent); }',
'.login-card-content { position: relative; z-index: 1; }',
'',
'.login-header { text-align: center; margin-bottom: 32px; }',
'.login-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(26,127,55,0.1); border: 1px solid rgba(26,127,55,0.18); color: #2da44e; font-size: 11px; font-weight: 600; padding: 5px 14px; border-radius: 100px; margin-bottom: 20px; letter-spacing: 0.8px; }',
'.login-icon-wrap { display: inline-block; margin-bottom: 16px; animation: loginFloat 6s ease-in-out infinite; }',
'.login-icon { font-size: 48px; display: block; filter: drop-shadow(0 6px 20px rgba(26,127,55,0.4)); }',
];
fs.appendFileSync('T:/web/npt_dashboard/src/styles/login.css','\n'+a.join('\n'));
console.log('done');
