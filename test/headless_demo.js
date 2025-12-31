const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const envUrl = process.env.GOL_URL || 'https://gol-conway.hopto.org/';
  const candidates = [envUrl];
  console.log('Trying URL:', envUrl);
  const browserLaunchOpts = { args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: true };
  const chromiumCandidates = [process.env.PUPPETEER_EXECUTABLE_PATH, '/usr/bin/chromium-browser', '/usr/bin/chromium'];
  for (const p of chromiumCandidates) {
    if (!p) continue;
    try { if (fs.existsSync(p)) { browserLaunchOpts.executablePath = p; break; } } catch (e) {}
  }

  const browser = await puppeteer.launch(browserLaunchOpts);
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    page.on('dialog', async dialog => {
      console.log('DIALOG type=%s message=%s', dialog.type(), dialog.message());
      try { await dialog.accept(); } catch (e) {}
    });

    // Optionally set Host header (only when explicitly requested via env)
    if (process.env.FORCE_HOST_HEADER === '1') {
      const host = process.env.GOL_HOST || new URL(candidates[0]).host || 'gol-conway.hopto.org';
      await page.setExtraHTTPHeaders({ Host: host });
    }

    let success = false;
    for (const url of candidates) {
      try {
        console.log('Opening', url);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000, ignoreHTTPSErrors: true });
        success = true;
        break;
      } catch (e) {
        console.warn('Could not open', url, String(e).slice(0,200));
      }
    }
    if (!success) throw new Error('Could not open any candidate URL');

    // Open the script playground
    await page.waitForSelector('[aria-label="script-playground"]', { timeout: 15000 });
    await page.click('[aria-label="script-playground"]');
    await page.waitForSelector('dialog, [role="dialog"], .MuiDialog-root', { timeout: 10000 });

    // Wait for the dialog title to appear (Script Playground)
    await (async () => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const present = await page.evaluate(() => {
          const hs = Array.from(document.querySelectorAll('h2'));
          return hs.some(h => (h.textContent || '').replace(/\s+/g, ' ').trim() === 'Script Playground');
        });
        if (present) break;
        await new Promise(r => setTimeout(r, 200));
      }
    })();

    // Robustly click the 'Run Square Growth Demo' button by performing an in-page DOM click with retries.
    const clicked = await page.evaluate(async () => {
      function findButton() {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => (b.innerText || b.textContent || '').replace(/\s+/g, ' ').trim().indexOf('Run Square Growth Demo') !== -1);
      }
      for (let i = 0; i < 5; i++) {
        const b = findButton();
        if (b) {
          try {
            b.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            const r = b.getBoundingClientRect();
            const cx = Math.floor(r.left + r.width/2);
            const cy = Math.floor(r.top + r.height/2);
            ['mousedown','mouseup','click'].forEach(ev => b.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy })));
            return true;
          } catch (e) {
            /* continue retrying */
          }
        }
        await new Promise(r => setTimeout(r, 250));
      }
      return false;
    });

    if (!clicked) {
      console.error('Could not find Run Square Growth Demo button (after DOM attempts)');
      // Fallback: click the primary 'Run' button in the dialog (executes the textarea script)
      const runClicked = await page.evaluate(async () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const runBtn = btns.find(b => (b.innerText || b.textContent || '').replace(/\s+/g,' ').trim() === 'Run' || (b.className || '').indexOf('MuiButton-containedPrimary') !== -1);
        if (!runBtn) return false;
        try {
          runBtn.scrollIntoView({ block: 'center' });
          const r = runBtn.getBoundingClientRect();
          const cx = Math.floor(r.left + r.width/2);
          const cy = Math.floor(r.top + r.height/2);
          ['mousedown','mouseup','click'].forEach(ev => runBtn.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy })));
          return true;
        } catch (e) { return false; }
      });
      if (runClicked) {
        console.log('Clicked fallback Run button');
      } else {
        try {
          const html = await page.content();
          const outHtml = 'C:/Users/bryan/repos/game-of-life/test/headless_failure.html';
          const outPng = 'C:/Users/bryan/repos/game-of-life/test/headless_failure.png';
          fs.writeFileSync(outHtml, html);
          await page.screenshot({ path: outPng, fullPage: true });
          console.log('Saved failure artifacts to', outHtml, outPng);
        } catch (e) {
          console.error('Error saving artifacts', e);
        }
        await browser.close();
        process.exit(2);
      }
    }

    // Wait up to 30s for the alert/dialog to appear and be handled
    await new Promise(r => setTimeout(r, 30000));
    console.log('Finished waiting; check logs above for dialog message');
    await browser.close();
  } catch (err) {
    console.error('Test error', err);
    await browser.close();
    process.exit(1);
  }
})();
