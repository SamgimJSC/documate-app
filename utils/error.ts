// 날것의 에러(Error 객체, 문자열 등)를 사용자에게 보여줄 한국어 메시지로 변환.
// services 레이어가 던지는 에러 메시지 형태에 맞춰 매핑함:
//   - 'Network request failed'                     → 서버 연결 실패
//   - 'EXPO_PUBLIC_API_URL이 설정되어 있지 않습니다.' → 설정 누락
//   - '... 요청 실패: 401 ...' / '... 실패: 500 ...'  → 상태 코드별 메시지
export function getErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  // 1. 네트워크 자체가 안 닿는 경우 (서버 꺼짐 / 주소 틀림 / 와이파이 문제)
  if (raw.includes('Network request failed')) {
    return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
  }

  // 2. 서버 주소 설정 누락 (.env)
  if (raw.includes('EXPO_PUBLIC_API_URL')) {
    return '서버 주소가 설정되지 않았습니다. 앱 설정을 확인해주세요.';
  }

  // 3. HTTP 상태 코드별 매핑 (메시지 안에 숫자가 섞여 있음)
  const statusMatch = raw.match(/\b(400|401|403|404|409|413|429|500|502|503)\b/);
  if (statusMatch) {
    switch (statusMatch[1]) {
      case '400':
        return '요청 정보가 올바르지 않습니다. 입력 내용을 확인해주세요.';
      case '401':
        return '로그인이 필요하거나 세션이 만료되었습니다.';
      case '403':
        return '접근 권한이 없습니다.';
      case '404':
        return '요청한 정보를 찾을 수 없습니다.';
      case '409':
        return '이미 처리된 요청이거나 충돌이 발생했습니다.';
      case '413':
        return '파일 용량이 너무 큽니다.';
      case '429':
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case '500':
      case '502':
      case '503':
        return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
  }

  // 4. 그 외 — 기본 메시지 (원문 노출 대신 일반 문구)
  return '문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
}