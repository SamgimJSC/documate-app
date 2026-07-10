import axiosInstance from '@/utils/axios.util';
import type { AuthUser } from '@/services/auth';

function unwrapData<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data?: T }).data ?? (payload as T);
  }
  return payload as T;
}

export type GetUsersParams = {
  keyword?: string;
  page?: number;
  limit?: number;
};

export type CreateUserBody = {
  email: string;
  password: string;
  nickname: string;
  pinNumber?: string;
};

export async function getUsers(params: GetUsersParams = {}): Promise<AuthUser[]> {
  const query = new URLSearchParams();
  if (params.keyword) query.append('keyword', params.keyword);
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  const response = await axiosInstance.get(
    `/users${query.toString() ? `?${query.toString()}` : ''}`,
  );
  return unwrapData<AuthUser[]>(response);
}

export async function getUser(userId: string): Promise<AuthUser> {
  const response = await axiosInstance.get(`/users/${userId}`);
  return unwrapData<AuthUser>(response);
}

export async function createUser(body: CreateUserBody): Promise<AuthUser> {
  const response = await axiosInstance.post('/users', body);
  return unwrapData<AuthUser>(response);
}
