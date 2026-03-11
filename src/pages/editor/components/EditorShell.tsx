import type { CSSProperties } from "react";
import { Button } from "antd";
import { ComponentPalette } from "./ComponentPalette";
import { DesignCanvas } from "./DesignCanvas";
import { PropertyPanel } from "./PropertyPanel";

const shellStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "56px minmax(0, 1fr)",
  height: "100vh",
  background: "#f5f7fb",
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px",
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr) 340px",
  gap: "12px",
  minHeight: 0,
  padding: "12px",
};

const panelStyle: CSSProperties = {
  minHeight: 0,
  overflow: "auto",
};

export function EditorShell() {
  return (
    <div style={shellStyle}>
      <header style={toolbarStyle}>
        <strong>单表单编辑器</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <Button>保存草稿</Button>
          <Button>预览</Button>
          <Button type="primary">发布</Button>
        </div>
      </header>

      <main style={contentStyle}>
        <section style={panelStyle}>
          <ComponentPalette />
        </section>
        <section style={panelStyle}>
          <DesignCanvas />
        </section>
        <section style={panelStyle}>
          <PropertyPanel />
        </section>
      </main>
    </div>
  );
}
