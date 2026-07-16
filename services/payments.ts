import axiosInstance from '@/utils/axios.util';

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

export type KakaoPaymentReadyResponse = {
  paymentId?: string;
  payment_id?: string;
  tid?: string;
  nextRedirectPcUrl?: string;
  nextRedirectMobileUrl?: string;
  nextRedirectAppUrl?: string;
  next_redirect_pc_url?: string;
  next_redirect_mobile_url?: string;
  next_redirect_app_url?: string;
  amount?: number;
};

export type PaymentHistoryItem = {
  payment_id: string;
  amount: number;
  status: string;
  approved_at: string;
};

export type GetPaymentHistoryParams = {
  page?: number;
  limit?: number;
};

type PaymentHistoryPayload =
  | unknown[]
  | {
      items?: unknown[];
      payments?: unknown[];
    };

function normalizePayment(value: unknown): PaymentHistoryItem {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    payment_id: String(item.paymentId ?? item.payment_id ?? item.id ?? ''),
    amount: Number(item.amount ?? 0),
    status: String(item.status ?? ''),
    approved_at: String(
      item.approvedAt ?? item.approved_at ?? item.createdAt ?? item.created_at ?? '',
    ),
  };
}

/** 신규 구독 결제 준비. 결제 승인은 카카오페이의 서버 콜백에서 처리된다. */
export async function readyKakaoSubscription(): Promise<KakaoPaymentReadyResponse> {
  const response = await axiosInstance.post('/payments/kakao/ready', {
    billingCycle: 'MONTHLY',
  });
  return unwrapData<KakaoPaymentReadyResponse>(response);
}

/** 기존 구독의 카카오페이 결제수단 변경 준비. */
export async function readyKakaoMethodChange(): Promise<KakaoPaymentReadyResponse> {
  const response = await axiosInstance.post('/payments/kakao/method-change/ready');
  return unwrapData<KakaoPaymentReadyResponse>(response);
}

export function getKakaoRedirectUrl(
  ready: KakaoPaymentReadyResponse,
  platform: 'web' | 'native',
): string | undefined {
  if (platform === 'web') {
    return ready.nextRedirectPcUrl ?? ready.next_redirect_pc_url;
  }
  return (
    ready.nextRedirectAppUrl ??
    ready.next_redirect_app_url ??
    ready.nextRedirectMobileUrl ??
    ready.next_redirect_mobile_url ??
    ready.nextRedirectPcUrl ??
    ready.next_redirect_pc_url
  );
}

export async function getPaymentHistory(
  params: GetPaymentHistoryParams = {},
): Promise<PaymentHistoryItem[]> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));

  const response = await axiosInstance.get(
    `/payments${query.toString() ? `?${query.toString()}` : ''}`,
  );
  const payload = unwrapData<PaymentHistoryPayload>(response);
  const items = Array.isArray(payload) ? payload : payload.items ?? payload.payments ?? [];
  return items.map(normalizePayment);
}

/** 개발/운영 배치 관리용 수동 정기결제 실행 API. */
export async function runSubscriptionBilling(): Promise<unknown> {
  const response = await axiosInstance.post('/payments/kakao/subscriptions/billing/run');
  return unwrapData(response);
}
