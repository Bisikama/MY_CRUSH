import { expect, test, type Page, type Route } from '@playwright/test';
import { PlatformBrowserFixture } from '../apps/api/test/platform-browser-fixture';

let fixture: PlatformBrowserFixture;

test.beforeEach(async ({ page }) => {
  fixture = new PlatformBrowserFixture();
  await fixture.start();
  const proxy = async (route: Route) => {
    const url = new URL(route.request().url());
    try {
      const response = await route.fetch({
        url: fixture.origin + url.pathname + url.search,
        timeout: 35_000,
      });
      await route.fulfill({ response });
    } catch {
      if (!page.isClosed()) await route.abort().catch(() => {});
    }
  };
  await page.route('**/api/**', proxy);
  await page.route('**/socket.io/**', proxy);
});

test.afterEach(async ({ page }) => {
  await page.close();
  await fixture.close();
});

async function lobby(page: Page) {
  await page.goto('/play');
  await expect(page.getByRole('button', { name: 'Tạo ván Solo →' })).toBeEnabled();
  await expect(page.locator('.lavender-coins-chip')).toContainText('10 Coins');
}

async function startMatch(page: Page) {
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await page.getByRole('button', { name: 'Tôi đã sẵn sàng' }).click();
  await page.getByRole('button', { name: 'Bắt đầu →', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lifecycle question', exact: true }),
  ).toBeVisible();
}

async function focus(page: Page) {
  // Deterministic event; provider still applies its normal focus throttle.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

test('late absent-room response cannot erase a new match or bypass leave confirmation', async ({
  page,
}) => {
  await lobby(page);
  fixture.holdRoomReads = true;
  await focus(page);
  await expect.poll(() => fixture.heldReads.length).toBeGreaterThan(0);
  await startMatch(page);
  const released = page.waitForResponse((response) =>
    response.url().includes('/api/rooms/current'),
  );
  fixture.releaseReads();
  await released;
  await page.locator('.lavender-logo').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Ở lại trận' }).click();
  expect(fixture.leaves).toBe(0);
  expect(fixture.room?.status).toBe('IN_PROGRESS');
  await expect(
    page.getByRole('heading', { name: 'Lifecycle question', exact: true }),
  ).toBeVisible();
  await page.locator('.lavender-logo').click();
  fixture.holdLeave = true;
  await page.getByRole('button', { name: 'Rời phòng', exact: true }).last().click();
  await expect.poll(() => fixture.leaves).toBe(1);
  await expect(page).toHaveURL(/\/play\/ABC234$/);
  fixture.releaseLeave!();
  await expect(page).toHaveURL(/\/$/);
  expect(fixture.room).toBeNull();
});

test('a lost create ACK reconciles the server room instead of assuming creation failed', async ({
  page,
}) => {
  await lobby(page);
  fixture.dropCreateAck = true;
  await page.getByRole('button', { name: 'Tạo ván Solo →' }).click();
  await expect(page.getByRole('region', { name: 'Phòng chơi hiện tại' })).toContainText('ABC234', {
    timeout: 15_000,
  });
  expect(fixture.room?.status).toBe('WAITING');
  await expect(page.getByRole('link', { name: /Quay lại phòng/ }).first()).toBeVisible();
});

test('server revocation clears identity and permits a new guest without reloading the invite URL', async ({
  page,
}) => {
  await lobby(page);
  await startMatch(page);
  fixture.expired = true;
  fixture.io.disconnectSockets(true);
  await expect(page.getByLabel('Biệt danh')).toBeVisible();
  await expect(page.locator('.lavender-profile-name')).toHaveCount(0);
  await expect(page).toHaveURL(/\/play\/ABC234$/);
  await page.getByLabel('Biệt danh').fill('Recovered guest');
  await page.getByRole('button', { name: 'Vào sân chơi →' }).click();
  await expect(page.locator('.lavender-profile-name')).toHaveText('Recovered guest');
  await expect(page.getByRole('button', { name: 'Tham gia phòng', exact: true })).toBeEnabled();
});

test('HTTP 401 and server disconnect share one session validation', async ({ page }) => {
  await lobby(page);
  fixture.profileStatus = 403;
  await focus(page);
  await expect(page.getByRole('button', { name: 'Thử lại Coins' })).toBeVisible();
  const before = fixture.authReads;
  fixture.authDelay = 300;
  fixture.expired = true;
  await page.getByRole('button', { name: 'Thử lại Coins' }).click();
  await expect.poll(() => fixture.authReads).toBe(before + 1);
  fixture.io.disconnectSockets(true);
  await expect(page.getByLabel('Biệt danh')).toBeVisible();
  expect(fixture.authReads).toBe(before + 1);
});

test('a server disconnect with a valid session reconnects once and restores the match snapshot', async ({
  page,
}) => {
  await lobby(page);
  await startMatch(page);
  const connections = fixture.connections;
  fixture.io.disconnectSockets(true);
  await expect.poll(() => fixture.connections).toBe(connections + 1);
  await expect(
    page.getByRole('heading', { name: 'Lifecycle question', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'A One', exact: true })).toBeEnabled();
  expect(fixture.maxConnections).toBe(1);
});

test('network/5xx lookup errors preserve identity and do not create a recovery loop', async ({
  page,
}) => {
  await lobby(page);
  fixture.authStatus = 503;
  const before = fixture.authReads;
  await focus(page);
  await expect.poll(() => fixture.authReads).toBe(before + 1);
  await expect(page.locator('header').getByRole('alert')).toContainText('Session lookup unavailable');
  await expect(page.locator('.lavender-profile-name')).toHaveText('Lifecycle Guest');
  expect(fixture.authReads).toBe(before + 1);
  expect(fixture.connections).toBe(1);
  expect(fixture.maxConnections).toBe(1);
});

test('resource 403 does not discard a valid identity', async ({ page }) => {
  await lobby(page);
  fixture.profileStatus = 403;
  await page.getByRole('link', { name: /Hồ sơ của/ }).click();
  await expect(page.getByRole('button', { name: 'Thoát hồ sơ guest', exact: true })).toBeVisible();
  const before = fixture.authReads;
  // Focus validates once; the subsequent profile 403 must not trigger another recovery.
  await focus(page);
  await expect(page.getByRole('button', { name: 'Thử lại Coins' })).toBeVisible();
  expect(fixture.authReads).toBe(before + 1);
  await expect(page.locator('.lavender-profile-name')).toHaveText('Lifecycle Guest');
});

test('logout and provider unmount do not reconnect a disposed socket', async ({ page }) => {
  await lobby(page);
  fixture.identity = {
    ...fixture.identity!,
    kind: 'account',
    role: 'PLAYER',
    email: 'fixture@example.test',
  };
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeVisible();
  const connections = fixture.connections;
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
  expect(fixture.connections).toBe(connections);
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(fixture.connections).toBe(connections);
});
