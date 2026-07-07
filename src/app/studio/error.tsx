"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function StudioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="rounded-[1.6rem] border border-border bg-surface/88 p-6 shadow-xl shadow-text-primary/5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
        Studio error
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-text-primary">
        Trang quản trị vừa gặp lỗi khi tải dữ liệu.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Mình đã giữ lỗi trong phạm vi Studio để phần còn lại của website không bị ảnh hưởng.
      </p>
      <Button className="mt-5" onClick={reset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </section>
  );
}
