import { useDraggable } from "@dnd-kit/core";
import {
  CalendarOutlined,
  CheckSquareOutlined,
  ContainerOutlined,
  FileAddOutlined,
  FieldNumberOutlined,
  FontSizeOutlined,
  MenuOutlined,
  MoreOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { useState, type CSSProperties } from "react";
import { Card, Flex, Typography } from "antd";
import type { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { selectFormId } from "../../../store/selectors/editorSelectors";
import { markDirty, setFormId } from "../../../store/slices/formSchemaSlice";

type PaletteCategory = "基础字段" | "选项字段" | "附件" | "容器入口";

type PaletteItem = {
  key: string;
  label: string;
  category: PaletteCategory;
  icon: ReactNode;
  accent: string;
};

const paletteItems: PaletteItem[] = [
  { key: "input", label: "单行文本", category: "基础字段", icon: <FontSizeOutlined />, accent: "#1677ff" },
  { key: "textarea", label: "多行文本", category: "基础字段", icon: <MenuOutlined />, accent: "#0f766e" },
  { key: "number", label: "数字", category: "基础字段", icon: <FieldNumberOutlined />, accent: "#d97706" },
  { key: "date", label: "日期", category: "基础字段", icon: <CalendarOutlined />, accent: "#7c3aed" },
  { key: "radio", label: "单选", category: "选项字段", icon: <PictureOutlined rotate={90} />, accent: "#2563eb" },
  { key: "checkbox", label: "多选", category: "选项字段", icon: <CheckSquareOutlined />, accent: "#0891b2" },
  { key: "select", label: "下拉", category: "选项字段", icon: <MoreOutlined />, accent: "#4f46e5" },
  { key: "upload", label: "附件上传", category: "附件", icon: <FileAddOutlined />, accent: "#dc2626" },
  { key: "container", label: "分组容器", category: "容器入口", icon: <ContainerOutlined />, accent: "#1d4ed8" },
];

const categories: PaletteCategory[] = ["基础字段", "选项字段", "附件", "容器入口"];

const tileStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  cursor: "grab",
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid #d9e3f0",
  background: "#ffffff",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.05)",
  transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
};

function DraggablePaletteItem({
  item,
  onClick,
}: {
  item: PaletteItem;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
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
    <button
      type="button"
      ref={setNodeRef}
      style={{
        ...tileStyle,
        opacity: isDragging ? 0.35 : 1,
        transform: isDragging ? "scale(0.98)" : hovered ? "translateY(-2px)" : "scale(1)",
        boxShadow: hovered
          ? "0 10px 20px rgba(15, 23, 42, 0.10)"
          : "0 6px 16px rgba(15, 23, 42, 0.05)",
        textAlign: "left",
        padding: 0,
        outline: "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <div
        style={{
          height: 48,
          background: `linear-gradient(135deg, ${item.accent}18, #ffffff 72%)`,
          borderBottom: "1px solid #e5edf6",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "#ffffff",
            border: `1px solid ${item.accent}22`,
            display: "grid",
            placeItems: "center",
            color: item.accent,
            fontSize: 18,
            boxShadow: "0 4px 10px rgba(15, 23, 42, 0.06)",
            pointerEvents: "none",
          }}
        >
          {item.icon}
        </div>
      </div>
      <div
        style={{
          height: 28,
          padding: "4px 6px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography.Text
          style={{
            fontSize: 11,
            lineHeight: 1.2,
            fontWeight: 600,
            color: "#1f2937",
            textAlign: "center",
          }}
        >
          {item.label}
        </Typography.Text>
      </div>
    </button>
  );
}

export function ComponentPalette() {
  const dispatch = useAppDispatch();
  const formId = useAppSelector(selectFormId);

  return (
    <Card title="组件面板" size="small">
      <Typography.Paragraph type="secondary">
        Sprint 1 先提供分组入口，Sprint 2 接入拖拽投放。
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        当前表单: {formId ?? "未初始化（点击任意组件将初始化为 local-draft）"}
      </Typography.Paragraph>
      <Flex vertical gap={12}>
        {categories.map((category) => {
          const group = paletteItems.filter((item) => item.category === category);
          return (
            <Card key={category} size="small" title={category}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {group.map((item) => (
                  <DraggablePaletteItem
                    key={item.key}
                    item={item}
                    onClick={() => {
                      if (!formId) {
                        dispatch(setFormId("local-draft"));
                      }
                      dispatch(markDirty(true));
                    }}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </Flex>
    </Card>
  );
}
