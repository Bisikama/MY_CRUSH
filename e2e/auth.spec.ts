import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.skip(
  process.env.RUN_AUTH_E2E !== '1',
  'Requires the loopback fake-mail API fixture and a _test database.',
);

test('guest upgrades via email OTP, can sign in again and reset the password', async ({
  page,
  request,
}) => {
  const email = randomUUID() + '@example.test';
  const initialPassword = 'A fresh browser test passphrase';
  const newPassword = 'A different browser test passphrase';
  const code = async () => {
    const message = await request.get('http://127.0.0.1:4000/__test/mail', { params: { email } });
    expect(message.ok()).toBe(true);
    return ((await message.json()) as { code: string }).code;
  };
  await page.goto('/');
  await page.getByLabel('Biệt danh').fill('Guest OTP');
  await page.getByRole('button', { name: 'Vào sân chơi →' }).click();
  await expect(page.getByText('● Đã kết nối máy chủ', { exact: false })).toBeVisible();
  const guest = (await page.evaluate(() =>
    fetch('http://127.0.0.1:4000/api/auth/me', { credentials: 'include' }).then((response) =>
      response.json(),
    ),
  )) as { playerId: string };

  await page.goto('/register');
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã', exact: true }).click();
  await expect(page.getByLabel('Mã xác minh 6 số')).toBeVisible();
  await page.reload();
  await page.getByLabel('Mã xác minh 6 số').fill(await code());
  await page.getByRole('button', { name: 'Xác minh mã' }).click();
  await expect(page.getByLabel('Nickname')).toHaveValue('Guest OTP');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(initialPassword);
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(initialPassword);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByText('● Đã kết nối máy chủ', { exact: false })).toBeVisible();

  const account = (await page.evaluate(() =>
    fetch('http://127.0.0.1:4000/api/auth/me', { credentials: 'include' }).then((response) =>
      response.json(),
    ),
  )) as { kind: string; playerId: string };
  expect(account).toMatchObject({ kind: 'account', playerId: guest.playerId });
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByLabel('Biệt danh')).toBeVisible();

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
  await expect(page.getByText('● Đã kết nối máy chủ', { exact: false })).toBeVisible();
});
