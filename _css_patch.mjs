import fs from "fs";
const css = fs.readFileSync("T:/web/npt_dashboard/src/styles/login.css", "utf8");
const n = css.replace("login-card-new { width: 420px", "login-card-new { width: 440px").replace("background: rgba(13,17,23,0.88)", "background: linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(22,27,34,0.88) 100%)").replace("border-radius: 20px", "border-radius: 24px").replace("padding: 44px 40px 32px", "padding: 48px 44px 36px").replace("box-shadow: 0 25px 80px", "box-shadow: 0 30px 100px");
fs.writeFileSync("T:/web/npt_dashboard/src/styles/login.css", n);
console.log("done");
