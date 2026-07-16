const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

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
  isSecured?: boolean;
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
  inputMethod: "OCR" | "MANUAL";
  categoryId?: number;
  title?: string;
  fileType?: Exclude<DocumentFileType, "PDF"> | null;
  fileSizeBytes?: string;
  pageCount?: number;
  ocrText?: string;
  extractedData?: Record<string, unknown>;
  aiConfidence?: number;
  issueDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  files?: {
    fileUrl: string;
    pageNo: number;
  }[];
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

export type UpdateDocumentCategoryBody = {
  name?: string;
  defaultNotifyOffsetDays?: number | null;
  isSecured?: boolean;
  description?: string;
};

export type DocumentUnlockResponse = {
  unlockToken?: string;
  token?: string;
  expiresAt?: string;
};

export type DocumentAiStatusResponse = {
  documentId?: string;
  aiStatus: DocumentAiStatus;
  progress?: number;
  message?: string;
};

// TODO [배포 전]: 인증 방식 확정 후 아래 두 가지 중 하나로 교체
//   A) 쿠키 방식 유지 시 → react-native-cookies 라이브러리 설치 후 쿠키 수동 관리
//      (React Native의 fetch는 브라우저와 달리 Set-Cookie를 자동 저장하지 않음)
//   B) JWT Bearer 토큰 방식으로 변경 시 → credentials 제거 후
//      headers에 Authorization: `Bearer ${token}` 추가 (auth-store에서 token 읽어옴)
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

// PATCH /documents/categories/:categoryId
export async function updateDocumentCategory(
  categoryId: number,
  body: UpdateDocumentCategoryBody
) {
  const response = await documentRequest<ApiResponse<DocumentCategory>>(
    `/documents/categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
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

// POST /documents/:documentId/unlock
export async function unlockDocument(documentId: string, pinNumber: string) {
  const response = await documentRequest<ApiResponse<DocumentUnlockResponse>>(
    `/documents/${documentId}/unlock`,
    {
      method: "POST",
      body: JSON.stringify({ pinNumber }),
    }
  );

  return response.data;
}

// GET /documents/:documentId/ai-status
export async function getDocumentAiStatus(documentId: string) {
  const response = await documentRequest<ApiResponse<DocumentAiStatusResponse>>(
    `/documents/${documentId}/ai-status`,
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

// PATCH /documents/:documentId/lock
export async function updateDocumentSecured(
  documentId: string,
  isSecured: boolean
) {
  const response = await documentRequest<ApiResponse<DocumentItem>>(
    `/documents/${documentId}/lock`,
    {
      method: "PATCH",
      body: JSON.stringify({ isSecured }),
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
