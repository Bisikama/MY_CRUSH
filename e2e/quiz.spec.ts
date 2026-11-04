import { test, expect, type Page } from '@playwright/test';
import starter from '../examples/question-pack.json';

async function guest(page: Page, nickname: string) {
  await page.goto('/');
  await page.getByLabel('Biệt danh').fill(nickname);
  await page.getByRole('button', { name: 'Vào sân chơi →' }).click();
  await expect(page.getByText('● Đã kết nối máy chủ', { exact: false })).toBeVisible();
}
async function readyAndStart(page: Page) {
  await page.getByRole('button', { name: 'Tôi đã sẵn sàng' }).click();
  await page.getByRole('button', { name: 'Bắt đầu →', exact: true }).click();
}
test('Solo completes, survives refresh and appears in persisted history', async ({ page }) => {
  const nickname = `Solo-${Date.now()}`;
  await guest(page, nickname);
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await readyAndStart(page);
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
  await page.getByRole('link', { name: 'Chơi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rời phòng hiện tại' })).toBeVisible();
  await page.getByRole('button', { name: 'Rời phòng hiện tại' }).click();
  await expect(page.getByRole('button', { name: 'Rời phòng hiện tại' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tạo ván Solo →' })).toBeEnabled();
});

test('two isolated browsers join a LAN-style room and keep answers private until reveal', async ({
  browser,
}) => {
  const contextA = await browser.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const contextB = await browser.newContext({ baseURL: 'http://127.0.0.1:3000' });
  const a = await contextA.newPage();
  const b = await contextB.newPage();
  try {
    await guest(a, `Host-${Date.now()}`);
    await guest(b, `Guest-${Date.now()}`);
    await a.getByRole('button', { name: /Duel/ }).click();
    await a.getByRole('button', { name: 'Tạo phòng chơi →' }).click();
    const code = (await a.locator('.room-code').innerText()).trim();
    await b.getByLabel('Mã phòng').fill(code);
    await b.getByRole('button', { name: 'Tham gia phòng ↗' }).click();
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

test('mobile setup fits a small viewport and does not expose a fake playable fallback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByLabel('Biệt danh')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile-welcome.png', fullPage: true });
});
