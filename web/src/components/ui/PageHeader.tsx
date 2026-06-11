import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  /** Buttons / links rendered flush-right in the header */
  actions?: ReactNode;
  /** Optional back-navigation element (e.g. a Link with a chevron icon) */
  back?: ReactNode;
}

/**
 * Sticky page-level header used at the top of every app page.
 * Renders inside the scrollable layout — stays fixed at the top while content scrolls.
 *
 * Usage:
 *   <PageHeader title="Programs" subtitle="Define what you measure." actions={<NewButton />} />
 */
export default function PageHeader({ title, subtitle, actions, back }: Props) {
  return (
    <div className="page-header">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {back && <div className="flex-shrink-0 text-muted hover:text-ink transition-colors">{back}</div>}
          <div className="min-w-0">
            <h1 className="page-title truncate">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
