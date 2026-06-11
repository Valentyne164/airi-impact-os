import type { ReactNode } from "react";

type Padding = "none" | "sm" | "md";

interface Props {
  children: ReactNode;
  padding?: Padding;
  className?: string;
  /** Renders a title row with an optional right-side accessory */
  header?: { title: string; sub?: string; accessory?: ReactNode };
}

const PAD: Record<Padding, string> = {
  none: "",
  sm:   "p-5",
  md:   "p-6",
};

/**
 * Standard card shell used across the app.
 * Provides consistent radius (2xl), border, and shadow.
 *
 * Usage:
 *   <Card padding="md">…</Card>
 *   <Card header={{ title: "Metrics", accessory: <AddButton /> }}>…</Card>
 */
export default function Card({ children, padding = "md", className = "", header }: Props) {
  return (
    <div className={`card ${PAD[padding]} ${className}`}>
      {header && (
        <div className={`flex items-center justify-between gap-4 ${padding !== "none" ? "mb-4" : "px-6 py-4 border-b border-line"}`}>
          <div>
            <p className="section-heading">{header.title}</p>
            {header.sub && <p className="text-xs text-muted mt-0.5">{header.sub}</p>}
          </div>
          {header.accessory && <div className="flex-shrink-0">{header.accessory}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
