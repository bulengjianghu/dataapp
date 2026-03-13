import { createBrowserRouter } from "react-router-dom";
import { FormEditorPage } from "../pages/editor/FormEditorPage";
import { FormPreviewPage } from "../pages/preview/FormPreviewPage";

export const router = createBrowserRouter([
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
    element: <FormEditorPage />,
  },
]);
