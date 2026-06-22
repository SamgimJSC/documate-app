const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export type ApiResponse<T> = {
  message?: string;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  data: T;
};

export type DocumentCategoryCode =
  | "CONTRACT"
  | "RECEIPT"
  | "MEDICAL"
  | "WARRANTY"
  | "ETC";

export type DocumentFileType = "PDF" | "JPG" | "PNG";

export type DocumentAiStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export type SortOption = "createdAt" | "updatedAt" | "title" | "expiryDate";

export type SortOrder = "ASC" | "DESC";

export type DocumentCategory = {
  categoryId: number;
  code: DocumentCategoryCode;
  name: string;
  defaultNotifyOffsetDays: number | null;
  isSecured: boolean;
  description: string;
};

export type DocumentTag = {
  tagId: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type DocumentItem = {
  documentId: string;
  userId?: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType: DocumentFileType;
  categoryId?: number | null;
  fileSizeBytes?: string | null;
  pageCount?: number | null;
  ocrText?: string | null;
  extractedData?: Record<string, unknown> | null;
  aiConfidence?: number | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  renewalDate?: string | null;
  aiStatus?: DocumentAiStatus;
  isFavorite?: boolean;
  isConfirmed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  category?: DocumentCategory;
  documentTags?: {
    tag: DocumentTag;
  }[];
};

export type GetDocumentsParams = {
  keyword?: string;
  categoryId?: number;
  fileType?: DocumentFileType;
  aiStatus?: DocumentAiStatus;
  isFavorite?: boolean;
  tagId?: string;
  page?: number;
  limit?: number;
  sort?: SortOption;
  order?: SortOrder;
};

export type GetDocumentsResponse = {
  items: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
};

export type CreateDocumentBody = {
  title: string;
  fileUrl: string;
  fileName: string;
  fileType: DocumentFileType;
  categoryId?: number;
  fileSizeBytes?: string;
  pageCount?: number;
  ocrText?: string;
  extractedData?: Record<string, unknown>;
  aiConfidence?: number;
  issueDate?: string;
  expiryDate?: string;
  renewalDate?: string;
};

export type UpdateDocumentBody = {
  categoryId?: number;
  title?: string;
  ocrText?: string;
  extractedData?: Record<string, unknown>;
  aiConfidence?: number;
  issueDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  isConfirmed?: boolean;
  aiStatus?: DocumentAiStatus;
};

async function documentRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Documents API 요청 실패: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  return response.json();
}

// GET /documents/categories
export async function getDocumentCategories() {
  const response = await documentRequest<ApiResponse<DocumentCategory[]>>(
    "/documents/categories",
    {
      method: "GET",
    }
  );

  return response.data;
}

// GET /documents/tags
export async function getMyDocumentTags() {
  const response = await documentRequest<ApiResponse<DocumentTag[]>>(
    "/documents/tags",
    {
      method: "GET",
    }
  );

  return response.data;
}

// POST /documents
export async function createDocument(body: CreateDocumentBody) {
  const response = await documentRequest<ApiResponse<DocumentItem>>(
    "/documents",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  return response.data;
}

// GET /documents
export async function getDocuments(params: GetDocumentsParams = {}) {
  const query = new URLSearchParams();

  if (params.keyword) query.append("keyword", params.keyword);
  if (params.categoryId !== undefined) {
    query.append("categoryId", String(params.categoryId));
  }
  if (params.fileType) query.append("fileType", params.fileType);
  if (params.aiStatus) query.append("aiStatus", params.aiStatus);
  if (params.isFavorite !== undefined) {
    query.append("isFavorite", String(params.isFavorite));
  }
  if (params.tagId) query.append("tagId", params.tagId);

  query.append("page", String(params.page ?? 1));
  query.append("limit", String(params.limit ?? 20));
  query.append("sort", params.sort ?? "createdAt");
  query.append("order", params.order ?? "DESC");

  const response = await documentRequest<ApiResponse<GetDocumentsResponse>>(
    `/documents?${query.toString()}`,
    {
      method: "GET",
    }
  );

  return response.data;
}

// GET /documents/:documentId
export async function getDocumentDetail(documentId: string) {
  const response = await documentRequest<ApiResponse<DocumentItem>>(
    `/documents/${documentId}`,
    {
      method: "GET",
    }
  );

  return response.data;
}

// PATCH /documents/:documentId
export async function updateDocument(
  documentId: string,
  body: UpdateDocumentBody
) {
  const response = await documentRequest<ApiResponse<DocumentItem>>(
    `/documents/${documentId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );

  return response.data;
}

// PATCH /documents/:documentId/favorite
export async function updateDocumentFavorite(
  documentId: string,
  isFavorite: boolean
) {
  const response = await documentRequest<ApiResponse<DocumentItem>>(
    `/documents/${documentId}/favorite`,
    {
      method: "PATCH",
      body: JSON.stringify({
        isFavorite,
      }),
    }
  );

  return response.data;
}

// DELETE /documents/:documentId
export async function deleteDocument(documentId: string) {
  const response = await documentRequest<ApiResponse<null>>(
    `/documents/${documentId}`,
    {
      method: "DELETE",
    }
  );

  return response.data;
}

// POST /documents/:documentId/tags
export async function addDocumentTag(documentId: string, name: string) {
  const response = await documentRequest<ApiResponse<DocumentTag>>(
    `/documents/${documentId}/tags`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
      }),
    }
  );

  return response.data;
}

// DELETE /documents/:documentId/tags/:tagId
export async function deleteDocumentTag(documentId: string, tagId: string) {
  const response = await documentRequest<ApiResponse<null>>(
    `/documents/${documentId}/tags/${tagId}`,
    {
      method: "DELETE",
    }
  );

  return response.data;
}

// POST /documents/upload  (multipart/form-data)
// 백엔드가 S3 업로드 + OCR 처리 후 생성된 DocumentItem 반환
export async function uploadDocumentFile(
  fileUri: string,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<DocumentItem> {
  if (!BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const response = await fetch(`${BASE_URL}/documents/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `파일 업로드 실패: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  const json = await response.json() as ApiResponse<DocumentItem>;
  return json.data;
}