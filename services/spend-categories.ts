import axiosInstance from '@/utils/axios.util';

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

export type SpendCategory = {
  spendCategoryId?: number;
  categoryId?: number;
  name: string;
  code?: string;
  icon?: string | null;
};

export async function getSpendCategories(): Promise<SpendCategory[]> {
  const response = await axiosInstance.get('/spend-categories');
  return unwrapData<SpendCategory[]>(response);
}
