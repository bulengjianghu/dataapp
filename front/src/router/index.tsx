import { Suspense, lazy } from "react";
import { Spin } from "antd";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { FormEditorPage } from "../pages/editor/FormEditorPage";
import { FormListPage } from "../pages/forms/FormListPage";
import { RecordListPage } from "../pages/records/RecordListPage";

const InteractionRulePage = lazy(() =>
  import("../pages/rules/InteractionRulePage").then((module) => ({
    default: module.InteractionRulePage,
  }))
);

function RouterLoadingFallback() {
  return (
    <div style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
      <Spin size="large" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <FormListPage />,
      },
      {
        path: "forms",
        element: <FormListPage />,
      },
      {
        path: "editor",
        element: <FormEditorPage />,
      },
      {
        path: "editor/rules",
        element: (
          <Suspense fallback={<RouterLoadingFallback />}>
            <InteractionRulePage />
          </Suspense>
        ),
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "records",
        element: <RecordListPage />,
      },
      {
        path: "*",
        element: <FormListPage />,
      },
    ],
  },
]);
