import type { ReactNode } from "react";
import { Empty } from "antd";
import { ContainerLayout } from "../shared/ContainerLayout";

export function RuntimeContainerFrame({
  hasChildren,
  emptyText,
  children,
}: {
  hasChildren: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <div className="runtime-container-frame">
      <ContainerLayout
        hasChildren={hasChildren}
        emptyText={emptyText}
        emptyFallback={<Empty description={emptyText} />}
      >
        {children}
      </ContainerLayout>
    </div>
  );
}
