import api from "./api";

// 타입 정의
export interface Document {
  id: number;
  name: string;
  status: "DONE" | "FAILED" | "ANALYZING";
  pages: number;
  uploadedAt: string;
  category: string;
}

// 업로드 현황 목록
export const fetchUploadStatus = () =>
  api.get<Document[]>("/documents/upload-status");

// 문서 상세
export const fetchDocumentDetail = (documentId: number) =>
  api.get<Document>(`/documents/${documentId}`);

// 분석 재시도
export const retryAnalysis = (documentId: number) =>
  api.post(`/documents/${documentId}/retry`);
