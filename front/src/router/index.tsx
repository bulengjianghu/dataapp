import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { FormEditorPage } from "../pages/editor/FormEditorPage";
import { FormListPage } from "../pages/forms/FormListPage";
import { FormPreviewPage } from "../pages/preview/FormPreviewPage";
import { RecordListPage } from "../pages/records/RecordListPage";

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
        path: "preview",
        element: <FormPreviewPage />,
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
