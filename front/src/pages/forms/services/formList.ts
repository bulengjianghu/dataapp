import { request } from "../../../services/api";

type ApiResult<T> = {
  code: string;
  message: string;
  data: T;
};

export type DraftFormSummary = {
  formId: string;
  formCode: string;
  name: string;
  description: string;
  status: string;
  draftVersion: number;
  updatedAt: string;
};

type DraftFormSummaryResponse = {
  formId: number;
  formCode: string;
  name: string;
  description: string;
  status: string;
  draftVersion: number;
  updatedAt: string;
};

type CreateFormResponse = {
  formId: number;
};

export async function listDraftFormsOnServer(): Promise<DraftFormSummary[]> {
  const items = await request<DraftFormSummaryResponse[]>("/api/admin/forms");
  return items.map((item) => ({
    ...item,
    formId: String(item.formId),
  }));
}

export async function createDraftFormOnServer(name = "未命名表单"): Promise<string> {
  const created = await request<CreateFormResponse>("/api/admin/forms", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return String(created.formId);
}

export async function deleteFormOnServer(formId: string) {
  await request<null>(`/api/admin/forms/${formId}`, {
    method: "DELETE",
  });
}
