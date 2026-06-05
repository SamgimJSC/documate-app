import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// PDF URL을 받아서 기기에 저장 (또는 공유 시트로 내보내기)
export async function downloadPdf(url: string, fileName: string) {
  // 1. 임시 폴더로 먼저 내려받기
  const localUri = FileSystem.documentDirectory + fileName;
  const { uri } = await FileSystem.downloadAsync(url, localUri);

  if (Platform.OS === 'android') {
    // 2-A. 안드로이드: 사용자가 저장 폴더 선택 → 그 폴더에 저장
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        fileName,
        'application/pdf'
      );
      await FileSystem.writeAsStringAsync(newUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return true;
    }
    // 폴더 선택 안 하면 공유 시트로 대체
  }

  // 2-B. iOS (또는 안드로이드 폴백): 공유 시트 띄우기
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
    return true;
  }

  return false;
}