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
  storeAddress?: string | null;
  store_address?: string | null;
  paymentItem?: string | null;
  payment_item?: string | null;
  memo?: string | null;
  inputMethod?: string;
  input_method?: string;
  isConfirmed?: boolean;
  is_favorite?: boolean;
  isFavorite?: boolean;
  createdAt?: string;
  created_at?: string;
  fileSizeBytes?: number | string | null;
  file_size_bytes?: number | string | null;
  items?: { name: string; price: number }[];
};

type UpdateReceiptPayload = {
  storeName?: string;
  storeAddress?: string;
  totalAmount?: number;
  purchaseDate?: string;
  spendCategoryId?: number;
  paymentItem?: string;
  memo?: string;
  isConfirmed?: boolean;
};

type GetReceiptsResponse = {
  page?: number;
  size?: number;
  totalCount?: number;
  totalPages?: number;
  receipts?: ApiReceiptItem[];
  items?: ApiReceiptItem[];
  content?: ApiReceiptItem[];
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

function toReceipt(receipt: ApiReceiptItem): Receipt {
  const amount = Number(receipt.totalAmount ?? receipt.amount ?? 0);
  const fileSizeBytes = Number(
    receipt.fileSizeBytes ?? receipt.file_size_bytes ?? 0,
  );

  return {
    id: receipt.receiptId ?? receipt.receipt_id ?? receipt.id ?? '',
    storeName: receipt.storeName ?? receipt.store_name ?? '',
    category: ((receipt.categoryName ?? receipt.category ?? '기타') as ReceiptCategory),
    amount: Number.isFinite(amount) ? amount : 0,
    date:
      receipt.purchaseDate ??
      receipt.date ??
      receipt.createdAt?.slice(0, 10) ??
      receipt.created_at?.slice(0, 10) ??
      '',
    imageUri: receipt.fileUrl ?? receipt.image_url ?? receipt.imageUri ?? undefined,
    isFavorite: receipt.is_favorite ?? receipt.isFavorite ?? false,
    items: receipt.items,
    storeAddress: receipt.storeAddress ?? receipt.store_address ?? undefined,
    paymentItem: receipt.paymentItem ?? receipt.payment_item ?? undefined,
    memo: receipt.memo ?? undefined,
    inputMethod: receipt.inputMethod ?? receipt.input_method,
    fileSizeBytes: Number.isFinite(fileSizeBytes) ? fileSizeBytes : 0,
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

  if (response.status === 204) return undefined as T;

  return response.json();
}

export async function getReceipts(
  params: GetReceiptsParams = {},
): Promise<Receipt[]> {
  const query = new URLSearchParams();
  if (params.date) {
    query.append('date', params.date);
  } else if (params.month !== undefined) {
    query.append('month', String(params.month));
    if (params.year !== undefined) query.append('year', String(params.year));
  } else {
    if (params.fromDate) query.append('fromDate', params.fromDate);
    if (params.toDate) query.append('toDate', params.toDate);
  }

  if (params.categoryId !== undefined) {
    query.append('categoryId', String(params.categoryId));
  }
  if (params.keyword) query.append('keyword', params.keyword);
  if (params.sort) query.append('sort', params.sort);
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.size !== undefined) {
    query.append('size', String(Math.min(params.size, 100)));
  }

  const queryString = query.toString();
  const result = await receiptRequest<
    GetReceiptsResponse | ApiReceiptItem[] | ApiResponse<GetReceiptsResponse | ApiReceiptItem[]>
  >(`/receipts${queryString ? `?${queryString}` : ''}`);
  const payload = unwrapApiResponse<GetReceiptsResponse | ApiReceiptItem[]>(result);
  const items = Array.isArray(payload)
    ? payload
    : payload.receipts ?? payload.items ?? payload.content ?? [];

  return items.map(toReceipt);
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

export async function updateReceipt(
  receiptId: string,
  payload: UpdateReceiptPayload,
): Promise<Receipt> {
  const result = await receiptRequest<ApiReceiptItem | ApiResponse<ApiReceiptItem>>(
    `/receipts/${receiptId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
  const updated = unwrapApiResponse<ApiReceiptItem>(result);
  return toReceipt(updated);
}

export async function deleteReceipt(receiptId: string): Promise<void> {
  await receiptRequest<void>(`/receipts/${receiptId}`, { method: 'DELETE' });
}
