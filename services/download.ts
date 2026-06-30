import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function downloadPdf(url: string, fileName: string, mimeType = 'application/pdf') {
  const localUri = FileSystem.documentDirectory + fileName;
  const { uri } = await FileSystem.downloadAsync(url, localUri);

  if (Platform.OS === 'android') {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        fileName,
        mimeType,
      );
      await FileSystem.writeAsStringAsync(newUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return true;
    }
  }

  // 2-B. iOS (또는 안드로이드 폴백): 공유 시트 띄우기
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
    return true;
  }

  return false;
}