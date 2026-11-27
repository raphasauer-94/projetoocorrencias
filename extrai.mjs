import fs from "node:fs";
const html = fs.readFileSync(process.argv[2], "utf8");
const i = html.lastIndexOf("<script>");
const j = html.indexOf("</script>", i);
fs.writeFileSync(process.argv[3], html.slice(i + 8, j));
console.log("ok");