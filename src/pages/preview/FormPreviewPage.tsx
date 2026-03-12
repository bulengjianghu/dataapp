import { Button, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { FormPreviewRenderer } from "../editor/components/FormPreviewRenderer";

export function FormPreviewPage() {
  const navigate = useNavigate();

  return (
    <div className="preview-page-shell">
      <header className="preview-page-shell__toolbar">
        <Space>
          <Button onClick={() => navigate("/editor")}>返回编辑器</Button>
        </Space>
      </header>
      <main className="preview-page-shell__body">
        <FormPreviewRenderer />
      </main>
    </div>
  );
}
