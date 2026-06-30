import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** 이미지(JPG/PNG)를 PDF로 변환한 뒤 저장/공유한다. PDF는 그대로 처리. */
export async function downloadAsPdf(
  url: string,
  title: string,
  fileType: 'PDF' | 'JPG' | 'PNG' = 'PDF',
): Promise<boolean> {
  const safeTitle = title.replace(/[^\w가-힣\s\-]/g, '').trim() || 'document';
  const pdfFileName = `${safeTitle}.pdf`;

  let pdfUri: string;

  if (fileType === 'PDF') {
    const dest = FileSystem.cacheDirectory + pdfFileName;
    const { uri } = await FileSystem.downloadAsync(url, dest);
    pdfUri = uri;
  } else {
    // 이미지 → base64 → HTML → PDF
    const tempImg = FileSystem.cacheDirectory + `temp_img.${fileType.toLowerCase()}`;
    await FileSystem.downloadAsync(url, tempImg);
    const base64 = await FileSystem.readAsStringAsync(tempImg, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.deleteAsync(tempImg, { idempotent: true });

    const mime = fileType === 'JPG' ? 'image/jpeg' : 'image/png';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; display:flex; align-items:center; justify-content:center;
           min-height:100vh; }
    img  { max-width:100%; max-height:100vh; object-fit:contain; display:block; }
  </style>
</head>
<body>
  <img src="data:${mime};base64,${base64}" />
</body>
</html>`;

    const Print = await import('expo-print');
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    pdfUri = uri;
  }

  // Android: SAF로 지정 폴더에 저장
  if (Platform.OS === 'android') {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        pdfFileName,
        'application/pdf',
      );
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return true;
    }
  }

  // iOS (또는 Android SAF 거부): 공유 시트
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: pdfFileName,
    });
    return true;
  }

  return false;
}
