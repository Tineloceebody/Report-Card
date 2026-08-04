const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // wait for the "SBA" tab button
  // In TeacherStudentReportSystem, the tabs are usually text like "SBA"
  const sbaButton = await page.$x("//button[contains(., 'SBA')]");
  if (sbaButton.length > 0) {
    console.log("Clicking SBA button...");
    await sbaButton[0].click();
    
    // Wait a bit for crash to happen
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log("Could not find SBA button");
  }

  await browser.close();
})();
