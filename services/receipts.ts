import { Receipt, ReceiptCategory } from '@/constants/mock-data';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiReceiptItem = {
  receipt_id: string;
  store_name: string;
  category: string;
  amount: number;
  date: string;
  image_url?: string;
  is_favorite: boolean;
  items?: { name: string; price: number }[];
};

type GetReceiptsResponse = {
  page: number;
  per_page: number;
  total: number;
  receipts: ApiReceiptItem[];
};

function toReceipt(r: ApiReceiptItem): Receipt {
  return {
    id: r.receipt_id,
    storeName: r.store_name,
    category: (r.category as ReceiptCategory) ?? '기타',
    amount: r.amount,
    date: r.date,
    imageUri: r.image_url,
    isFavorite: r.is_favorite,
    items: r.items,
  };
}

async function receiptRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.');

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

// GET /receipts
export async function getReceipts(params: {
  month?: string;
  category?: string;
  favorite?: boolean;
  page?: number;
  per_page?: number;
} = {}): Promise<Receipt[]> {
  const query = new URLSearchParams();
  if (params.month) query.append('month', params.month);
  if (params.category) query.append('category', params.category);
  if (params.favorite !== undefined) query.append('favorite', String(params.favorite));
  query.append('page', String(params.page ?? 1));
  query.append('per_page', String(params.per_page ?? 50));

  const res = await receiptRequest<GetReceiptsResponse>(`/receipts?${query.toString()}`);
  return res.receipts.map(toReceipt);
}

// GET /receipts/:receiptId
export async function getReceiptDetail(receiptId: string): Promise<Receipt> {
  const res = await receiptRequest<ApiReceiptItem>(`/receipts/${receiptId}`);
  return toReceipt(res);
}

// PATCH /receipts/:receiptId/favorite
export async function updateReceiptFavorite(receiptId: string, isFavorite: boolean) {
  return receiptRequest<{ success: boolean; is_favorite: boolean }>(
    `/receipts/${receiptId}/favorite`,
    { method: 'PATCH', body: JSON.stringify({ is_favorite: isFavorite }) }
  );
}
