import { createBrowserRouter } from "react-router-dom";
import { FormEditorPage } from "../pages/editor/FormEditorPage";

export const router = createBrowserRouter([
  {
    path: "/editor",
    element: <FormEditorPage />,
  },
  {
    path: "*",
    element: <FormEditorPage />,
  },
]);
