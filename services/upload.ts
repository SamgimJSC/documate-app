import * as SecureStore from 'expo-secure-store';
import axiosInstance from '@/utils/axios.util';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export type AiStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
export type TempDocumentType = 'DOCUMENT' | 'RECEIPT';

export interface TempFileItem {
  id: string;
  fileUrl: string;
  pageNo: number;
}

export interface TempUploadResponse {
  tempDocumentId: string;
  files: TempFileItem[];
}

export interface TempDocumentListItem {
  tempDocumentId: string;
  aiStatus: AiStatus;
  createdAt: string;
  files: TempFileItem[];
  resultId?: string | null;
  resultDocumentId?: string | null;
  documentType?: TempDocumentType | null;
}

// processing-center.tsx 호환성 유지
export type AiStatusResponse = {
  tempDocumentId: string;
  aiStatus: AiStatus;
  resultId?: string | null;
  documentType?: TempDocumentType | null;
};

// GET /upload/start → tempDocumentId 발급
export async function startUpload(): Promise<{ tempDocumentId: string }> {
  const res = await axiosInstance.get('/upload/start');
  return (res as any).data;
}

// POST /upload/:tempDocumentId → 파일 1장 업로드 (multipart/form-data)
// Content-Type 헤더를 직접 설정하지 않아야 boundary가 자동으로 붙음
export async function uploadTempFile(
  tempDocumentId: string,
  fileUri: string,
  mimeType: string,
  fileName: string,
): Promise<TempUploadResponse> {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.');
  let token: string | null = null;
  try { token = await SecureStore.getItemAsync('accessToken'); } catch {}

  return new Promise<TempUploadResponse>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', { uri: fileUri, type: mimeType, name: fileName } as any);
    formData.append('pageNo', '1');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/upload/${tempDocumentId}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Content-Type 미설정 → React Native가 multipart boundary 자동 추가
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json?.data ?? json);
        } catch {
          reject(new Error('응답 파싱 실패'));
        }
      } else {
        reject(new Error(`업로드 실패: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('업로드 네트워크 오류'));
    xhr.ontimeout = () => reject(new Error('업로드 시간 초과'));
    xhr.send(formData);
  });
}

// POST /upload/:tempDocumentId/ai → AI 분석 큐 등록 (파일 ID 목록 필요)
export async function requestAiAnalysis(
  tempDocumentId: string,
  files: Array<{ id: string; pageNo: number }>,
): Promise<void> {
  await axiosInstance.post(`/upload/${tempDocumentId}/ai`, { files });
}

export async function getTempDocumentDetail(
  tempDocumentId: string,
): Promise<TempDocumentListItem> {
  const res = await axiosInstance.get(`/upload/${tempDocumentId}`);
  return (res as any)?.data ?? res;
}

export async function reorderTempFiles(
  tempDocumentId: string,
  files: Array<{ id: string; pageNo: number }>,
): Promise<TempDocumentListItem> {
  const res = await axiosInstance.patch(`/upload/${tempDocumentId}/reorder`, {
    files,
  });
  return (res as any)?.data ?? res;
}

export async function deleteTempDocument(tempDocumentId: string): Promise<void> {
  await axiosInstance.delete(`/upload/${tempDocumentId}`);
}

export async function deleteAllTempFiles(tempDocumentId: string): Promise<void> {
  await axiosInstance.delete(`/upload/${tempDocumentId}/files`);
}

export async function deleteTempFile(
  tempDocumentId: string,
  fileId: string,
): Promise<void> {
  await axiosInstance.delete(`/upload/${tempDocumentId}/files/${fileId}`);
}

// GET /upload/temp-list → 전체 임시 문서 상태 조회 (폴링용)
export async function getTempDocumentList(): Promise<TempDocumentListItem[]> {
  const res = await axiosInstance.get('/upload/temp-list');
  const payload = (res as any)?.data ?? res;
  return Array.isArray(payload) ? payload : [];
}

// processing-center.tsx 호환: 특정 tempDocumentId의 상태 반환
export async function getTempDocumentStatus(tempDocumentId: string): Promise<AiStatusResponse> {
  let found: TempDocumentListItem | undefined;
  try {
    found = await getTempDocumentDetail(tempDocumentId);
  } catch {
    const list = await getTempDocumentList();
    found = list.find((item) => item.tempDocumentId === tempDocumentId);
  }
  return {
    tempDocumentId,
    aiStatus: found?.aiStatus ?? 'PENDING',
    resultId: found?.resultId ?? found?.resultDocumentId ?? null,
    documentType: found?.documentType ?? null,
  };
}

// DONE / FAILED 될 때까지 intervalMs마다 polling
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
