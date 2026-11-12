'use client';

export type AuthIllustrationVariant = 'login' | 'email' | 'otp' | 'password' | 'success';

const ILLUSTRATION_CONFIG: Record<
  AuthIllustrationVariant,
  { src: string; alt: string; caption: string }
> = {
  login: {
    src: '/images/auth/auth-login.jpg',
    alt: 'Thỏ tím và chim xanh bằng đất sét 3D mở cánh cửa nhỏ phát sáng',
    caption: 'Chơi tiếp thôi!',
  },
  email: {
    src: '/images/auth/auth-email.jpg',
    alt: 'Minh họa 3D đất sét thỏ tím tìm chìa khóa dưới đệm mây cùng chim xanh cầm phong bì',
    caption: 'Tìm lại chìa khóa',
  },
  otp: {
    src: '/images/auth/auth-otp.jpg',
    alt: 'Chim xanh đưa thư xác minh ma thuật cho thỏ tím DuoQuest',
    caption: 'Thư đến rồi!',
  },
  password: {
    src: '/images/auth/auth-password.jpg',
    alt: 'Thỏ tím và chim xanh cùng mở khóa mới',
    caption: 'Chìa khóa mới',
  },
  success: {
    src: '/images/auth/auth-success.jpg',
    alt: 'Thỏ tím và chim xanh DuoQuest ăn mừng bên ổ khóa và chìa khóa vàng',
    caption: 'Khóa an toàn đã đóng!',
  },
};

export function AuthIllustration({
  variant,
  captionOverride,
}: {
  variant: AuthIllustrationVariant;
  captionOverride?: string;
}) {
  const item = ILLUSTRATION_CONFIG[variant];
  return (
    <div className="auth-mascot-wrapper">
      <div className="auth-mascot-frame auth-mascot-float">
        <img
          src={item.src}
          alt={item.alt}
          className="auth-mascot-img"
          loading="eager"
          width={380}
          height={380}
        />
      </div>
      <p className="auth-mascot-caption">{captionOverride ?? item.caption}</p>
    </div>
  );
}
