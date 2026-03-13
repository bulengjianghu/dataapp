import type { ReactNode } from "react";
import { Empty } from "antd";

export function ContainerLayout({
  hasChildren,
  emptyText,
  emptyFallback,
  children,
}: {
  hasChildren: boolean;
  emptyText: string;
  emptyFallback?: ReactNode;
  children: ReactNode;
}) {
  if (!hasChildren) {
    return emptyFallback ?? (
      <div className="node-layout__empty">
        <Empty description={emptyText} />
      </div>
    );
  }

  return <div className="node-layout__grid">{children}</div>;
}
