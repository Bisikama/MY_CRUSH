'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold">Đã có sự cố xảy ra</h1>
          <p className="text-sm opacity-80">
            Ứng dụng gặp lỗi bất ngờ. Vui lòng thử lại sau giây lát.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
