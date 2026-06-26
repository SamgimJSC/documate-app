import { Receipt, ReceiptCategory } from '@/constants/mock-data';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

type ApiResponse<T> = {
  message?: string;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  data: T;
};

type ApiReceiptItem = {
  receiptId?: string;
  receipt_id?: string;
  id?: string;
  storeName?: string;
  store_name?: string;
  totalAmount?: number | string;
  amount?: number | string;
  purchaseDate?: string;
  date?: string;
  categoryName?: string | null;
  category?: string;
  icon?: string;
  fileUrl?: string | null;
  image_url?: string;
  imageUri?: string;
  isConfirmed?: boolean;
  is_favorite?: boolean;
  isFavorite?: boolean;
  createdAt?: string;
  items?: { name: string; price: number }[];
};

type GetReceiptsResponse = {
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  receipts: ApiReceiptItem[];
};

type ReceiptSort = 'latest' | 'purchaseDate' | 'amountDesc' | 'amountAsc';

type GetReceiptsParams = {
  year?: number;
  month?: string | number;
  date?: string;
  fromDate?: string;
  toDate?: string;
  categoryId?: number;
  keyword?: string;
  sort?: ReceiptSort;
  page?: number;
  size?: number;
};

function unwrapApiResponse<T>(result: T | ApiResponse<T>): T {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    return (result as ApiResponse<T>).data;
  }
  return result as T;
}

function parseMonth(month?: string | number) {
  if (month === undefined || month === null || month === '') return {};
  if (typeof month === 'number') return { month };

  const match = month.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) };
  }

  const value = Number(month);
  return Number.isInteger(value) ? { month: value } : {};
}

function toReceipt(receipt: ApiReceiptItem): Receipt {
  const amount = Number(receipt.totalAmount ?? receipt.amount ?? 0);

  return {
    id: receipt.receiptId ?? receipt.receipt_id ?? receipt.id ?? '',
    storeName: receipt.storeName ?? receipt.store_name ?? '',
    category: ((receipt.categoryName ?? receipt.category ?? '기타') as ReceiptCategory),
    amount: Number.isFinite(amount) ? amount : 0,
    date: receipt.purchaseDate ?? receipt.date ?? receipt.createdAt?.slice(0, 10) ?? '',
    imageUri: receipt.fileUrl ?? receipt.image_url ?? receipt.imageUri ?? undefined,
    isFavorite: receipt.is_favorite ?? receipt.isFavorite ?? false,
    items: receipt.items,
  };
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
  params: GetReceiptsParams = {},
): Promise<Receipt[]> {
  const query = new URLSearchParams();
  const parsedMonth = parseMonth(params.month);
  const year = params.year ?? parsedMonth.year;
  const month = parsedMonth.month;

  if (params.date) {
    query.append('date', params.date);
  } else if (year && month) {
    query.append('year', String(year));
    query.append('month', String(month));
  } else {
    if (params.fromDate) query.append('fromDate', params.fromDate);
    if (params.toDate) query.append('toDate', params.toDate);
  }

  if (params.categoryId !== undefined) {
    query.append('categoryId', String(params.categoryId));
  }
  if (params.keyword) query.append('keyword', params.keyword);
  if (params.sort) query.append('sort', params.sort);
  query.append('page', String(params.page ?? 1));
  query.append('size', String(Math.min(params.size ?? 100, 100)));

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
