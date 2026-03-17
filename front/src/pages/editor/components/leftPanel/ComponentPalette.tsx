import { useDraggable, type DraggableAttributes } from "@dnd-kit/core";
import {
  CalendarOutlined,
  CheckSquareOutlined,
  ContainerOutlined,
  FileAddOutlined,
  FieldNumberOutlined,
  FontSizeOutlined,
  LinkOutlined,
  MenuOutlined,
  MoreOutlined,
  PictureOutlined,
  TableOutlined,
} from "@ant-design/icons";
import type { HTMLAttributes, ReactNode } from "react";
import { Card, Flex, Tabs, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { selectFormId } from "../../../../store/selectors/editorSelectors";
import { markDirty } from "../../../../store/slices/formSchemaSlice";
import { ComponentOutlineTree } from "./ComponentOutlineTree";

export type PaletteCategory = "基础字段" | "选项字段" | "附件" | "容器入口" | "关联组件";

export type PaletteItem = {
  key: string;
  label: string;
  category: PaletteCategory;
  icon: ReactNode;
  accent: string;
};

export const paletteItems: PaletteItem[] = [
  { key: "input", label: "单行文本", category: "基础字段", icon: <FontSizeOutlined />, accent: "#1677ff" },
  { key: "textarea", label: "多行文本", category: "基础字段", icon: <MenuOutlined />, accent: "#0f766e" },
  { key: "number", label: "数字", category: "基础字段", icon: <FieldNumberOutlined />, accent: "#d97706" },
  { key: "date", label: "日期", category: "基础字段", icon: <CalendarOutlined />, accent: "#7c3aed" },
  { key: "radio", label: "单选", category: "选项字段", icon: <PictureOutlined rotate={90} />, accent: "#2563eb" },
  { key: "checkbox", label: "多选", category: "选项字段", icon: <CheckSquareOutlined />, accent: "#0891b2" },
  { key: "select", label: "下拉", category: "选项字段", icon: <MoreOutlined />, accent: "#4f46e5" },
  { key: "upload", label: "附件上传", category: "附件", icon: <FileAddOutlined />, accent: "#dc2626" },
  { key: "container", label: "分组容器", category: "容器入口", icon: <ContainerOutlined />, accent: "#1d4ed8" },
  { key: "detail-table", label: "明细表", category: "容器入口", icon: <TableOutlined />, accent: "#0891b2" },
  { key: "relation-select", label: "关联选择", category: "关联组件", icon: <LinkOutlined />, accent: "#2563eb" },
];

const categories: PaletteCategory[] = ["基础字段", "选项字段", "附件", "容器入口", "关联组件"];

export function PaletteTile({
  item,
  dragging = false,
  onClick,
  dragRef,
  dragAttributes,
  dragListeners,
}: {
  item: PaletteItem;
  dragging?: boolean;
  onClick?: () => void;
  dragRef?: (element: HTMLButtonElement | null) => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: HTMLAttributes<HTMLElement>;
}) {
  return (
    <button
      type="button"
      ref={dragRef}
      className={[
        "editor-palette__tile",
        `editor-palette__tile--${item.key}`,
        dragging ? "is-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      {...dragListeners}
      {...dragAttributes}
    >
      <div className="editor-palette__preview">
        <div aria-hidden="true" className="editor-palette__preview-badge">
          {item.icon}
        </div>
      </div>
      <div className="editor-palette__label">
        <Typography.Text className="editor-palette__label-text">{item.label}</Typography.Text>
      </div>
    </button>
  );
}

function DraggablePaletteItem({ item, onClick }: { item: PaletteItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${item.key}`,
    data: {
      source: "palette",
      componentKey: item.key,
      category: item.category,
      label: item.label,
    },
  });

  return (
    <PaletteTile
      item={item}
      dragging={isDragging}
      onClick={onClick}
      dragRef={setNodeRef}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  );
}

export function ComponentPalette() {
  const dispatch = useAppDispatch();
  const formId = useAppSelector(selectFormId);

  return (
    <Card size="small" className="editor-left-panel" bodyStyle={{ padding: 12 }}>
      <Tabs
        className="editor-left-panel__tabs"
        defaultActiveKey="palette"
        items={[
          {
            key: "palette",
            label: "组件面板",
            children: (
              <Flex vertical className="editor-palette__groups">
                {categories.map((category) => {
                  const group = paletteItems.filter((item) => item.category === category);
                  return (
                    <Card key={category} size="small" title={category} className="editor-palette__group-card">
                      <div className="editor-palette__grid">
                        {group.map((item) => (
                          <DraggablePaletteItem
                            key={item.key}
                            item={item}
                            onClick={() => {
                              dispatch(markDirty(true));
                            }}
                          />
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </Flex>
            ),
          },
          {
            key: "outline",
            label: "组件大纲",
            children: <ComponentOutlineTree />,
          },
        ]}
      />
    </Card>
  );
}
