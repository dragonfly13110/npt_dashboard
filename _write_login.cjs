const fs=require("fs");
const c=fs.readFileSync("T:/web/npt_dashboard/_login_backup.jsx","utf8");
var out=c.replace(/<div className=\"login-orbs\" \/>/,"AAA").replace(/<div className=\"login-card-new\">/,"BBB");
fs.writeFileSync("T:/web/npt_dashboard/_temp_test.txt",out);
console.log("test");