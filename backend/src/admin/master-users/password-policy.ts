export const MASTER_USER_PASSWORD_POLICY_MESSAGE =
  '비밀번호는 공백 없이 영문/숫자/특수문자 조합으로 10자 이상(2종류 이상) 또는 8자 이상(3종류 이상)이어야 합니다.';

// KISA-style password policy:
// - no whitespace
// - 10+ chars with at least 2 categories OR 8+ chars with all 3 categories
export const MASTER_USER_PASSWORD_POLICY_REGEX =
  /^(?=\S+$)(?:(?=.{10,}$)(?:(?=.*[A-Za-z])(?=.*\d)|(?=.*[A-Za-z])(?=.*[^A-Za-z0-9])|(?=.*\d)(?=.*[^A-Za-z0-9]))|(?=.{8,}$)(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])).*$/;

export const isValidMasterUserPassword = (password: string): boolean => {
  if (!password || /\s/.test(password)) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const categoryCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  if (password.length >= 10 && categoryCount >= 2) {
    return true;
  }

  if (password.length >= 8 && categoryCount >= 3) {
    return true;
  }

  return false;
};

const hasThreeOrMoreSequentialChars = (password: string): boolean => {
  for (let i = 0; i <= password.length - 3; i += 1) {
    const a = password.charCodeAt(i);
    const b = password.charCodeAt(i + 1);
    const c = password.charCodeAt(i + 2);

    if (a + 1 === b && b + 1 === c) {
      return true;
    }

    if (a - 1 === b && b - 1 === c) {
      return true;
    }
  }

  return false;
};

const hasThreeOrMoreRepeatedChars = (password: string): boolean => {
  return /(.)\1\1/.test(password);
};

const includesEmailLocalPart = (password: string, email?: string): boolean => {
  if (!email) {
    return false;
  }

  const localPart = email.split('@')[0]?.toLowerCase().trim();
  if (!localPart || localPart.length < 3) {
    return false;
  }

  return password.toLowerCase().includes(localPart);
};

const containsWeakDictionaryWord = (password: string): boolean => {
  const weakKeywords = ['password', 'qwer', 'admin', 'soar', 'welcome', 'letmein'];
  const lower = password.toLowerCase();
  return weakKeywords.some((keyword) => lower.includes(keyword));
};

export const getMasterUserPasswordValidationError = (
  password: string,
  email?: string,
): string | null => {
  if (!isValidMasterUserPassword(password)) {
    return MASTER_USER_PASSWORD_POLICY_MESSAGE;
  }

  if (hasThreeOrMoreRepeatedChars(password)) {
    return '비밀번호에 동일 문자를 3회 이상 연속으로 사용할 수 없습니다.';
  }

  if (hasThreeOrMoreSequentialChars(password)) {
    return '비밀번호에 연속된 문자/숫자 3자리를 사용할 수 없습니다.';
  }

  if (includesEmailLocalPart(password, email)) {
    return '비밀번호에 이메일 식별자 일부를 포함할 수 없습니다.';
  }

  if (containsWeakDictionaryWord(password)) {
    return '사전에 노출된 약한 비밀번호 패턴을 사용할 수 없습니다.';
  }

  return null;
};
