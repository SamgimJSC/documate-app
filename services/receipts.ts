import { Receipt, ReceiptCategory } from '@/constants/mock-data';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

type ApiReceiptItem = {
  receipt_id?: string;
  id?: string;
  store_name?: string;
  storeName?: string;
  category: string;
  amount: number;
  date: string;
  image_url?: string;
  imageUri?: string;
  is_favorite?: boolean;
  isFavorite?: boolean;
  items?: { name: string; price: number }[];
};

type GetReceiptsResponse = {
  page?: number;
  per_page?: number;
  limit?: number;
  total?: number;
  receipts: ApiReceiptItem[];
};

type ApiResponse<T> = {
  message?: string;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  data: T;
};

function unwrapApiResponse<T>(result: T | ApiResponse<T>): T {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    return (result as ApiResponse<T>).data;
  }
  return result as T;
}

function toReceipt(receipt: ApiReceiptItem): Receipt {
  return {
    id: receipt.receipt_id ?? receipt.id ?? '',
    storeName: receipt.store_name ?? receipt.storeName ?? '',
    category: (receipt.category as ReceiptCategory) ?? '기타',
    amount: receipt.amount,
    date: receipt.date,
    imageUri: receipt.image_url ?? receipt.imageUri,
    isFavorite: receipt.is_favorite ?? receipt.isFavorite ?? false,
    items: receipt.items,
  };
}

function normalizeMonth(month?: string | number) {
  if (month === undefined || month === null || month === '') return undefined;
  if (typeof month === 'number') return month;

  const match = month.match(/^\d{4}-(\d{1,2})$/);
  const value = Number(match ? match[1] : month);
  return Number.isInteger(value) && value >= 1 && value <= 12
    ? value
    : undefined;
}

async function receiptRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Receipts API 요청 실패: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function getReceipts(
  params: {
    month?: string | number;
    category?: string;
    favorite?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<Receipt[]> {
  const query = new URLSearchParams();
  const month = normalizeMonth(params.month);

  if (month !== undefined) query.append('month', String(month));
  if (params.category) query.append('category', params.category);
  if (params.favorite !== undefined) {
    query.append('favorite', String(params.favorite));
  }
  query.append('page', String(params.page ?? 1));
  if (params.limit !== undefined) query.append('limit', String(params.limit));

  const result = await receiptRequest<
    GetReceiptsResponse | ApiResponse<GetReceiptsResponse>
  >(`/receipts?${query.toString()}`);
  const payload = unwrapApiResponse<GetReceiptsResponse>(result);

  return payload.receipts.map(toReceipt);
}

export async function getReceiptDetail(receiptId: string): Promise<Receipt> {
  const result = await receiptRequest<ApiReceiptItem | ApiResponse<ApiReceiptItem>>(
    `/receipts/${receiptId}`,
  );
  const payload = unwrapApiResponse<ApiReceiptItem>(result);
  return toReceipt(payload);
}

export async function updateReceiptFavorite(
  receiptId: string,
  isFavorite: boolean,
) {
  return receiptRequest<{ success: boolean; is_favorite: boolean }>(
    `/receipts/${receiptId}/favorite`,
    { method: 'PATCH', body: JSON.stringify({ is_favorite: isFavorite }) },
  );
}
