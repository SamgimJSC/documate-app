const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

type ApiResponse<T> = {
  message?: string;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  data: T;
};

export interface DefaultCard {
  cardId: string;
  cardName: string;
  issuer: string;
  annualFee: number | null;
  imgUrl: string | null;
}

export interface CardRecommendation {
  recommendationId: string;
  cardId: string;
  cardName: string | null;
  issuer: string | null;
  annualFee: number | null;
  imgUrl: string | null;
  reason: string | null;
  matchScore: number | null;
  recommendedAt: string;
}

export interface CheckResult {
  hasReceipt: boolean;
  defaultCards: DefaultCard[];
}

function unwrapApiResponse<T>(result: T | ApiResponse<T>): T {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    return (result as ApiResponse<T>).data;
  }
  return result as T;
}

async function cardRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new Error('EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.');
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cards API 오류: ${response.status} ${text}`);
  }
  return response.json();
}

/** receipt 유무 확인. 없으면 기본 카드 3종 반환 */
export async function checkCards(): Promise<CheckResult> {
  const result = await cardRequest<CheckResult | ApiResponse<CheckResult>>('/cards/check');
  return unwrapApiResponse(result);
}

/** AI 추천 작업을 card:queue 에 넣음 (파이썬 워커가 비동기 처리) */
export async function requestCardAi(): Promise<{ status: string; queue: string }> {
  const result = await cardRequest<{ status: string; queue: string } | ApiResponse<{ status: string; queue: string }>>(
    '/cards/ai',
  );
  return unwrapApiResponse(result);
}

/** 저장된 AI 추천 카드 목록 반환 (없으면 빈 배열) */
export async function getCardRecommendations(): Promise<CardRecommendation[]> {
  const result = await cardRequest<{ recommendations: CardRecommendation[] } | ApiResponse<{ recommendations: CardRecommendation[] }>>(
    '/cards/recommendation',
  );
  const payload = unwrapApiResponse(result);
  return payload.recommendations ?? [];
}
