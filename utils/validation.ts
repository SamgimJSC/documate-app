export function analyzePassword(password: string) {
  const hasLetter = /[a-z]/i.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const typeCount = [hasLetter, hasNumber, hasSymbol].filter(Boolean).length;

  const strengthLabel = password.length
    ? typeCount === 1
      ? "약함"
      : typeCount === 2
        ? "보통"
        : "강함"
    : "";

  return { hasLetter, hasNumber, hasSymbol, typeCount, strengthLabel };
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }

  const { typeCount } = analyzePassword(password);
  if (typeCount < 2) {
    return "영문, 숫자, 특수문자 중 2종류 이상 포함해야 합니다.";
  }

  return null;
}
