const fs=require("fs");
var c=fs.readFileSync("T:/web/npt_dashboard/src/pages/Login.jsx","utf8");
c=c.replace("login-bg-pattern","login-orbs");
c=c.replace("login-card-new","login-card-newX");
fs.writeFileSync("T:/web/npt_dashboard/src/pages/Login.jsx",c);
console.log("done");
