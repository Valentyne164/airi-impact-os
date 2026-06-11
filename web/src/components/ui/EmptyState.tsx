import type { ReactNode } from "react";

interface Props {
  /** Icon node — should be an SVG element, rendered inside a green rounded square */
  icon?: ReactNode;
  title: string;
  body?: string;
  /** Primary action button / link */
  action?: ReactNode;
}

/**
 * Reusable empty-state block — centred, with icon, title, description and optional CTA.
 * Wrap in a <Card> or use standalone inside a page body.
 *
 * Usage:
 *   <EmptyState
 *     icon={<BarChartIcon />}
 *     title="No metrics yet"
 *     body="Add fields for staff to log each day."
 *     action={<Link href="…" className="btn-primary btn">Add first metric</Link>}
 *   />
 */
export default function EmptyState({ icon, title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-4">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-success-light grid place-items-center text-green flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <p className="font-semibold text-sm text-ink">{title}</p>
        {body && <p className="text-xs text-muted mt-1 max-w-xs">{body}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
