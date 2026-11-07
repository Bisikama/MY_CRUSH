export type AuthEmail = { subject: string; text: string; html: string };

function layout(preview: string, label: string, title: string, content: string): string {
  return `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DuoQuest</title></head>
<body style="margin:0;padding:0;background-color:#f6f7f2;color:#20352d;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f7f2;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <tr><td style="padding:0 8px 24px;font-size:26px;font-weight:800;letter-spacing:-1px;">DuoQuest<span style="color:#b78b32;">.</span><div style="margin-top:6px;font-size:12px;font-weight:400;letter-spacing:0;color:#59685f;">HỌC CÙNG NHAU · CHƠI HẾT MÌNH</div></td></tr>
        <tr><td style="padding:28px 24px;background-color:#28634b;border-radius:20px 20px 0 0;">
          <p style="margin:0 0 16px;font-size:11px;line-height:18px;letter-spacing:2px;color:#f4edbf;font-weight:700;">${label}</p>
          <h1 style="margin:0;font-size:28px;line-height:36px;color:#ffffff;">${title}</h1>
        </td></tr>
        <tr><td style="padding:28px 24px;background-color:#ffffff;border:1px solid #dde3d9;border-top:0;border-radius:0 0 20px 20px;">
          ${content}
          <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #dde3d9;font-size:14px;line-height:22px;">Hẹn gặp bạn ở Quiz Battle,<br><strong>Đội ngũ DuoQuest</strong></p>
        </td></tr>
        <tr><td align="center" style="padding:22px 12px;font-size:12px;line-height:20px;color:#59685f;">DuoQuest · Solo / Duel / Co-op<br>Email tự động, vui lòng không trả lời thư này.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function verificationEmail(purpose: 'REGISTER' | 'RESET_PASSWORD', code: string): AuthEmail {
  // Only a six-digit code may enter the HTML; no recipient or user content is interpolated.
  if (code.length !== 6 || !/^\d{6}$/.test(code))
    throw new Error('Email verification code must contain six digits.');
  const registration = purpose === 'REGISTER';
  const subject = registration
    ? 'Xác minh email để bắt đầu cùng DuoQuest'
    : 'Mã đặt lại mật khẩu DuoQuest';
  const title = registration ? 'Sẵn sàng vào cuộc?' : 'Quay lại cuộc chơi.';
  const intro = registration
    ? 'Chỉ còn một bước để bắt đầu hành trình học và chơi. Nhập mã bên dưới trên trang đăng ký DuoQuest để xác minh email của bạn.'
    : 'Bạn vừa yêu cầu đặt lại mật khẩu DuoQuest. Nhập mã bên dưới trên trang đặt lại mật khẩu để tiếp tục.';
  const warning = registration
    ? 'Nếu bạn không đăng ký DuoQuest, bạn có thể bỏ qua email này.'
    : 'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn vẫn giữ nguyên.';
  const text = `${subject}\n\n${intro}\n\nMã xác minh: ${code}\nMã có hiệu lực trong 5 phút.\n\nKhông chia sẻ mã này với bất kỳ ai. Đội ngũ DuoQuest không yêu cầu bạn cung cấp mã qua email hoặc tin nhắn.\n\n${warning}\n\nĐội ngũ DuoQuest\nHọc cùng nhau · Chơi hết mình\nEmail tự động, vui lòng không trả lời.`;
  const html = layout(
    'Mã xác minh có hiệu lực trong 5 phút. Quay lại DuoQuest để tiếp tục.',
    registration ? 'NHIỆM VỤ ĐẦU TIÊN · XÁC MINH EMAIL' : 'BẢO MẬT TÀI KHOẢN · ĐẶT LẠI MẬT KHẨU',
    title,
    `<p style="margin:0 0 24px;font-size:15px;line-height:25px;">${intro}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#edf5ee;border:1px solid #c9dfcf;border-radius:14px;">
      <tr><td align="center" style="padding:22px 12px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;color:#28634b;">MÃ XÁC MINH CỦA BẠN</p>
        <p dir="ltr" style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:34px;font-weight:700;line-height:44px;letter-spacing:7px;color:#20352d;">${code}</p>
        <p style="margin:12px 0 0;font-size:13px;line-height:20px;color:#42594a;">Có hiệu lực trong <strong>5 phút</strong></p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;line-height:22px;color:#42594a;">Quay lại tab DuoQuest đang mở để nhập mã. Nếu mã hết hạn, hãy yêu cầu gửi lại trên trang đó.</p>
    <p style="margin:20px 0 0;padding:14px;background-color:#fbf7e4;border-radius:10px;font-size:13px;line-height:22px;">${warning}</p>
    <p style="margin:16px 0 0;font-size:12px;line-height:20px;color:#59685f;">Không chia sẻ mã này với bất kỳ ai. Đội ngũ DuoQuest không yêu cầu bạn cung cấp mã qua email hoặc tin nhắn.</p>`,
  );
  return { subject, text, html };
}

export function passwordChangedEmail(): AuthEmail {
  const subject = 'Mật khẩu DuoQuest đã thay đổi';
  const intro = 'Mật khẩu tài khoản DuoQuest của bạn vừa được thay đổi thành công.';
  const action =
    'Nếu bạn không thực hiện thao tác này, hãy mở DuoQuest, vào trang đăng nhập và chọn Quên mật khẩu để đặt lại ngay.';
  return {
    subject,
    text: `${subject}\n\n${intro}\n\n${action}\n\nĐội ngũ DuoQuest\nEmail tự động, vui lòng không trả lời.`,
    html: layout(
      'Thông báo bảo mật: mật khẩu tài khoản DuoQuest vừa được thay đổi.',
      'BẢO MẬT TÀI KHOẢN',
      'Mật khẩu đã được cập nhật.',
      `<p style="margin:0;font-size:15px;line-height:25px;">${intro}</p>
      <p style="margin:24px 0 0;padding:18px;background-color:#fbf7e4;border-radius:12px;font-size:14px;line-height:24px;">${action}</p>`,
    ),
  };
}
