import { expect, test, type Page } from '@playwright/test';
import studyPack from '../src/mock/question-pack-learning.json';

let unexpectedNetwork: string[];

test.beforeEach(async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
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
const skillGroup = (page: Page, player = 'Minh Demo', kind = 'hỗ trợ') =>
  page
    .locator('.question-card')
    .getByRole('group', { name: `Skill ${kind} của ${player}`, exact: true });

async function expectSkillsOutsidePanel(
  page: Page,
  side: 'left' | 'right',
  names: string[],
  icons: string[],
) {
  const kind = side === 'left' ? 'hỗ trợ' : 'đối kháng';
  const group = skillGroup(page, 'Minh Demo', kind);
  const panel = page.locator('.answers').locator('..');
  const buttons = group.getByRole('button');
  await expect(buttons).toHaveCount(names.length);
  await expect(panel.getByRole('group', { name: /^Skill / })).toHaveCount(0);
  const panelBounds = (await panel.boundingBox())!;
  const groupBounds = (await group.boundingBox())!;
  const viewportWidth = page.viewportSize()!.width;
  if (side === 'left') {
    expect(groupBounds.x + groupBounds.width).toBeLessThan(panelBounds.x);
  } else {
    expect(groupBounds.x).toBeGreaterThan(panelBounds.x + panelBounds.width);
  }
  expect(groupBounds.y).toBeLessThan(panelBounds.y + panelBounds.height);
  expect(groupBounds.y + groupBounds.height).toBeGreaterThan(panelBounds.y);

  let previousBottom = groupBounds.y;
  for (const [index, name] of names.entries()) {
    const button = buttons.nth(index);
    await expect(button).toHaveAccessibleName(name);
    const icon = button.locator('img');
    await expect(icon).toHaveAttribute('src', `/images/quiz/skills/${icons[index]}.svg`);
    await expect
      .poll(() => icon.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    const iconBounds = (await icon.boundingBox())!;
    expect(iconBounds.width).toBeGreaterThanOrEqual(viewportWidth <= 640 ? 48 : 64);
    if (viewportWidth >= 1280) expect(iconBounds.width).toBe(88);
    expect(iconBounds.width).toBe(iconBounds.height);
    const bounds = (await button.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(previousBottom);
    previousBottom = bounds.y + bounds.height;
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    viewportWidth,
  );
}

async function openPanel(page: Page) {
  if (await page.getByLabel('Cảnh thử').isVisible()) return;
  await page.getByText('UI Lab', { exact: true }).click();
  await expect(page.getByLabel('Cảnh thử')).toBeVisible();
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

test('filters custom casual questions by category, topic and difficulty', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Quiz Battle', exact: true }).first().click();
  await page.getByLabel('Cách chọn đề').selectOption('CASUAL_CUSTOM');
  const categories = page.getByRole('group', { name: 'Lĩnh vực' });
  const topics = page.getByRole('group', { name: 'Chủ đề' });
  const general = categories.getByRole('checkbox', { name: 'Kiến thức chung' });
  const shopping = categories.getByRole('checkbox', { name: 'Mua sắm' });
  const science = topics.getByRole('checkbox', { name: /Khoa học/ });
  const discount = topics.getByRole('checkbox', { name: /Tính tiền giảm giá/ });
  const difficulty = page.getByLabel('Độ khó');
  const create = page.getByRole('button', { name: /Tạo ván Solo/ });

  await general.check();
  await expect(discount).toHaveCount(0);
  await science.check();
  await expect(page.getByText(/^1 câu phù hợp/)).toBeVisible();
  await difficulty.selectOption('hard');
  await expect(page.getByText(/^Không có câu phù hợp/)).toBeVisible();
  await expect(create).toBeDisabled();
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await expect(general).not.toBeChecked();
  await expect(science).not.toBeChecked();
  await expect(difficulty).toHaveValue('mixed');

  await page.setViewportSize({ width: 390, height: 844 });
  await general.check();
  await science.check();
  await shopping.check();
  await discount.check();
  await expect(science).toBeChecked();
  await expect(discount).toBeChecked();
  await general.uncheck();
  await expect(science).toHaveCount(0);
  await difficulty.selectOption('medium');
  await expect(page.getByText(/^2 câu phù hợp/)).toBeVisible();
  await difficulty.selectOption('hard');
  await expect(page.getByText(/^1 câu phù hợp/)).toBeVisible();
  await create.click();
  await expect(page).toHaveURL('/play/LAB222');
  await ready(page);
  await start(page);
  await expect(page.getByRole('heading', { name: /^Một món hàng giá 500/ })).toBeVisible();
});

test('plays Solo to completion, records history and starts a rematch', async ({ page }) => {
  await login(page);
  await playStudy(page, 'Solo');
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(nav).toBeVisible();
  await expect(page.locator('.lobby')).not.toHaveCSS('background-image', /forest-arena/);
  await ready(page);
  await start(page);
  await expect(page.locator('.question-card')).toHaveCSS('background-image', /forest-arena\.png/);
  await expect(nav).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  const labToggle = page.getByText('UI Lab', { exact: true });
  const sceneSelect = page.getByLabel('Cảnh thử');
  await expect(labToggle).toBeVisible();
  await expect(sceneSelect).toBeHidden();
  await labToggle.click();
  await expect(sceneSelect).toBeVisible();
  await page.keyboard.press('Shift+F2');
  await expect(labToggle).toBeVisible();
  await expect(sceneSelect).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sao chép lời mời' })).toHaveCount(0);
  await expect(page.locator('.answer.correct')).toHaveCount(0);
  await choose(page, 'C').click();
  await expect(page.getByText('Đáp án C', { exact: true })).toBeVisible();
  await expect(nav).toHaveCount(0);
  await expect(page.getByText('HOÀN THÀNH VÁN CHƠI')).toBeVisible();
  await expect(nav).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await page.getByRole('button', { name: /Chơi thêm một ván/ }).click();
  await expect(choose(page, 'C')).toBeEnabled();
  await expect(nav).toHaveCount(0);
  await expect(page.getByText('Đáp án C', { exact: true })).toHaveCount(0);
  const leaveMatch = page.getByRole('button', { name: 'Rời phòng', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Xác nhận rời phòng LAB222' });
  const stay = dialog.getByRole('button', { name: 'Ở lại trận', exact: true });
  const confirm = dialog.getByRole('button', { name: 'Rời phòng', exact: true });
  const close = dialog.getByRole('button', { name: 'Đóng xác nhận rời phòng' });
  await leaveMatch.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('..')).toHaveCSS('backdrop-filter', 'blur(5px)');
  await expect(dialog).toHaveCSS('animation-duration', '0.25s');
  expect(
    await dialog.evaluate((element) => getComputedStyle(element, '::before').backgroundImage),
  ).toContain('/images/quiz/forest-alert-panel.webp');
  await expect(stay).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(leaveMatch).toBeFocused();

  const desktop = page.viewportSize()!;
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await leaveMatch.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('animation-name', 'none');
  const box = (await dialog.boundingBox())!;
  const stayBox = (await stay.boundingBox())!;
  const confirmBox = (await confirm.boundingBox())!;
  expect(box.x).toBeGreaterThan(0);
  expect(box.x + box.width).toBeLessThan(360);
  expect(box.width / box.height).toBeCloseTo(1.5, 2);
  const copy = dialog.getByRole('heading').locator('..');
  expect(await copy.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(0);
  expect(stayBox.x + stayBox.width).toBeLessThan(confirmBox.x);
  expect(stayBox.height).toBeGreaterThanOrEqual(44);
  expect(confirmBox.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL('/play/LAB222');
  await expect(choose(page, 'C')).toBeEnabled();
  await page.setViewportSize(desktop);
  await expect(nav).toHaveCount(0);
  await leaveMatch.click();
  await stay.click();
  await expect(dialog).toBeHidden();
  await leaveMatch.click();
  await confirm.click();
  await page.getByRole('link', { name: /Hồ sơ/ }).first().click();
  await expect(page.locator('.profile-match-row')).toHaveCount(2);
});

test('uses the skill column on mobile with keyboard and pointer input', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page);
  await playStudy(page, 'Solo');
  await ready(page);
  await start(page);
  await expectSkillsOutsidePanel(page, 'left', ['Gợi ý', '50/50'], ['hint', 'fifty-fifty']);
  await expect(skillGroup(page, 'Minh Demo', 'đối kháng')).toHaveCount(0);
  expect((await choose(page, 'A').boundingBox())!.x).toBe(
    (await choose(page, 'B').boundingBox())!.x,
  );

  const group = skillGroup(page);
  const hint = group.getByRole('button', { name: 'Gợi ý', exact: true });
  const fifty = group.getByRole('button', { name: '50/50', exact: true });
  await expect(group).toContainText('Còn 7 lượt');
  await expect(hint).toHaveAccessibleDescription('Miễn phí');
  await choose(page, 'D').focus();
  await page.keyboard.press('Tab');
  await expect(hint).toBeFocused();
  await expect(hint).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page.locator('.explanation li')).toHaveCount(1);
  await expect(hint).toHaveAccessibleDescription('3 trong kho');
  await expect(group).toContainText('Còn 6 lượt');

  await fifty.click();
  await expect(page.locator('.answer:visible')).toHaveCount(2);
  await expect(fifty).toBeDisabled();
  await expect(group).toContainText('Còn 5 lượt');
  await hint.click();
  await expect(hint).toHaveAccessibleDescription('2 trong kho');
  await hint.click();
  await expect(hint).toHaveAccessibleDescription('Hết gợi ý');
  await expect(hint).toBeDisabled();
  const answerWidth = (await page.locator('.answers').boundingBox())!.width;
  await choose(page, 'C').click();
  await expect(page.getByText('Đáp án C', { exact: true })).toBeVisible();
  await expect(hint).toBeVisible();
  await expect(hint).toBeDisabled();
  await expect(fifty).toBeVisible();
  await expect(fifty).toBeDisabled();
  await expect(fifty).toHaveAccessibleDescription('Chờ câu sau');
  expect((await page.locator('.answers').boundingBox())!.width).toBe(answerWidth);
});

test('uses A and L to play Shared Screen Duel and steal', async ({ page }) => {
  await login(page);
  await playStudy(page, 'Duel', true);
  await ready(page);
  await start(page);
  const firstPlayer = page.getByRole('group', { name: 'Người chơi 1', exact: true });
  const secondPlayer = page.getByRole('group', { name: 'Người chơi 2', exact: true });
  await expect(firstPlayer).toContainText('Minh Demo');
  await expect(firstPlayer.locator('img')).toHaveAttribute(
    'src',
    '/images/profile/default-avatar.jpg',
  );
  await expect(secondPlayer).toContainText('Người chơi 2');
  await expect(choose(page, 'A')).toBeDisabled();
  const hint = skillGroup(page).getByRole('button', { name: 'Gợi ý', exact: true });
  await expect(hint).toBeVisible();
  await expect(hint).toBeDisabled();
  await page.keyboard.press('a');
  await expect(page.getByText('Minh Demo đang trả lời')).toBeVisible();
  await expect(skillGroup(page).getByRole('button')).toHaveCount(2);
  await expect(hint).toBeEnabled();
  await choose(page, 'A').click();
  await expect(firstPlayer.getByText('-20', { exact: true })).toBeVisible();
  await expect(hint).toBeDisabled();
  await page.keyboard.press('l');
  await expect(page.getByText('Người chơi 2 đang trả lời')).toBeVisible();
  await expect(skillGroup(page)).toHaveCount(0);
  await expect(skillGroup(page, 'Người chơi 2').getByRole('button')).toHaveCount(2);
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
  const labToggle = page.getByText('UI Lab', { exact: true });
  await expect(page.getByLabel('Cảnh thử')).toBeVisible();
  await labToggle.click();
  const desktop = page.viewportSize()!;
  for (const viewport of [desktop, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    const arena = page.getByRole('region', { name: 'Sân đấu Quiz Battle' });
    const bounds = (await arena.boundingBox())!;
    expect(bounds).toMatchObject({ x: 0, width: viewport.width });
    expect(bounds.height).toBeGreaterThanOrEqual(viewport.height);
    if (viewport.width >= 1280) {
      const panelBounds = (await arena.locator('.answers').locator('..').boundingBox())!;
      expect(panelBounds.width).toBeGreaterThanOrEqual(768);
    }
    const left = (await arena
      .getByRole('group', { name: 'Người chơi 1', exact: true })
      .boundingBox())!;
    const right = (await arena
      .getByRole('group', { name: 'Người chơi 2', exact: true })
      .boundingBox())!;
    const leave = (await arena.getByRole('button', { name: 'Rời phòng' }).boundingBox())!;
    expect(leave.width).toBeGreaterThanOrEqual(136);
    expect(leave.height).toBeGreaterThanOrEqual(54);
    expect(left.y).toBe(right.y);
    expect(left.x + left.width).toBeLessThanOrEqual(viewport.width / 2);
    expect(right.x).toBeGreaterThanOrEqual(viewport.width / 2);
    expect(leave.x).toBeGreaterThan(viewport.width / 2);
    expect(leave.y).toBeGreaterThan(right.y + right.height);
    await expectSkillsOutsidePanel(page, 'left', ['Gợi ý', '50/50'], ['hint', 'fifty-fifty']);
    await expectSkillsOutsidePanel(
      page,
      'right',
      ['Che câu hỏi', 'Làm mờ đáp án'],
      ['cover', 'blur'],
    );
  }
  await page.setViewportSize(desktop);
  const attacks = skillGroup(page, 'Minh Demo', 'đối kháng');
  const cover = attacks.getByRole('button', { name: 'Che câu hỏi', exact: true });
  const coverVideo = page.locator('.question-card video');
  const questionRegion = coverVideo.locator('../..');
  const shortFrame = (await questionRegion.boundingBox())!;
  expect(shortFrame.height).toBeCloseTo((shortFrame.width * 9) / 16, 0);
  await expect(cover).toBeEnabled({ timeout: 10_000 });
  await cover.click();
  await openPanel(page);
  await p2.click();
  const covered = page.getByText('Câu hỏi đang bị che', { exact: true });
  await expect(covered).toBeVisible();
  await expect(coverVideo).toHaveAttribute('data-playing', 'true');
  await expect(coverVideo).toHaveCSS('object-fit', 'contain');
  expect(await questionRegion.boundingBox()).toMatchObject({
    width: shortFrame.width,
    height: shortFrame.height,
  });
  await p1.click();
  await expect(covered).toHaveCount(0);
  await expect(coverVideo).toHaveJSProperty('paused', true);
  // Wait out the target's active Cover before checking that Blur can be applied.
  await p2.click();
  await expect(covered).toHaveCount(0, { timeout: 11_000 });
  await p1.click();
  await labToggle.click();
  await attacks.getByRole('button', { name: 'Làm mờ đáp án', exact: true }).click();
  await openPanel(page);
  await p2.click();
  await expect(page.locator('.answer-text').first()).toHaveCSS('filter', 'blur(7px)');
  await p1.click();
  await choose(page, 'C').click();
  await expect(choose(page, 'C')).toHaveClass(/chosen/);
  await expect(cover).toBeVisible();
  await expect(cover).toBeDisabled();
  await p2.click();
  await expect(page.locator('.answer.chosen, .answer.correct')).toHaveCount(0);
  await choose(page, 'B').click();
  await expect(page.getByText('Đáp án C', { exact: true })).toBeVisible();

  await scene(page, 'cover');
  await expect(covered).toBeVisible();
  const imageFrame = (await questionRegion.boundingBox())!;
  expect(imageFrame.height).toBeGreaterThanOrEqual(Math.floor((imageFrame.width * 9) / 16));
  await expect(page.getByAltText('Minh họa Quiz Battle')).toBeHidden();
  await openPanel(page);
  await p1.click();
  await expect(page.getByAltText('Minh họa Quiz Battle')).toBeVisible();
  await page.getByRole('button', { name: 'Phát lại' }).click();
  await expect(covered).toBeVisible();
  await choose(page, 'B').click();
  await expect(covered).toHaveCount(0);
  await expect(coverVideo).toHaveJSProperty('paused', true);
  await expect(page.getByText('Đã khóa đáp án. Chờ người còn lại hoặc hết giờ…')).toBeVisible();
  await openPanel(page);
  await scene(page, 'blur');
  await expect(page.locator('.answer-text').first()).toHaveCSS('filter', 'blur(7px)');
  await openPanel(page);
  await p1.click();
  await expect(page.locator('.answer-text').first()).toHaveCSS('filter', 'none');
});

test('keeps Cover usable on mobile when sound is blocked or the clip fails', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!this.muted) return Promise.reject(new DOMException('Test autoplay', 'NotAllowedError'));
      return play.call(this);
    };
  });
  await page.goto('/');
  await openPanel(page);
  await scene(page, 'cover');
  const covered = page.getByText('Câu hỏi đang bị che', { exact: true });
  const video = page.locator('.question-card video');
  await expect(video).toHaveAttribute('data-playing', 'true');
  await expect(video).toHaveJSProperty('muted', true);
  await expect(covered).toBeVisible();
  await expect(choose(page, 'B')).toBeEnabled();

  await page.route('**/cover-thunder-v1.mp4', (route) => route.abort());
  await page.reload();
  await openPanel(page);
  await scene(page, 'cover');
  await expect(covered).toBeVisible();
  await expect(video).not.toHaveAttribute('data-playing', 'true');
  await expect(covered.locator('..')).toHaveCSS('background-image', /cover-thunder-v1.webp/);
  await page.getByText('UI Lab', { exact: true }).click();
  await choose(page, 'B').click();
  await expect(covered).toHaveCount(0);
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
  await openPanel(page);
  await page.getByRole('button', { name: 'P2', exact: true }).click();
  await page.getByText('UI Lab', { exact: true }).click();
  await expect(choose(page, 'C')).toBeDisabled();
  await page.getByRole('button', { name: 'Gợi ý', exact: true }).click();
  await expect(page.locator('.explanation li')).toBeVisible();
  await openPanel(page);
  await page.getByRole('button', { name: 'P1', exact: true }).click();
  await page.getByText('UI Lab', { exact: true }).click();
  await expect(choose(page, 'C')).toBeEnabled();
  await choose(page, 'A').click();
  await expect(page.locator('.coop-info')).toContainText('2 mạng');

  await openPanel(page);
  await scene(page, 'disconnect');
  await expect(page.getByText(/Mất kết nối. Đang kết nối lại/)).toBeVisible();
  await openPanel(page);
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
  await expect(page).toHaveURL('/login');
  await page.getByRole('link', { name: /Quên mật khẩu/ }).click();
  await expect(page).toHaveURL('/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã', exact: true }).click();
  await otp.fill('123456');
  await page.getByRole('button', { name: 'Xác minh mã', exact: true }).click();
  await page.getByLabel('Mật khẩu', { exact: true }).fill('LabAccount!3');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('LabAccount!3');
  await page.getByRole('button', { name: 'Lưu mật khẩu', exact: true }).click();
  await expect(page.getByText(/Mật khẩu đã được đặt lại/)).toBeVisible();
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('LabAccount!3');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Hồ sơ của Linh Demo' })).toBeVisible();
});

