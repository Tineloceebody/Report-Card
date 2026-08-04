import fs from 'fs';

const logContent = fs.readFileSync('C:\\Users\\Edify Ghana\\.gemini\\antigravity-ide\\brain\\1dcdbe80-247f-4161-94fd-90e114411a05\\.system_generated\\tasks\\task-539.log', 'utf8');
const lines = logContent.split('\n');

console.log("WEEK 2 & 3 UPDATES FOUND IN MIGRATION LOG:");
let count = 0;
lines.forEach(line => {
  if (line.includes('weekly_reports_v1') && (line.includes('Week 2') || line.includes('Week 3') || line.includes('English') || line.includes('R. M. E') || line.includes('RME'))) {
    console.log(line);
    count++;
  }
});
console.log(`Total: ${count}`);
