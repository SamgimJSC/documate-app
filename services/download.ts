import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';

/** 서버의 GET /documents/:id/download 엔드포인트로 PDF를 받아 저장/공유한다. */
export async function downloadDocumentPdf(
  documentId: string,
  title: string,
): Promise<boolean> {
  const safeTitle = title.replace(/[^\w가-힣\s\-]/g, '').trim() || 'document';
  const pdfFileName = `${safeTitle}.pdf`;

  // fetch는 React Native의 네이티브 HTTP 레이어를 사용하므로 쿠키가 자동으로 전송됨
  const response = await fetch(`${BASE_URL}/documents/${documentId}/download`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`다운로드 실패: ${response.status}`);
  }

  // ArrayBuffer → base64 변환 (대용량 파일 대비 청크 처리)
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  const base64 = btoa(binary);

  const cacheUri = FileSystem.cacheDirectory + pdfFileName;
  await FileSystem.writeAsStringAsync(cacheUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Android: SAF로 지정 폴더에 저장
  if (Platform.OS === 'android') {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        pdfFileName,
        'application/pdf',
      );
      await FileSystem.writeAsStringAsync(safUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return true;
    }
  }

  // iOS (또는 Android SAF 거부 시): 공유 시트
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(cacheUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: pdfFileName,
    });
    return true;
  }

  return false;
}
