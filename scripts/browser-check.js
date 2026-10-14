// Run through the pinned Playwright CLI; see QA.md. All game actions use the UI.
async (page) => {
  const report = { checks: [], errors: [], warnings: [], failedRequests: [], environments: [] };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const gameUrl = page.url();
  assert(new URL(gameUrl).pathname === '/circuit-bloom-pixijs/', 'Open the local or published game URL before running these checks');
  report.url = gameUrl;
  const check = (message) => report.checks.push(message);
  const watch = (target) => {
    const onError = (error) => report.errors.push(error.message);
    const onConsole = (message) => {
      if (message.type() === 'error') report.errors.push(message.text());
      if (message.type() === 'warning') report.warnings.push(message.text());
    };
    const onRequest = (request) => report.failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
    target.on('pageerror', onError);
    target.on('console', onConsole);
    target.on('requestfailed', onRequest);
    return () => {
      target.off('pageerror', onError);
      target.off('console', onConsole);
      target.off('requestfailed', onRequest);
    };
  };
  const snapshot = async (target) => target.locator('#board-frame').evaluate((frame) => ({
    bits: frame.dataset.board, status: frame.dataset.status, level: Number(frame.dataset.level),
    selected: Number(frame.dataset.selected), moves: Number(document.getElementById('moves').textContent),
  }));
  const flip = (bits, index) => {
    const board = bits.split('');
    const row = Math.floor(index / 4), column = index % 4;
    for (const cell of [index, row > 0 ? index - 4 : -1, row < 3 ? index + 4 : -1,
      column > 0 ? index - 1 : -1, column < 3 ? index + 1 : -1].filter((cell) => cell >= 0)) {
      board[cell] = board[cell] === '1' ? '0' : '1';
    }
    return board.join('');
  };
  const position = async (target, index) => {
    const bounds = await target.locator('#board canvas').boundingBox();
    assert(bounds, 'Canvas is mounted');
    return { x: bounds.x + (48 + (index % 4 + .5) * 116) / 560 * bounds.width,
      y: bounds.y + (48 + (Math.floor(index / 4) + .5) * 116) / 560 * bounds.height };
  };
  const tap = async (target, index, touch = false) => {
    const point = await position(target, index);
    if (touch) await target.touchscreen.tap(point.x, point.y);
    else await target.mouse.click(point.x, point.y);
  };
  const reset = async (target) => target.getByRole('button', { name: 'Reset this garden' }).click();
  const solutions = [[5, 10], [0, 6, 15], [1, 7, 8, 14]];
  const release = watch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(gameUrl);
  await page.locator('#board-frame[data-status="playing"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  report.environments.push({ type: 'desktop', viewport: '1440×900', userAgent: await page.evaluate(() => navigator.userAgent) });
  const initial = (await snapshot(page)).bits;
  for (const index of [0, 1, 3, 5, 15]) {
    await tap(page, index);
    const state = await snapshot(page);
    assert(state.bits === flip(initial, index) && state.moves === 1, `Correct input mapping at cell ${index}`);
    await reset(page);
  }
  check('Corner, edge, center and row-boundary pointer interactions match the cross rule.');
  await page.mouse.move(5, 5);
  await page.waitForTimeout(600);
  const beforeRapid = await page.locator('#board canvas').screenshot();
  for (let index = 0; index < 20; index++) await tap(page, 3);
  await page.mouse.move(5, 5);
  await page.locator('#reset').focus();
  await page.waitForTimeout(600);
  const afterRapid = await page.locator('#board canvas').screenshot();
  assert((await snapshot(page)).bits === initial && (await snapshot(page)).moves === 20, 'Rapid taps preserve state');
  assert(beforeRapid.equals(afterRapid), 'Rendering converges to original pixels after rapid reversible input');
  check('20 rapid taps preserve move count and converge to the identical canvas image.');
  for (let index = 0; index < 10; index++) {
    await reset(page);
    await tap(page, 0);
    assert((await snapshot(page)).moves === 1, 'Reset does not duplicate input listeners');
    assert(await page.locator('canvas').count() === 1, 'One canvas after restart');
  }
  await reset(page);
  check('10 resets keep one canvas and one state update per tap.');
  await page.locator('#board-frame').focus();
  await page.keyboard.press('ArrowLeft');
  assert((await snapshot(page)).selected === 0, 'Keyboard does not wrap at left boundary');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  assert((await snapshot(page)).status === 'won' && (await snapshot(page)).moves === 2, 'Keyboard solves first garden');
  await page.keyboard.press('Enter');
  assert((await snapshot(page)).moves === 2, 'Victory locks keyboard input');
  await page.keyboard.press('Tab');
  assert(await page.getByRole('button', { name: 'Reset this garden' }).evaluate((button) => button === document.activeElement), 'Tab leaves the board');
  await reset(page);
  check('Arrow navigation, Enter, Space, boundary clamping, victory lock and Tab exit work.');
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'output/playwright/desktop.png', scale: 'css' });
  for (let level = 0; level < solutions.length; level++) {
    if (level === 2) assert((await snapshot(page)).bits === '0000000000000000', 'Third garden starts closed');
    for (const index of solutions[level]) await tap(page, index);
    const state = await snapshot(page);
    assert(state.status === (level === 2 ? 'complete' : 'won'), `Garden ${level + 1} wins`);
    assert(state.moves === solutions[level].length && state.bits === '1111111111111111', 'Win state and count match');
    await tap(page, 0);
    assert((await snapshot(page)).moves === state.moves, 'Win locks pointer input');
    if (level < 2) await page.getByRole('button', { name: 'Next garden' }).click();
  }
  await page.mouse.move(5, 5);
  await page.locator('#reset').focus();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: 'output/playwright/completion.png', scale: 'css' });
  await page.getByRole('button', { name: 'Bloom again' }).click();
  assert((await snapshot(page)).level === 0 && (await snapshot(page)).moves === 0, 'Replay starts fresh');
  check('All three desktop gardens solve through the UI; next is deliberate, final completion and replay work.');
  for (const viewport of [{ width: 360, height: 800 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    await tap(page, 15);
    assert((await snapshot(page)).bits === flip(initial, 15), 'Resize preserves hit mapping');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
    await reset(page);
  }
  check('Hit mapping and layout stay aligned at 360×800, 1024×768 and 1440×900.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tap(page, 5); await tap(page, 10);
  assert((await snapshot(page)).status === 'won', 'Reduced motion retains gameplay');
  await reset(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check('Reduced-motion preference changes during play retain correct state.');
  release();
  const context = await page.context().browser().newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mobile = await context.newPage();
  const releaseMobile = watch(mobile);
  await mobile.goto(gameUrl);
  await mobile.locator('#board-frame[data-status="playing"]').waitFor();
  await mobile.evaluate(() => document.fonts.ready);
  report.environments.push({ type: 'emulated touch', viewport: '360×800', deviceScaleFactor: 2, userAgent: await mobile.evaluate(() => navigator.userAgent) });
  await mobile.waitForTimeout(400);
  await mobile.screenshot({ path: 'output/playwright/mobile.png', scale: 'css' });
  const mobileBounds = await mobile.locator('#result').boundingBox();
  assert(mobileBounds.y + mobileBounds.height <= 800, 'Mobile results and controls fit inside viewport');
  await tap(mobile, 0, true);
  assert((await snapshot(mobile)).bits === flip(initial, 0), 'Touch maps correctly');
  await reset(mobile);
  for (let level = 0; level < solutions.length; level++) {
    for (const index of solutions[level]) await tap(mobile, index, true);
    assert((await snapshot(mobile)).status === (level === 2 ? 'complete' : 'won'), 'Touch win state');
    if (level < 2) await mobile.getByRole('button', { name: 'Next garden' }).tap();
  }
  await mobile.getByRole('button', { name: 'Bloom again' }).tap();
  assert((await snapshot(mobile)).level === 0 && (await snapshot(mobile)).moves === 0, 'Touch replay');
  releaseMobile();
  await context.close();
  check('Emulated 360×800 touch plays all three gardens, reset and replay; all controls fit.');
  assert(report.errors.length === 0 && report.warnings.length === 0 && report.failedRequests.length === 0, 'No page errors, console warnings or failed requests');
  check('Production subpath loads without page errors, console warnings or failed requests.');
  return report;
}
