import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 앱이 켜져 있을 때도 알림이 배너로 뜨도록 하는 핸들러 (앱 시작 시 1회 등록)
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,   // 커스텀 인앱 배너(NotificationBanner)로 대체
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

// 예약된 모든 알림 취소 (알림 토글 OFF 시 사용)
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// 문서 목록을 받아 enabled된 알림을 모두 다시 예약 (알림 토글 ON 시 사용)
// docs: { id, title, notifications: [{ date, label, enabled }] } 형태
export async function rescheduleAllNotifications(
  docs: { id: string; title: string; notifications: { date: string; label: string; enabled: boolean }[] }[]
) {
  // 중복 방지를 위해 기존 예약 전부 비우고 다시 예약
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const doc of docs) {
    for (const n of doc.notifications) {
      if (!n.enabled) continue;
      await scheduleExpiryNotification(
        n.date,
        n.label || '문서 만료 알림',
        `"${doc.title}" 문서가 곧 만료됩니다.`
      );
    }
  }
}

// 즉시 알림 (테스트용)
export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: { title: '테스트 알림', body: '알림이 정상 작동합니다!', sound: true },
    trigger: null,
  });
}

// Expo Push Token 발급
export async function getExpoPushToken() {
  if (!Device.isDevice) {
    console.log('푸시 토큰은 실제 기기에서만 발급됩니다.');
    return null;
  }

  const permissionGranted = await registerNotifications();

  if (!permissionGranted) {
    console.log('알림 권한이 허용되지 않았습니다.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log('Expo projectId를 찾을 수 없습니다.');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  console.log('Expo Push Token:', tokenData.data);

  return tokenData.data;
}

// 10초 뒤 알림 (테스트용 - 앱을 닫아도 뜨는지 확인할 때)
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

// ===============================
// 문서 알림(Alert) API
// ===============================

export type DocumentAlert = {
  alertId: string;
  documentId: string;
  offsetType: AlertOffsetType;
  notifyDate: string;
  reason: string | null;
  channelEmail: boolean;
  channelAppPush: boolean;
  channelWebPush: boolean;
  isSent: boolean;
  sentAt: string | null;
  createdAt: string;
};

export type AlertOffsetType = 'M1' | 'M3' | 'M6' | 'CUSTOM';

export type CreateAlertBody = {
  offsetType: AlertOffsetType;
  notifyDate: string;
  reason?: string | null;
  channelEmail?: boolean;
  channelAppPush?: boolean;
  channelWebPush?: boolean;
};

export type UpdateAlertBody = Partial<CreateAlertBody>;

export type NotificationSettings = {
  emailEnabled: boolean;
  pushEnabled: boolean;
};

function normalizeNotificationSettings(value: unknown): NotificationSettings {
  const settings = (value ?? {}) as Record<string, unknown>;
  return {
    emailEnabled: Boolean(
      settings.emailNotiEnabled ??
        settings.email_noti_enabled ??
        settings.emailEnabled ??
        settings.email_enabled,
    ),
    pushEnabled: Boolean(
      settings.pushEnabled ?? settings.appPushEnabled ?? settings.app_push_enabled,
    ),
  };
}

// ===============================
// 서버 알림 API 연결
// ===============================

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

export type NotificationStatus = "all" | "unread" | "read";

export type ServerNotification = {
  notificationId: string;
  documentId: string | null;
  category: string | null;
  title: string;
  body: string;
  isRead: boolean;
  sentAt: string;
};

export type CreateNotificationBody = {
  document_id?: string;
  title: string;
  body: string;
  notify_date?: string;
  channel_email?: boolean;
  channel_app_push?: boolean;
  channel_web_push?: boolean;
};


async function request<T>(
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
    throw new Error(`API 요청 실패: ${response.status} ${errorText}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  const json = JSON.parse(text);
  return (json?.data ?? json) as T;
}

// 알림 목록 조회
export async function getServerNotifications(params: {
  status?: NotificationStatus;
  page?: number;
  per_page?: number;
}): Promise<ServerNotification[]> {
  const { status = "all", page = 1, per_page = 20 } = params;

  const query = new URLSearchParams({
    status,
    page: String(page),
    per_page: String(per_page),
  });

  const response = await request<Record<string, unknown>[]>(
    `/notifications?${query.toString()}`,
    { method: "GET" }
  );
  const notifications = (Array.isArray(response) ? response : []).map(
    normalizeServerNotification,
  );
  const filtered = notifications.filter((item) => {
    if (status === 'unread') return !item.isRead;
    if (status === 'read') return item.isRead;
    return true;
  });
  const start = Math.max(0, page - 1) * per_page;
  return filtered.slice(start, start + per_page);
}

function normalizeServerNotification(
  raw: Record<string, unknown>,
): ServerNotification {
  return {
    notificationId: String(raw.notificationId ?? raw.notification_id ?? ''),
    documentId:
      raw.documentId != null || raw.document_id != null
        ? String(raw.documentId ?? raw.document_id)
        : null,
    category: raw.category != null ? String(raw.category) : null,
    title: String(raw.title ?? ''),
    body: String(raw.body ?? ''),
    isRead: Boolean(raw.isRead ?? raw.is_read),
    sentAt: String(
      raw.sentAt ?? raw.sent_at ?? raw.notifyDate ?? raw.notify_date ??
        raw.createdAt ?? raw.created_at ?? '',
    ),
  };
}

function normalizeDocumentAlert(raw: Record<string, unknown>): DocumentAlert {
  return {
    alertId: String(raw.alertId ?? raw.alert_id ?? ''),
    documentId: String(raw.documentId ?? raw.document_id ?? ''),
    offsetType: String(
      raw.offsetType ?? raw.offset_type ?? 'CUSTOM',
    ) as AlertOffsetType,
    notifyDate: String(raw.notifyDate ?? raw.notify_date ?? ''),
    reason: raw.reason == null ? null : String(raw.reason),
    channelEmail: Boolean(raw.channelEmail ?? raw.channel_email),
    channelAppPush: Boolean(raw.channelAppPush ?? raw.channel_app_push),
    channelWebPush: Boolean(raw.channelWebPush ?? raw.channel_web_push),
    isSent: Boolean(raw.isSent ?? raw.is_sent),
    sentAt:
      raw.sentAt != null || raw.sent_at != null
        ? String(raw.sentAt ?? raw.sent_at)
        : null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
  };
}

// 알림 읽음 처리
export async function markServerNotificationRead(alertId: string) {
  return request<{ success: boolean }>(`/notifications/${alertId}/read`, {
    method: "PATCH",
    body: JSON.stringify({ read: true }),
  });
}

// 전체 알림 읽음 처리
export async function markAllServerNotificationsRead() {
  return request<{ success: boolean }>("/notifications/read-all", {
    method: "PATCH",
  });
}

// POST /notifications
export async function createServerNotification(body: CreateNotificationBody) {
  return request<ServerNotification>("/notifications", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// DELETE /notifications/:id
export async function deleteServerNotification(notificationId: string) {
  return request<{ success: boolean }>(`/notifications/${notificationId}`, {
    method: "DELETE",
  });
}

// POST /notifications/trigger-scheduler
export async function triggerNotificationScheduler() {
  return request<{ success: boolean }>("/notifications/trigger-scheduler", {
    method: "POST",
  });
}

// GET /documents/:documentId/alerts
export async function getDocumentAlerts(documentId: string): Promise<DocumentAlert[]> {
  const response = await request<Record<string, unknown>[]>(
    `/documents/${documentId}/alerts`,
    { method: "GET" }
  );
  return (Array.isArray(response) ? response : []).map(normalizeDocumentAlert);
}

// POST /documents/:documentId/alerts
export async function createDocumentAlert(
  documentId: string,
  body: CreateAlertBody
) {
  const response = await request<Record<string, unknown>>(`/documents/${documentId}/alerts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeDocumentAlert(response);
}

// PATCH /documents/:documentId/alerts/:alertId
export async function updateAlert(
  documentId: string,
  alertId: string,
  body: UpdateAlertBody,
) {
  return request<{ success: boolean; alert_id: string }>(
    `/documents/${documentId}/alerts/${alertId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

// DELETE /documents/:documentId/alerts/:alertId
export async function deleteAlert(documentId: string, alertId: string) {
  return request<{ success: boolean; message: string }>(
    `/documents/${documentId}/alerts/${alertId}`,
    { method: "DELETE" }
  );
}

// GET /users/me/settings
export async function getNotificationSettings() {
  const response = await request<unknown>("/users/me/settings", {
    method: "GET",
  });
  return normalizeNotificationSettings(response);
}

// PATCH /users/me/settings
export async function updateNotificationSettings(
  body: Partial<NotificationSettings>
) {
  const requestBody = {
    ...(body.pushEnabled !== undefined ? { pushEnabled: body.pushEnabled } : {}),
    ...(body.emailEnabled !== undefined
      ? { emailNotiEnabled: body.emailEnabled }
      : {}),
  };
  const response = await request<unknown>(
    "/users/me/settings",
    { method: "PATCH", body: JSON.stringify(requestBody) }
  );
  const result = response as { settings?: unknown } | null;
  return normalizeNotificationSettings(result?.settings ?? response);
}

