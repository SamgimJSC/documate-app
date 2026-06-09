import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 앱이 켜져 있을 때도 알림이 배너로 뜨도록 하는 핸들러 (앱 시작 시 1회 등록)
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// 알림 권한 요청 + 안드로이드 채널 생성 (앱 시작 시 1회 호출)
export async function registerNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본 알림',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    return res.status === 'granted';
  }
  return true;
}

// 특정 날짜(YYYY-MM-DD)의 오전 9시에 알림 예약. 예약 id 반환 (과거면 null)
export async function scheduleExpiryNotification(
  dateStr: string,
  title: string,
  body: string
): Promise<string | null> {
  // 해당 날짜 오전 9시로 설정
  const target = new Date(dateStr);
  target.setHours(9, 0, 0, 0);

  // 이미 지난 시각이면 예약하지 않음
  if (target.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
    },
  });
  return id;
}

// 예약된 알림 취소
export async function cancelNotification(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 이미 없는 id면 무시
  }
}

// TODO: 작동 확인 후 제거. 즉시 알림 (테스트용)
export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: { title: '테스트 알림 🔔', body: '알림이 정상 작동합니다!', sound: true },
    trigger: null,
  });
}

// TODO: 작동 확인 후 제거. 10초 뒤 알림 (테스트용 - 앱을 닫아도 뜨는지 확인할 때)
export async function sendTestNotificationIn10s() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ 10초 예약 알림',
      body: '예약 알림이 정상 작동합니다! 앱을 닫아도 떠요.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
    },
  });
}