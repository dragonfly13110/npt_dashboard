const fs=require('fs');
let a=[];
a.push('.login-card-new { width: 440px; background: linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(22,27,34,0.88) 100%); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 48px 44px 36px; z-index: 1; box-shadow: 0 30px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.03) inset; position: relative; overflow: hidden; }');
fs.appendFileSync('T:/web/npt_dashboard/src/styles/login.css',a.join('\n'));
console.log('done');
