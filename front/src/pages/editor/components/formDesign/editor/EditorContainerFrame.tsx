import { Tag } from "antd";
import type { ReactNode } from "react";

export function EditorContainerFrame({
  isOver,
  required,
  tagLabel = "容器",
  tagColor = "blue",
  description,
  variant = "container",
  headDropRef,
  headDropOver,
  children,
}: {
  isOver: boolean;
  required: boolean;
  tagLabel?: string;
  tagColor?: string;
  description?: string;
  variant?: "container" | "detail_table";
  headDropRef?: (element: HTMLDivElement | null) => void;
  headDropOver: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={["editor-container__children", variant === "detail_table" ? "editor-container__children--detail-table" : "", isOver ? "is-over" : ""]
        .filter(Boolean)
        .join(" ")}
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
        <Tag color={tagColor} className="editor-node-card__required">
          {tagLabel}
        </Tag>
        {description ? <span className="editor-container__description">{description}</span> : null}
      </div>
      {children}
    </div>
  );
}
