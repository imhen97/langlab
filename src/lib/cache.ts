// 메모리 캐시 구현
class MemoryCache {
  private cache = new Map<string, { value: unknown; expiry: number }>();
  private maxSize = 100; // 최대 캐시 항목 수

  set(key: string, value: unknown, ttlSeconds: number = 300): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 만료된 항목 삭제
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // 만료된 항목들 정리
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// 전역 캐시 인스턴스
export const cache = new MemoryCache();

// 캐시 헬퍼 함수들
export function withCache<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttlSeconds: number = 300
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);

    // 캐시에서 확인
    const cached = cache.get(key);
    if (cached !== null) {
      return cached as R;
    }

    // 함수 실행
    const result = await fn(...args);

    // 캐시에 저장
    cache.set(key, result, ttlSeconds);

    return result;
  };
}

// API 응답 캐싱을 위한 헬퍼
export function createCachedApiCall<T>(
  apiCall: () => Promise<T>,
  cacheKey: string,
  ttlSeconds: number = 300
) {
  return withCache(apiCall, () => cacheKey, ttlSeconds);
}

// 캐시 키 생성기
export function generateCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return `${prefix}:${parts.join(":")}`;
}

// 정기적으로 만료된 항목 정리 (5분마다)
if (typeof window !== "undefined") {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}
