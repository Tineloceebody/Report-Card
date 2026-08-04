import fs from "fs";

const content = fs.readFileSync("src/App.tsx", "utf-8");
const lines = content.split("\n");

console.log("EXHAUSTIVE SEARCH FOR 'BASIC' IN APP.TSX:");
let found = 0;
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes("basic")) {
    console.log(`${idx + 1}: ${line.trim()}`);
    found++;
  }
});
console.log(`Total occurrences found: ${found}`);
