// Record every game's "How to play" as an MP4.
//   node tools/record-tutorials.js http://localhost:8080 out-dir [game-id ...]
// Needs Playwright (Chromium) and ffmpeg. Videos are silent; captions are on screen.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const [base = 'http://localhost:8080', out = 'tutorial-videos', ...only] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const games = (await (await fetch(base + '/api/games')).json())
    .filter((g) => g.hasTutorial && (!only.length || only.includes(g.id)));
  const browser = await chromium.launch();
  const queue = [...games];
  const worker = async () => {
    for (let g; (g = queue.shift());) {
      const tmp = fs.mkdtempSync(path.join(out, '.rec-'));
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        recordVideo: { dir: tmp, size: { width: 1280, height: 720 } },
      });
      const page = await ctx.newPage();
      await page.goto(`${base}/host?tutorial=${g.id}`);
      await page.waitForFunction(() => document.title === 'tutorial-done', null, { timeout: 300000 });
      await ctx.close();
      const webm = fs.readdirSync(tmp).find((f) => f.endsWith('.webm'));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', path.join(tmp, webm),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart',
        path.join(out, `${g.id}.mp4`)]);
      fs.rmSync(tmp, { recursive: true });
      console.log('recorded', g.id);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await browser.close();
})();
