import { Tag } from "antd";
import type { ReactNode } from "react";

export function EditorContainerFrame({
  isOver,
  required,
  headDropRef,
  headDropOver,
  children,
}: {
  isOver: boolean;
  required: boolean;
  headDropRef?: (element: HTMLDivElement | null) => void;
  headDropOver: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={["editor-container__children", isOver ? "is-over" : ""].filter(Boolean).join(" ")}
    >
      <div
        ref={headDropRef}
        className={["editor-container__meta", "editor-container__head-dropzone", headDropOver ? "is-over" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {required ? (
          <span aria-label="必填" className="editor-node-card__required-mark editor-container__required-mark">
            *
          </span>
        ) : null}
        <Tag color="blue" className="editor-node-card__required">
          容器
        </Tag>
      </div>
      {children}
    </div>
  );
}
