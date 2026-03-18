import type { ReactNode } from "react";
import { Empty } from "antd";

export function ContainerLayout({
  hasChildren,
  emptyText,
  emptyFallback,
  className,
  children,
}: {
  hasChildren: boolean;
  emptyText: string;
  emptyFallback?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  if (!hasChildren) {
    return emptyFallback ?? (
      <div className="node-layout__empty">
        <Empty description={emptyText} />
      </div>
    );
  }

  return <div className={["node-layout__grid", className].filter(Boolean).join(" ")}>{children}</div>;
}
