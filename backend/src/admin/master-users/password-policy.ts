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
