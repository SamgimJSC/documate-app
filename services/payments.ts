import axiosInstance from '@/utils/axios.util';

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

export const PRO_MONTHLY_AMOUNT = 3900;

export type KakaoSubscriptionReadyResponse = {
  tid: string;
  next_redirect_pc_url?: string;
  next_redirect_mobile_url?: string;
};

export type KakaoSubscriptionApproveResponse = {
  success: boolean;
  subscription_id: string;
  sid: string;
  plan: 'PRO';
  current_period_end: string;
  amount: number;
};

export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';

export type SubscriptionInfo = {
  subscription_id?: string;
  billing_cycle?: 'MONTHLY';
  status: SubscriptionStatus;
  is_canceled?: boolean;
  current_period_end?: string;
  payment_method?: 'KAKAOPAY';
};

export type PaymentHistoryItem = {
  payment_id: string;
  amount: number;
  status: string;
  approved_at: string;
};

export async function readyKakaoSubscription(): Promise<KakaoSubscriptionReadyResponse> {
  const response = await axiosInstance.post('/payments/kakao/subscription/ready', {
    plan: 'PRO',
  });
  return unwrapData<KakaoSubscriptionReadyResponse>(response);
}

export async function approveKakaoSubscription(
  tid: string,
  pgToken: string,
): Promise<KakaoSubscriptionApproveResponse> {
  const response = await axiosInstance.post('/payments/kakao/subscription/approve', {
    tid,
    pg_token: pgToken,
  });
  return unwrapData<KakaoSubscriptionApproveResponse>(response);
}

export async function cancelSubscription(): Promise<{
  success: boolean;
  is_canceled: boolean;
  current_period_end: string;
}> {
  const response = await axiosInstance.post('/payments/subscription/cancel');
  return unwrapData(response);
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  const response = await axiosInstance.get('/payments/subscription');
  return unwrapData<SubscriptionInfo>(response);
}

export async function getPaymentHistory(): Promise<PaymentHistoryItem[]> {
  const response = await axiosInstance.get('/payments/history');
  const payload = unwrapData<{ payments?: PaymentHistoryItem[] } | PaymentHistoryItem[]>(response);
  return Array.isArray(payload) ? payload : payload.payments ?? [];
}
