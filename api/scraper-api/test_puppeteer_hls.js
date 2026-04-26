const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('file:///C:/ALL FINAL PROJECTS/UNIQUE TOOLS/cinemahub-final/api/scraper-api/test_hls_direct.html');
    
    // Catch console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Wait for video to either play or error
    await page.waitForTimeout(5000);
    
    const isPlaying = await page.evaluate(() => {
        const v = document.getElementById('video');
        return v.currentTime > 0 && !v.paused && !v.ended && v.readyState > 2;
    });
    
    const currentSrc = await page.evaluate(() => document.getElementById('video').currentSrc);
    
    console.log('Video playing:', isPlaying);
    console.log('Current source:', currentSrc);
    
    await browser.close();
})();
