import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.skip(
  process.env.RUN_AUTH_E2E !== '1',
  'Requires the loopback fake-mail API fixture and a _test database.',
);

test('guest upgrades via email OTP, can sign in again, confirm guest switch modal, and reset the password', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const email = randomUUID() + '@example.test';
  const initialPassword = 'A fresh browser test passphrase!';
  const newPassword = 'A different browser test passphrase!';
  const code = async () => {
    const message = await request.get('http://127.0.0.1:4000/__test/mail', { params: { email } });
    expect(message.ok()).toBe(true);
    return ((await message.json()) as { code: string }).code;
  };
  await page.goto('/play');
  await page.getByLabel('Biệt danh').fill('Guest OTP');
  await page.getByRole('button', { name: 'Vào sân chơi →' }).click();
  await expect(page.getByText('● Đã kết nối máy chủ', { exact: false })).toBeVisible();
  const guest = (await page.evaluate(() =>
    fetch('http://127.0.0.1:4000/api/auth/me', { credentials: 'include' }).then((response) =>
      response.json(),
    ),
  )) as { playerId: string };

  const typoEmail = 'typo-' + email;
  await page.goto('/register');
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill(typoEmail);
  await page.getByRole('button', { name: 'Gửi mã', exact: true }).click();
  await expect(page.getByLabel('Mã xác minh 6 số')).toBeVisible();

  // Test Đổi email then start again
  await page.getByRole('button', { name: 'Đổi email' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(typoEmail);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã', exact: true }).click();
  await expect(page.getByLabel('Mã xác minh 6 số')).toBeVisible();

  // Reload at OTP step restores active challenge
  await page.reload();
  await expect(page.getByLabel('Mã xác minh 6 số')).toBeVisible();
  await page.getByLabel('Mã xác minh 6 số').fill(await code());
  await page.getByRole('button', { name: 'Xác minh mã' }).click();
  await expect(page.getByLabel('Nickname')).toHaveValue('Guest OTP');

  // Toggle password visibility
  const passwordInput = page.getByLabel('Mật khẩu', { exact: true });
  await passwordInput.fill(initialPassword);
  await expect(passwordInput).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Hiện hoặc ẩn mật khẩu', exact: true }).click();
  await expect(passwordInput).toHaveAttribute('type', 'text');

  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(initialPassword);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(
    page.getByRole('heading', { name: 'Hôm nay, bạn muốn chơi gì?', exact: true }),
  ).toBeVisible();

  const account = (await page.evaluate(() =>
    fetch('http://127.0.0.1:4000/api/auth/me', { credentials: 'include' }).then((response) =>
      response.json(),
    ),
  )) as { kind: string; playerId: string };
  expect(account).toMatchObject({ kind: 'account', playerId: guest.playerId });
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hôm nay, bạn muốn chơi gì?', exact: true }),
  ).toBeVisible();

  // Create a second guest on /play to test IdentitySwitchDialog on /login
  await page.goto('/play');
  await page.getByLabel('Biệt danh').fill('Temp Guest');
  await page.getByRole('button', { name: 'Vào sân chơi →' }).click();
  await expect(page.getByText('● Đã kết nối máy chủ', { exact: false })).toBeVisible();

  // Test mobile viewport (390px) on forgot-password and login
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/forgot-password');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã', exact: true }).click();
  await expect(page.getByLabel('Mã xác minh 6 số')).toBeVisible();
  await page.getByLabel('Mã xác minh 6 số').fill(await code());
  await page.getByRole('button', { name: 'Xác minh mã' }).click();
  await page.getByLabel('Mật khẩu', { exact: true }).fill(newPassword);
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Lưu mật khẩu' }).click();
  await page.getByRole('link', { name: 'Đăng nhập', exact: true }).click();

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  // IdentitySwitchDialog should appear because current session is a guest
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    'Coins, XP và vật phẩm của hồ sơ khách không tự cộng vào tài khoản này.',
  );
  await page.getByRole('button', { name: 'Ở lại' }).click();
  await expect(dialog).toHaveCount(0);

  // Submit again and confirm switch
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục đăng nhập' }).click();
  await expect(
    page.getByRole('heading', { name: 'Hôm nay, bạn muốn chơi gì?', exact: true }),
  ).toBeVisible();
});
