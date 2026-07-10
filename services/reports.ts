import axiosInstance from '@/utils/axios.util';

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

export type ThisMonthSummary = {
  totalAmount?: number;
  receiptCount?: number;
  averageAmount?: number;
};

export type MonthlySpendItem = {
  month: string;
  amount: number;
};

export type DailySpendItem = {
  date: string;
  amount: number;
};

export type CategorySummaryItem = {
  categoryId?: number;
  categoryName?: string;
  category?: string;
  amount: number;
  percent?: number;
};

export type TopStoreItem = {
  storeName?: string;
  store_name?: string;
  name?: string;
  totalAmount?: number;
  total_amount?: number;
  amount?: number;
  receiptCount?: number;
  receipt_count?: number;
  count?: number;
};

export type WeekdaySummaryItem = {
  weekday: number;
  amount: number;
  receiptCount?: number;
  receipt_count?: number;
};

export async function getThisMonthSummary(): Promise<ThisMonthSummary> {
  const response = await axiosInstance.get('/reports/this-month-summary');
  return unwrapData<ThisMonthSummary>(response);
}

export async function getMonthlySpend(params: {
  year?: number;
} = {}): Promise<MonthlySpendItem[]> {
  const query = new URLSearchParams();
  if (params.year !== undefined) query.append('year', String(params.year));
  const response = await axiosInstance.get(
    `/reports/monthly-spend${query.toString() ? `?${query.toString()}` : ''}`,
  );
  return unwrapData<MonthlySpendItem[]>(response);
}

export async function getDailySpend(params: {
  year?: number;
  month?: number | string;
  fromDate?: string;
  toDate?: string;
} = {}): Promise<DailySpendItem[]> {
  const query = new URLSearchParams();
  if (params.year !== undefined) query.append('year', String(params.year));
  if (params.month !== undefined) query.append('month', String(params.month));
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  const response = await axiosInstance.get(
    `/reports/daily-spend${query.toString() ? `?${query.toString()}` : ''}`,
  );
  return unwrapData<DailySpendItem[]>(response);
}

export async function getCategorySummary(params: {
  fromDate?: string;
  toDate?: string;
  year?: number;
  month?: number | string;
} = {}): Promise<CategorySummaryItem[]> {
  const query = new URLSearchParams();
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.year !== undefined) query.append('year', String(params.year));
  if (params.month !== undefined) query.append('month', String(params.month));
  const response = await axiosInstance.get(
    `/reports/category-summary${query.toString() ? `?${query.toString()}` : ''}`,
  );
  return unwrapData<CategorySummaryItem[]>(response);
}

export async function getTopStores(params: {
  year?: number;
  month?: number | string;
  limit?: number;
} = {}): Promise<TopStoreItem[]> {
  const query = new URLSearchParams();
  if (params.year !== undefined) query.append('year', String(params.year));
  if (params.month !== undefined) query.append('month', String(params.month));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  const response = await axiosInstance.get(
    `/reports/top-stores${query.toString() ? `?${query.toString()}` : ''}`,
  );
  const payload = unwrapData<{ stores?: TopStoreItem[]; items?: TopStoreItem[] } | TopStoreItem[]>(response);
  return Array.isArray(payload) ? payload : payload.stores ?? payload.items ?? [];
}

export async function getWeekdaySummary(params: {
  year?: number;
} = {}): Promise<WeekdaySummaryItem[]> {
  const query = new URLSearchParams();
  if (params.year !== undefined) query.append('year', String(params.year));
  const response = await axiosInstance.get(
    `/reports/weekday-summary${query.toString() ? `?${query.toString()}` : ''}`,
  );
  return unwrapData<WeekdaySummaryItem[]>(response);
}
