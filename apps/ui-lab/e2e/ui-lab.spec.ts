import { expect, test, type Page } from '@playwright/test';
import studyPack from '../src/mock/question-pack-learning.json';

const origin = 'http://127.0.0.1:3100';
let unexpectedNetwork: string[];

test.beforeEach(async ({ page, context }) => {
  unexpectedNetwork = [];
  await context.addCookies([
    { name: 'duoquest-ui-lab-sentinel', value: 'present', url: 'http://127.0.0.1:3000' },
  ]);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin || /^\/(api|socket\.io)(\/|$)/.test(url.pathname)) {
      unexpectedNetwork.push(url.href);
    }
  });
  page.on('websocket', (socket) => unexpectedNetwork.push(socket.url()));
});

test.afterEach(async ({ page, context }) => {
  expect(unexpectedNetwork).toEqual([]);
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  expect((await context.cookies()).map(({ name }) => name)).toEqual(['duoquest-ui-lab-sentinel']);
});

async function login(page: Page, email = 'demo@example.test', password = 'DuoQuest!123') {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('/');
}

async function playStudy(page: Page, mode: 'Solo' | 'Duel' | 'Co-op', shared = false) {
  await page.getByRole('link', { name: 'Quiz Battle', exact: true }).first().click();
  await page
    .getByRole('button', { name: new RegExp(mode, 'i') })
    .first()
    .click();
  if (shared) await page.getByLabel('Không gian chơi').selectOption('SHARED_SCREEN');
  await page.getByLabel('Trải nghiệm').selectOption('STUDY');
  await page.getByLabel('Bộ câu hỏi').selectOption('chu-vi-hinh-vuong');
  await page.getByRole('button', { name: /Tạo (ván Solo|phòng chơi)/ }).click();
  await expect(page).toHaveURL('/play/LAB222');
}

const ready = (page: Page) => page.getByRole('button', { name: 'Tôi đã sẵn sàng' }).click();
const start = (page: Page) => page.getByRole('button', { name: 'Bắt đầu →' }).click();
const choose = (page: Page, id: 'A' | 'B' | 'C' | 'D') =>
  page
    .locator('.answer')
    .filter({ has: page.locator('.answer-letter', { hasText: new RegExp('^' + id + '$') }) });

async function openPanel(page: Page) {
  await page.getByText('UI Lab', { exact: true }).click();
}

async function scene(page: Page, value: string) {
  await page.getByLabel('Cảnh thử').selectOption(value);
  await page.getByRole('button', { name: 'Mở cảnh' }).click();
  await expect(page).toHaveURL('/play/LAB222');
}

test('keeps a fixed 4:3 frame for landscape and portrait question images', async ({ page }) => {
  await page.goto('/');
  await openPanel(page);
  await scene(page, 'image');
  await openPanel(page);
  const image = page.getByAltText('Minh họa Quiz Battle');
  await expect(image).toBeVisible();
  await expect(image).toHaveCSS('object-fit', 'contain');
  const frame = image.locator('..');
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const size = await frame.boundingBox();
    expect(size).not.toBeNull();
    expect(size!.width / size!.height).toBeCloseTo(4 / 3, 2);
    await image.evaluate(async (element: HTMLImageElement) => {
      const original = element.getAttribute('src')!;
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="96"/>';
      element.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
      await element.decode();
      const before = element.parentElement!.getBoundingClientRect();
      element.src = original;
      await element.decode();
      const after = element.parentElement!.getBoundingClientRect();
      if (before.width !== after.width || before.height !== after.height) {
        throw new Error('The frame resized with the source image');
      }
    });
    expect(await frame.boundingBox()).toMatchObject({ width: size!.width, height: size!.height });
  }
});

test('opens the question image at a larger size and restores focus after closing', async ({
  page,
}) => {
  await page.goto('/');
  await openPanel(page);
  await scene(page, 'image');
  await openPanel(page);
  const thumbnail = page.getByRole('button', { name: 'Phóng to ảnh: Minh họa Quiz Battle' });
  const viewer = page.getByRole('dialog', { name: 'Ảnh câu hỏi phóng to' });
  const close = viewer.getByRole('button', { name: 'Đóng ảnh' });

  await thumbnail.focus();
  await page.keyboard.press('Enter');
  await expect(viewer).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(thumbnail).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const thumbnailSize = await thumbnail.boundingBox();
  await thumbnail.click();
  const image = viewer.getByRole('img');
  await expect(image).toBeVisible();
  expect((await image.boundingBox())!.width).toBeGreaterThan(thumbnailSize!.width);
  await close.click();
  await expect(viewer).toBeHidden();
  await expect(thumbnail).toBeFocused();
  await choose(page, 'A').click();
  await thumbnail.click();
  await expect(viewer).toBeVisible();
  await expect(page.getByText('HOÀN THÀNH VÁN CHƠI')).toBeVisible();
  await expect(viewer).toBeHidden();
});

