import { test, expect, type Page } from '@playwright/test';
import starter from '../examples/question-pack.json';
import learning from '../examples/question-pack-learning.json';

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
  await page.getByLabel('Trải nghiệm').selectOption('STUDY');
  await page
    .getByLabel('Bộ câu hỏi')
    .selectOption({ label: `${starter.title} · ${starter.questions.length} câu phù hợp` });
}

async function readyAndStart(page: Page) {
  await page.getByRole('button', { name: 'Tôi đã sẵn sàng' }).click();
  await page.getByRole('button', { name: 'Bắt đầu →', exact: true }).click();
}

async function importPack(
  page: Page,
  pack: object,
  label: string,
  checkPreview?: () => Promise<void>,
) {
  await page.goto('/packs');
  await page.getByLabel('Nội dung JSON').fill(JSON.stringify(pack));
  await page.getByRole('button', { name: 'Kiểm tra & xem trước' }).click();
  await expect(page.getByText(label, { exact: false })).toBeVisible();
  await checkPreview?.();
  await page.getByRole('button', { name: 'Xác nhận lưu bộ đề' }).click();
  await expect(page.getByText('Đã lưu phiên bản bộ đề.', { exact: false })).toBeVisible();
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
  for (let index = 0; index < starter.questions.length; index++) {
    await expect(page.locator('.answers button').first()).toBeEnabled();
    const prompt = await page.locator('.question-card h1').innerText();
    const question = starter.questions.find((candidate) => candidate.prompt === prompt)!;
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
  baseURL,
}) => {
  const contextA = await browser.newContext({ baseURL });
  const contextB = await browser.newContext({ baseURL });
  const a = await contextA.newPage();
  const b = await contextB.newPage();
  try {
    await b.setViewportSize({ width: 390, height: 844 });
    const images = [
      { src: '/images/quiz/test/one.jpg', alt: 'Cảnh thành phố số một' },
      { src: 'https://quiz-cdn.example.test/two.jpg', alt: 'Cảnh thành phố số hai' },
      { src: '/images/quiz/test/three.jpg', alt: 'Cảnh thành phố số ba' },
      { src: '/images/quiz/test/missing.jpg', alt: 'Cảnh thành phố số bốn' },
    ];
    for (const player of [a, b]) {
      for (const { src } of images.slice(0, 3)) {
        await player.route(src.startsWith('/') ? `**${src}` : src, (route) =>
          route.fulfill({ path: 'apps/web/public/images/hub/quiz-battle.jpg' }),
        );
      }
      await player.route('**/images/quiz/test/missing.jpg', (route) =>
        route.fulfill({ status: 404 }),
      );
    }
    await guest(a, `Host-${Date.now()}`);
    const title = 'Duel khám phá';
    await importPack(
      a,
      {
        ...starter,
        title,
        packId: `duel-${Date.now()}`,
        questions: [{ ...starter.questions[0], images }],
      },
      'Khám phá thú vị',
      async () => {
        await a.locator('details summary').click();
        await expect(a.getByRole('img', { name: images[1]!.alt })).toBeVisible();
        await expect(a.getByText('Không tải được ảnh.')).toBeVisible();
      },
    );
    await a.goto('/play');
    await a.getByLabel('Trải nghiệm').selectOption('STUDY');
    await a.getByLabel('Nhóm kiến thức').selectOption('discovery');
    await a.getByLabel('Đề tài').selectOption('Địa lý');
    await a.getByLabel('Bộ câu hỏi').selectOption({ label: `${title} · 1 câu phù hợp` });
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
    for (const player of [a, b]) {
      const card = player.locator('.question-card');
      await expect(card.getByRole('img')).toHaveCount(3);
      await expect(card.getByText('Không tải được ảnh.')).toBeVisible();
    }
    expect(await b.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
      true,
    );
    const blur = a.getByRole('button', { name: 'Làm mờ đáp án · Miễn phí' });
    await expect(blur).toBeEnabled({ timeout: 8000 });
    await blur.click();
    await expect(b.getByText('Làm mờ đáp án đang có hiệu lực.', { exact: false })).toBeVisible();
    await expect(a.getByText('Làm mờ đáp án đang có hiệu lực.', { exact: false })).toHaveCount(0);
    await expect(b.getByText('Làm mờ đáp án đang có hiệu lực.', { exact: false })).toHaveCount(0, {
      timeout: 5000,
    });
    await a.getByRole('button', { name: 'Che câu hỏi · Miễn phí' }).click();
    await expect(b.getByRole('heading', { name: 'Câu hỏi đang bị che' })).toBeVisible();
    await expect(b.locator('.question-card img')).toHaveCount(0);
    await expect(a.locator('.question-card img')).toHaveCount(3);
    await expect(b.locator('.question-card img')).toHaveCount(3);
    await b.reload();
    await expect(b.getByRole('img', { name: images[1]!.alt })).toBeVisible();
    await a.getByRole('button', { name: 'A Hà Nội', exact: true }).click();
    await expect(a.getByText('Đã khóa đáp án. Chờ người còn lại hoặc hết giờ…')).toBeVisible();
    await expect(b.locator('.explanation')).toHaveCount(0);
    await b.getByRole('button', { name: 'B Đà Nẵng', exact: true }).click();
    await expect(a.getByText('Hà Nội là thủ đô của Việt Nam.', { exact: true })).toBeVisible();
    await expect(b.getByText('Hà Nội là thủ đô của Việt Nam.', { exact: true })).toBeVisible();
    for (const player of [a, b])
      await player.getByRole('button', { name: 'Chơi thêm một ván →' }).click();
    for (const player of [a, b])
      await expect(
        player.getByRole('heading', { name: starter.questions[0]!.prompt, exact: true }),
      ).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test('imports and filters knowledge groups before starting Solo', async ({ page }) => {
  await guest(page, `Nhóm-${Date.now()}`);
  const { knowledgeType, ...legacy } = learning;
  const packId = `knowledge-${Date.now()}`;
  await importPack(page, { ...legacy, packId, title: 'Bộ đề cũ' }, 'Chưa phân loại');
  await importPack(page, { ...learning, packId }, 'Học chuyên đề');
  await page.goto('/play');
  await page.getByLabel('Trải nghiệm').selectOption('STUDY');

  const group = page.getByLabel('Nhóm kiến thức');
  const packs = page.getByLabel('Bộ câu hỏi');
  await expect(group).toHaveValue('all');
  await group.selectOption('unclassified');
  await expect(packs.locator('option:not([disabled])')).toHaveText(['Bộ đề cũ · 1 câu phù hợp']);
  await page.getByLabel('Lĩnh vực').selectOption(learning.category);
  await page.getByLabel('Đề tài').selectOption(learning.questions[0]!.topic);
  await page.getByLabel('Độ khó').selectOption('easy');
  await packs.selectOption({ label: 'Bộ đề cũ · 1 câu phù hợp' });
  await group.selectOption(knowledgeType);
  await expect(page.getByLabel('Lĩnh vực')).toHaveValue('');
  await expect(page.getByLabel('Đề tài')).toHaveValue('');
  await expect(page.getByLabel('Độ khó')).toHaveValue('easy');
  await expect(packs).toHaveValue('');
  await group.selectOption('practical');
  await expect(page.getByText('Không có bộ đề phù hợp với bộ lọc.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo ván Solo →' })).toBeDisabled();
  await group.selectOption(knowledgeType);
  await expect(
    packs.locator('option').filter({ hasText: `${learning.title} · 1 câu phù hợp` }),
  ).toHaveCount(1);
  await packs.selectOption({ label: `${learning.title} · 1 câu phù hợp` });
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await readyAndStart(page);
  await expect(
    page.getByRole('heading', { name: learning.questions[0]!.prompt, exact: true }),
  ).toBeVisible();
});

test('shared-screen Duel keyboard buzzer permits a steal after a wrong answer', async ({
  page,
}) => {
  await guest(page, `Buzzer-${Date.now()}`);
  await page.getByLabel('Đề tài').selectOption(starter.questions[0]!.topic);
  await page.getByLabel('Bộ câu hỏi').selectOption({ label: `${starter.title} · 1 câu phù hợp` });
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

test('filters a Solo pack by topic and difficulty and plays only the matching question', async ({
  page,
}) => {
  await guest(page, 'Filter-' + Date.now());
  await expect(page.getByLabel('Không gian chơi')).toHaveCount(0);
  await page.getByLabel('Đề tài').selectOption('Toán học');
  await page.getByLabel('Độ khó').selectOption('hard');
  await expect(page.getByRole('button', { name: 'Tạo ván Solo →' })).toBeDisabled();
  await page.getByLabel('Độ khó').selectOption('easy');
  await page
    .getByLabel('Bộ câu hỏi')
    .selectOption({ label: 'Khởi động cùng DuoQuest · 1 câu phù hợp' });
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await expect(page.getByText('Toán học · Dễ · 1 câu', { exact: false })).toBeVisible();
  await readyAndStart(page);
  await expect(
    page.getByRole('heading', { name: 'Số nguyên tố nhỏ nhất là số nào?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '50/50 · Miễn phí' }).click();
  await expect(page.locator('.answers button:visible')).toHaveCount(2);
  await page.getByRole('button', { name: 'C 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thêm một hành trình mới!' })).toBeVisible();
});

test('casual random has no content filters and caps a prepared Solo at 20 questions', async ({
  page,
}) => {
  await guest(page, 'Casual-' + Date.now());
  await page.getByLabel('Trải nghiệm').selectOption('CASUAL');
  await expect(page.getByLabel('Cách chọn đề')).toHaveValue('CASUAL_RANDOM');
  await expect(page.getByLabel('Bộ câu hỏi')).toHaveCount(0);
  await expect(page.getByLabel('Lĩnh vực')).toHaveCount(0);
  await expect(page.getByLabel('Độ khó')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await expect(page.getByText('Đố vui ngẫu nhiên · Mọi lĩnh vực', { exact: false })).toContainText(
    '20 câu',
  );
  await readyAndStart(page);
  await expect(page.locator('.answers button')).toHaveCount(4);
  await expect(page.locator('.question-meta')).toContainText('20');
});

test('casual custom shares persisted host history after cancellation and survives refresh', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page, 'History-' + Date.now());
  async function selectCustom() {
    await page.getByLabel('Trải nghiệm').selectOption('CASUAL');
    await page.getByLabel('Cách chọn đề').selectOption('CASUAL_CUSTOM');
    await page.getByLabel('Lĩnh vực').selectOption([starter.category]);
    await expect(page.getByLabel('Chủ đề')).toHaveAttribute('multiple', '');
    await expect(page.getByLabel('Độ khó')).toHaveValue('mixed');
    await expect(page.getByLabel('Bộ câu hỏi')).toHaveCount(0);
  }
  await selectCustom();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/casual-custom-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await expect(
    page.getByText('Đố vui tự chọn · ' + starter.category, { exact: false }),
  ).toContainText('4 câu');
  await readyAndStart(page);
  const first = await page.locator('.question-card h1').innerText();
  await page.reload();
  await expect(page.locator('.question-card h1')).toHaveText(first);
  await page.getByRole('button', { name: 'Rời phòng', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Rời phòng', exact: true }).click();
  await selectCustom();
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await expect(
    page.getByText('Đố vui tự chọn · ' + starter.category, { exact: false }),
  ).toContainText('3 câu');
  await readyAndStart(page);
  await expect(page.locator('.question-card h1')).not.toHaveText(first);
});
