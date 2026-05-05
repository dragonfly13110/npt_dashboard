import fs from "fs";
const css = [];
css.push(".login-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #070a0e; position: relative; overflow: hidden; }");
css.push(".login-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.45; z-index: 0; }");
css.push(".login-orb--1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(26,127,55,0.18), transparent 70%); top: -15%; left: -10%; }");
css.push(".login-orb--2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(9,105,218,0.12), transparent 70%); bottom: -10%; right: -5%; }");
css.push(".login-orb--3 { width: 280px; height: 280px; background: radial-gradient(circle, rgba(45,164,78,0.1), transparent 70%); top: 50%; left: 55%; }");
fs.writeFileSync("T:/web/npt_dashboard/src/styles/login.css", css.join("\n"));
console.log("done");