test('plays Solo to completion, records history and starts a rematch', async ({ page }) => {
  await login(page);
  await playStudy(page, 'Solo');
  await expect(page.locator('.lobby')).not.toHaveCSS('background-image', /forest-arena/);
  await ready(page);
  await start(page);
  await expect(page.locator('.question-card')).toHaveCSS('background-image', /forest-arena\.png/);
  await expect(page.locator('.answer.correct')).toHaveCount(0);
  await choose(page, 'C').click();
  await expect(page.getByText('Đáp án C', { exact: true })).toBeVisible();
  await expect(page.getByText('HOÀN THÀNH VÁN CHƠI')).toBeVisible();
  await page.getByRole('button', { name: /Chơi thêm một ván/ }).click();
  await expect(choose(page, 'C')).toBeEnabled();
  await expect(page.getByText('Đáp án C', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Rời phòng' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Rời phòng/ })
    .click();
  await page.getByRole('link', { name: /Hồ sơ/ }).first().click();
  await expect(page.locator('.profile-match-row')).toHaveCount(2);
});

test('uses A and L to play Shared Screen Duel and steal', async ({ page }) => {
  await login(page);
  await playStudy(page, 'Duel', true);
  await ready(page);
  await start(page);
  await expect(choose(page, 'A')).toBeDisabled();
  await page.keyboard.press('a');
  await expect(page.getByText('Minh Demo đang trả lời')).toBeVisible();
  await choose(page, 'A').click();
  await page.keyboard.press('l');
  await expect(page.getByText('Người chơi 2 đang trả lời')).toBeVisible();
  await choose(page, 'C').click();
  await expect(page.getByText('Đáp án C', { exact: true })).toBeVisible();
});

test('separates Duel LAN answers and replays both interference skills', async ({ page }) => {
  await login(page);
  await playStudy(page, 'Duel');
  await ready(page);
  await openPanel(page);
  const p1 = page.getByRole('button', { name: 'P1', exact: true });
  const p2 = page.getByRole('button', { name: 'P2', exact: true });
  await p2.click();
  await ready(page);
  await p1.click();
  await start(page);
  await choose(page, 'C').click();
  await expect(choose(page, 'C')).toHaveClass(/chosen/);
  await p2.click();
  await expect(page.locator('.answer.chosen, .answer.correct')).toHaveCount(0);
  await choose(page, 'B').click();
  await expect(page.getByText('Đáp án C', { exact: true })).toBeVisible();

  await scene(page, 'cover');
  await expect(page.getByRole('heading', { name: 'Câu hỏi đang bị che' })).toBeVisible();
  await expect(page.getByAltText('Minh họa Quiz Battle')).toHaveCount(0);
  await p1.click();
  await expect(page.getByAltText('Minh họa Quiz Battle')).toBeVisible();
  await page.getByRole('button', { name: 'Phát lại' }).click();
  await expect(page.getByRole('heading', { name: 'Câu hỏi đang bị che' })).toBeVisible();
  await scene(page, 'blur');
  await expect(page.locator('.answer-text').first()).toHaveCSS('filter', 'blur(7px)');
  await p1.click();
  await expect(page.locator('.answer-text').first()).toHaveCSS('filter', 'none');
});

test('shows Co-op captain permissions and mock reconnection', async ({ page }) => {
  await login(page);
  await playStudy(page, 'Co-op');
  await ready(page);
  await openPanel(page);
  await page.getByRole('button', { name: 'P2', exact: true }).click();
  await ready(page);
  await page.getByRole('button', { name: 'P1', exact: true }).click();
  await start(page);
  await page.getByRole('button', { name: 'P2', exact: true }).click();
  await expect(choose(page, 'C')).toBeDisabled();
  await page.getByRole('button', { name: /Gợi ý ·/ }).click();
  await expect(page.locator('.explanation li')).toBeVisible();
  await page.getByRole('button', { name: 'P1', exact: true }).click();
  await expect(choose(page, 'C')).toBeEnabled();
  await choose(page, 'A').click();
  await expect(page.locator('.coop-info')).toContainText('2 mạng');

  await scene(page, 'disconnect');
  await expect(page.getByText(/Mất kết nối. Đang kết nối lại/)).toBeVisible();
  await page.getByRole('button', { name: 'Kết nối lại' }).click();
  await expect(choose(page, 'A')).toBeEnabled();
});

test('uses mock shop, profile and imported pack without requesting remote images', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('link', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Mua vật phẩm' }).click();
  await page.getByRole('button', { name: 'Trang bị', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang trang bị' })).toBeDisabled();
  await expect(page.getByLabel('Số dư 230 Coins')).toBeVisible();
  await page.getByRole('link', { name: 'Bộ câu hỏi', exact: true }).click();
  const json = page.getByLabel('Nội dung JSON');
  const validate = page.getByRole('button', { name: 'Kiểm tra & xem trước' });
  await json.fill('{');
  await validate.click();
  await expect(page.locator('.notice')).toBeVisible();
  const pack = {
    ...studyPack,
    packId: 'ui-lab-import',
    title: 'Bộ đề thử nghiệm',
    questions: [
      {
        ...studyPack.questions[0],
        images: [{ src: 'https://assets.example.test/quiz.jpg', alt: 'Ảnh nhập thử' }],
      },
    ],
  };
  await json.fill(JSON.stringify(pack));
  await validate.click();
  await page.locator('details summary').filter({ hasText: /^1\./ }).click();
  await expect(page.getByAltText('Ảnh nhập thử')).toHaveAttribute(
    'src',
    '/images/quiz/lab-sample.jpg',
  );
  await page.getByRole('button', { name: 'Xác nhận lưu bộ đề' }).click();
  await expect(page.getByText(/Đã lưu phiên bản bộ đề/)).toBeVisible();
  await page.getByRole('link', { name: 'Quiz Battle', exact: true }).first().click();
  await page.getByLabel('Trải nghiệm').selectOption('STUDY');
  await expect(page.getByRole('option', { name: /Bộ đề thử nghiệm/ })).toBeAttached();
  await openPanel(page);
  await page.getByRole('button', { name: 'Đặt lại', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
});

test('registers, changes and resets a sample account in one tab', async ({ page }) => {
  const email = 'new-player@example.test';
  await page.goto('/register');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã', exact: true }).click();
  const otp = page.getByLabel('Mã xác minh 6 số');
  await otp.fill('111111');
  await page.getByRole('button', { name: 'Xác minh mã', exact: true }).click();
  await expect(page.getByText(/Mã không đúng/)).toBeVisible();
  await otp.fill('123456');
  await page.getByRole('button', { name: 'Xác minh mã', exact: true }).click();
  await page.getByLabel('Nickname', { exact: true }).fill('Linh Demo');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('LabAccount!1');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('LabAccount!1');
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: 'Hồ sơ của Linh Demo' }).click();
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await page.locator('#current-password').fill('LabAccount!1');
  await page.locator('#new-password').fill('LabAccount!2');
  await page.locator('#repeat-password').fill('LabAccount!2');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await expect(page.getByText(/Đã đổi mật khẩu/)).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('link', { name: /Quên mật khẩu/ }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã', exact: true }).click();
  await otp.fill('123456');
  await page.getByRole('button', { name: 'Xác minh mã', exact: true }).click();
  await page.getByLabel('Mật khẩu', { exact: true }).fill('LabAccount!3');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('LabAccount!3');
  await page.getByRole('button', { name: 'Lưu mật khẩu', exact: true }).click();
  await expect(page.getByText(/Mật khẩu đã được đặt lại/)).toBeVisible();
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('LabAccount!3');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Hồ sơ của Linh Demo' })).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`keeps the original hub visible with collapsed controls at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hôm nay, bạn muốn chơi gì?' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Thỏ Lavender và Chim Xanh/ })).toBeVisible();
    await expect(page.getByLabel('Cảnh thử')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await openPanel(page);
    await expect(page.getByLabel('Cảnh thử')).toBeVisible();
  });
}
