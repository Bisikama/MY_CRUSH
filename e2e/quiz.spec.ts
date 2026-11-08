import { test, expect, type Page } from '@playwright/test';
import starter from '../examples/question-pack.json';

async function guest(page: Page, nickname: string) {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Hôm nay, bạn muốn chơi gì?', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('1 game có sẵn · 2 ý tưởng tiếp theo', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: /Vào game/ }).click();
  await page.getByLabel('Biệt danh').fill(nickname);
  await page.getByRole('button', { name: 'Vào sân chơi →' }).click();
  await expect(page.getByText('● Đã kết nối máy chủ', { exact: false })).toBeVisible();
}

async function readyAndStart(page: Page) {
  await page.getByRole('button', { name: 'Tôi đã sẵn sàng' }).click();
  await page.getByRole('button', { name: 'Bắt đầu →', exact: true }).click();
}

test('Solo completes, guards IN_PROGRESS navigation, survives refresh and appears in persisted history', async ({
  page,
}) => {
  const nickname = `Solo-${Date.now()}`;
  await guest(page, nickname);
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();

  // While WAITING, navigating to Hub shows active room banner and dismissing banner does not leave room
  const code = (await page.locator('.room-code').innerText()).trim();
  await page.getByRole('link', { name: 'Các trò chơi', exact: true }).click();
  await expect(page.getByText('Bạn có phòng đang mở')).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông báo phòng đang mở' }).click();
  await expect(page.getByText('Bạn có phòng đang mở')).toHaveCount(0);
  await page.goto(`/play/${code}`);

  await readyAndStart(page);

  // Clicking a header navigation link during IN_PROGRESS opens LeaveMatchDialog; Cancel keeps match alive
  await page.getByRole('link', { name: 'Các trò chơi', exact: true }).click();
  const leaveDialog = page.getByRole('dialog');
  await expect(leaveDialog).toBeVisible();
  await expect(leaveDialog).toContainText(
    'Rời phòng sẽ hủy trận cho cả hai người, trận bị hủy không được thưởng.',
  );
  await page.getByRole('button', { name: 'Ở lại trận' }).click();
  await expect(leaveDialog).toHaveCount(0);

  await page.reload();
  for (const question of starter.questions) {
    await expect(page.getByRole('heading', { name: question.prompt, exact: true })).toBeVisible();
    const option = question.options.find((item) => item.id === question.correctOptionId)!;
    await page.getByRole('button', { name: `${option.id} ${option.text}`, exact: true }).click();
    await expect(page.getByText(question.explanation, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Thêm một hành trình mới!' })).toBeVisible();
  await page.getByRole('link', { name: 'Xem lịch sử' }).click();
  await expect(page.getByRole('heading', { name: nickname, exact: true })).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.getByRole('link', { name: 'Quiz Battle', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rời phòng hiện tại' })).toBeVisible();
  await page.getByRole('button', { name: 'Rời phòng hiện tại' }).click();
  await expect(page.getByRole('button', { name: 'Rời phòng hiện tại' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tạo ván Solo →' })).toBeEnabled();
});

test('two isolated browsers join a LAN-style room via invite URL and keep answers private until reveal', async ({
  browser,
}) => {
  const contextA = await browser.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const contextB = await browser.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const a = await contextA.newPage();
  const b = await contextB.newPage();
  try {
    await guest(a, `Host-${Date.now()}`);
    await a.getByRole('button', { name: /Duel/ }).click();
    await a.getByRole('button', { name: 'Tạo phòng chơi →' }).click();
    const code = (await a.locator('.room-code').innerText()).trim();

    // Browser B opens direct invite link /play/[code] before having a guest session
    await b.goto(`/play/${code}`);
    await expect(b.getByText(`Tạo hồ sơ khách để tiếp tục vào phòng mời ${code}.`)).toBeVisible();
    await b.getByLabel('Biệt danh').fill(`Guest-${Date.now()}`);
    await b.getByRole('button', { name: 'Vào sân chơi →' }).click();
    // Does not auto-join until clicking Tham gia phòng
    await expect(b.getByRole('button', { name: 'Tham gia phòng' })).toBeVisible();
    await b.getByRole('button', { name: 'Tham gia phòng' }).click();

    await a.getByRole('button', { name: 'Tôi đã sẵn sàng' }).click();
    await b.getByRole('button', { name: 'Tôi đã sẵn sàng' }).click();
    await a.getByRole('button', { name: 'Bắt đầu →', exact: true }).click();
    await a.getByRole('button', { name: 'A Hà Nội', exact: true }).click();
    await expect(a.getByText('Đã khóa đáp án. Chờ người còn lại hoặc hết giờ…')).toBeVisible();
    await expect(b.locator('.explanation')).toHaveCount(0);
    await b.getByRole('button', { name: 'B Đà Nẵng', exact: true }).click();
    await expect(a.getByText('Hà Nội là thủ đô của Việt Nam.', { exact: true })).toBeVisible();
    await expect(b.getByText('Hà Nội là thủ đô của Việt Nam.', { exact: true })).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test('shared-screen Duel keyboard buzzer permits a steal after a wrong answer', async ({
  page,
}) => {
  await guest(page, `Buzzer-${Date.now()}`);
  await page.getByRole('button', { name: /Duel/ }).click();
  await page.getByLabel('Không gian chơi').selectOption('SHARED_SCREEN');
  await page.getByRole('button', { name: 'Tạo phòng chơi →' }).click();
  await readyAndStart(page);
  await expect(
    page.getByRole('heading', { name: starter.questions[0]!.prompt, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('a');
  await page.getByRole('button', { name: 'B Đà Nẵng', exact: true }).click();
  await expect(page.locator('.score').first()).toHaveText('-20');
  await page.keyboard.press('l');
  await page.getByRole('button', { name: 'A Hà Nội', exact: true }).click();
  await expect(page.locator('.score').nth(1)).toHaveText('75');
});

test('mobile hub and setup fit a small viewport and do not expose a fake playable fallback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Hôm nay, bạn muốn chơi gì?', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: /Vào game/ }).click();
  await expect(page.getByLabel('Biệt danh')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile-welcome.png', fullPage: true });
});
