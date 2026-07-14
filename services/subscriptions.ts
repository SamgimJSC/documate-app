import axiosInstance from '@/utils/axios.util';

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';

export type SubscriptionInfo = {
  subscription_id?: string;
  billing_cycle?: 'MONTHLY';
  status: SubscriptionStatus;
  is_canceled?: boolean;
  current_period_end?: string;
  payment_method?: 'KAKAOPAY';
};

function normalizeSubscription(value: unknown): SubscriptionInfo {
  const item = (value ?? {}) as Record<string, unknown>;
  const rawStatus = String(item.status ?? 'NONE').toUpperCase();
  const status: SubscriptionStatus = [
    'NONE',
    'ACTIVE',
    'CANCELED',
    'PAST_DUE',
    'EXPIRED',
  ].includes(rawStatus)
    ? (rawStatus as SubscriptionStatus)
    : 'NONE';

  return {
    subscription_id: String(item.subscriptionId ?? item.subscription_id ?? item.id ?? '') || undefined,
    billing_cycle: (item.billingCycle ?? item.billing_cycle) === 'MONTHLY' ? 'MONTHLY' : undefined,
    status,
    is_canceled: Boolean(
      item.isCanceled ?? item.is_canceled ?? item.cancelAtPeriodEnd ?? item.cancel_at_period_end,
    ),
    current_period_end:
      String(item.currentPeriodEnd ?? item.current_period_end ?? '') || undefined,
    payment_method:
      String(item.paymentMethod ?? item.payment_method ?? '').toUpperCase() === 'KAKAOPAY'
        ? 'KAKAOPAY'
        : undefined,
  };
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  const response = await axiosInstance.get('/subscriptions/me');
  return normalizeSubscription(unwrapData(response));
}

export async function cancelSubscription(): Promise<SubscriptionInfo> {
  const response = await axiosInstance.patch('/subscriptions/me/cancel');
  return normalizeSubscription(unwrapData(response));
}

export async function undoSubscriptionCancel(): Promise<SubscriptionInfo> {
  const response = await axiosInstance.patch('/subscriptions/me/cancel/undo');
  return normalizeSubscription(unwrapData(response));
}
