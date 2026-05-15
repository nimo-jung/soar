/**
 * JWT payload를 파싱하여 반환 (검증 없이 디코딩만)
 * 실제 검증은 백엔드 Guard에서 수행
 */
export function parseJwt(token: string): Record<string, unknown> {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}
