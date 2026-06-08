"use client";

import { useTransition } from "react";

interface Props {
  action: (fd: FormData) => Promise<void>;
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}

export default function DeleteButton({ action, confirmMessage, className, children }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    startTransition(() => action(new FormData()));
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className={className}
    >
      {isPending ? "Deleting…" : children}
    </button>
  );
}