test('customizes arena theme and 3 audio channels from profile', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: /Hồ sơ/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Chủ đề & Âm thanh phòng chơi' })).toBeVisible();

  const christmasBtn = page.getByRole('button', { name: 'Chọn chủ đề Giáng sinh ấm áp' });
  const tropicalBtn = page.getByRole('button', { name: 'Chọn chủ đề Rừng rậm nhiệt đới' });
  await expect(christmasBtn).toHaveAttribute('aria-pressed', 'false');
  await tropicalBtn.click();
  await expect(tropicalBtn).toHaveAttribute('aria-pressed', 'true');
  await christmasBtn.click();
  await expect(christmasBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(tropicalBtn).toHaveAttribute('aria-pressed', 'false');

  const channels = page.getByRole('group', { name: 'Cài đặt 3 kênh âm thanh' });
  const lobbyToggle = channels.getByRole('checkbox', { name: /Nhạc nền sảnh chờ/ });
  const matchToggle = channels.getByRole('checkbox', { name: /Nhạc nền trong trận/ });
  const skillToggle = channels.getByRole('checkbox', { name: /Âm thanh hiệu ứng Skill/ });
  await expect(lobbyToggle).toBeChecked();
  await expect(matchToggle).toBeChecked();
  await expect(skillToggle).toBeChecked();
  await skillToggle.uncheck();
  await expect(skillToggle).not.toBeChecked();

  await playStudy(page, 'Duel');
  await expect(page.locator('.lobby')).toContainText('CHỦ ĐỀ: GIÁNG SINH ẤM ÁP');
  const soundBtn = page.getByRole('button', { name: 'Tiếng sét', exact: true });
  await expect(soundBtn).toHaveAttribute('aria-pressed', 'false');

  await ready(page);
  await openPanel(page);
  await page.getByRole('button', { name: 'P2', exact: true }).click();
  await ready(page);
  await page.getByRole('button', { name: 'P1', exact: true }).click();
  await start(page);

  const arena = page.locator('.question-card');
  await expect(arena).toHaveAttribute('data-quiz-theme', 'christmas');
  await expect(arena).toHaveCSS('background-image', /christmas-arena\.png/);
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
