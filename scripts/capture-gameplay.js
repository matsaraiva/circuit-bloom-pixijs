// The pinned Playwright CLI runs this function after video-start.
async (page) => {
  const gameUrl = page.url();
  if (new URL(gameUrl).pathname !== '/circuit-bloom-pixijs/') throw new Error('Open the local or published game URL first');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(gameUrl);
  await page.locator('#board-frame[data-status="playing"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  for (const [level, solution] of [[5, 10], [0, 6, 15], [1, 7, 8, 14]].entries()) {
    for (const index of solution) {
      const bounds = await page.locator('#board canvas').boundingBox();
      const x = bounds.x + (48 + (index % 4 + .5) * 116) / 560 * bounds.width;
      const y = bounds.y + (48 + (Math.floor(index / 4) + .5) * 116) / 560 * bounds.height;
      await page.mouse.move(x, y);
      await page.waitForTimeout(180);
      await page.mouse.click(x, y);
      await page.waitForTimeout(850);
    }
    await page.mouse.move(650, 700);
    await page.waitForTimeout(1100);
    if (level < 2) await page.getByRole('button', { name: 'Next garden' }).click();
  }
  await page.waitForTimeout(1400);
  return { status: await page.locator('#board-frame').getAttribute('data-status'), moves: await page.locator('#moves').textContent() };
}
