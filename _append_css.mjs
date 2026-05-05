import fs from "fs";
const a=[];
a.push("");
a.push(".login-card-new { width: 440px; background: linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(22,27,34,0.88) 100%); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 48px 44px 36px; z-index: 1; box-shadow: 0 30px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.03) inset; position: relative; overflow: hidden; }");
a.push(".login-card-new::before { content: ""; position: absolute; top: 0; left: -100%; width: 80%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.015), transparent); animation: loginShimmer 6s ease-in-out infinite; z-index: 0; }");
a.push(".login-card-new::after { content: ""; position: absolute; top: 0; left: 30px; right: 30px; height: 1px; background: linear-gradient(90deg, transparent, rgba(26,127,55,0.25), rgba(26,127,55,0.08), transparent); }");
a.push(".login-card-content { position: relative; z-index: 1; }");
fs.appendFileSync("T:/web/npt_dashboard/src/styles/login.css", a.join("\n"));
console.log("done");
