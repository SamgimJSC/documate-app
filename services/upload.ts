const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export type TempDocumentType = 'DOCUMENT' | 'RECEIPT';
export type AiStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export type TempUploadResponse = {
  tempDocumentId: string;
  uploadUrl: string;
  s3Key: string;
};

export type AiStatusResponse = {
  tempDocumentId: string;
  aiStatus: AiStatus;
  documentType?: TempDocumentType | null;
  resultId?: string | null;
  errorMessage?: string | null;
};

async function uploadRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.');
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`업로드 API 오류: ${response.status} ${text}`);
  }
  const json = await response.json();
  return (json?.data ?? json) as T;
}

// POST /uploads/temp-document → presigned URL + tempDocumentId 발급
export async function createTempUpload(params: {
  fileName: string;
  mimeType: string;
  fileType?: TempDocumentType;
}): Promise<TempUploadResponse> {
  return uploadRequest('/uploads/temp-document', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// PUT {uploadUrl} → S3에 이미지 직접 업로드 (presigned URL은 인증 불필요)
export async function uploadToS3(localUri: string, uploadUrl: string, mimeType: string) {
  const imageRes = await fetch(localUri);
  const blob = await imageRes.blob();
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: blob,
  });
  if (!res.ok) throw new Error(`S3 업로드 실패: ${res.status}`);
}

// POST /uploads/request-ai → Redis 큐에 분석 요청 push
export async function requestAiAnalysis(tempDocumentId: string): Promise<void> {
  await uploadRequest('/uploads/request-ai', {
    method: 'POST',
    body: JSON.stringify({ tempDocumentId }),
  });
}

// GET /temp-documents/:id/status → DONE / FAILED 될 때까지 폴링용
export async function getTempDocumentStatus(tempDocumentId: string): Promise<AiStatusResponse> {
  return uploadRequest(`/temp-documents/${tempDocumentId}/status`, {
    method: 'GET',
  });
}

// DONE / FAILED 될 때까지 intervalMs마다 polling, timeoutMs 초과 시 reject
export function pollUntilDone(
  tempDocumentId: string,
  intervalMs = 4000,
  timeoutMs = 120000,
): Promise<AiStatusResponse> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(async () => {
      try {
        const status = await getTempDocumentStatus(tempDocumentId);
        if (status.aiStatus === 'DONE' || status.aiStatus === 'FAILED') {
          clearInterval(timer);
          resolve(status);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          reject(new Error('AI 분석 시간이 초과되었습니다'));
        }
      } catch (e) {
        clearInterval(timer);
        reject(e);
      }
    }, intervalMs);
  });
}
