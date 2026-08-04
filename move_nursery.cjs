const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf-8');

// Find the start of the function
const startPattern = "  function getNurseryReportCardHtml(";
const startIndex = content.indexOf(startPattern);

if (startIndex === -1) {
    console.error("Could not find function getNurseryReportCardHtml");
    process.exit(1);
}

// Find the end of the function by counting braces
let openBraces = 0;
let endIndex = -1;
let started = false;

for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
        openBraces++;
        started = true;
    } else if (content[i] === '}') {
        openBraces--;
    }

    if (started && openBraces === 0) {
        endIndex = i;
        break;
    }
}

if (endIndex === -1) {
    console.error("Could not find the end of function getNurseryReportCardHtml");
    process.exit(1);
}

// We might have an extra semicolon if it was previously a const
let finalEndIndex = endIndex + 1;
if (content[finalEndIndex] === ';') {
    finalEndIndex++;
}

const functionBody = content.substring(startIndex, finalEndIndex);
const newContent = content.substring(0, startIndex) + content.substring(finalEndIndex);

// Find export default function App() {
const appStartIndex = newContent.indexOf("export default function App() {");
if (appStartIndex === -1) {
    console.error("Could not find export default function App() {");
    process.exit(1);
}

// Re-insert it right above App
const finalContent = newContent.substring(0, appStartIndex) + "\n" + functionBody.replace(/^  /gm, "") + "\n\n" + newContent.substring(appStartIndex);

fs.writeFileSync('src/App.tsx', finalContent, 'utf-8');
console.log("Successfully moved getNurseryReportCardHtml outside of App!");
