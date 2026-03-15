import { createBrowserRouter } from "react-router-dom";
import { FormEditorPage } from "../pages/editor/FormEditorPage";
import { FormListPage } from "../pages/forms/FormListPage";
import { FormPreviewPage } from "../pages/preview/FormPreviewPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <FormListPage />,
  },
  {
    path: "/forms",
    element: <FormListPage />,
  },
  {
    path: "/editor",
    element: <FormEditorPage />,
  },
  {
    path: "/preview",
    element: <FormPreviewPage />,
  },
  {
    path: "*",
    element: <FormListPage />,
  },
]);
