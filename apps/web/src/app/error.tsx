'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
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
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Đã có sự cố xảy ra</h1>
      <p className="text-sm opacity-80">
        Trang gặp lỗi bất ngờ. Bạn có thể thử tải lại hoặc quay về trang chủ.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Thử lại
        </button>
        <Link
          href="/"
          className="rounded-xl border border-current/20 px-4 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
