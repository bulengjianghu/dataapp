import { Button, Space } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { FormPreviewRenderer } from "../editor/components/formDesign/runtime/FormPreviewRenderer";

export function FormPreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="preview-page-shell">
      <header className="preview-page-shell__toolbar">
        <Space>
          <Button onClick={() => navigate(`/editor${location.search}`)}>返回编辑器</Button>
        </Space>
      </header>
      <main className="preview-page-shell__body">
        <FormPreviewRenderer />
      </main>
    </div>
  );
}
