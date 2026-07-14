import axiosInstance from '@/utils/axios.util';

export async function checkServerHealth(): Promise<unknown> {
  return axiosInstance.get('/');
}
