import { cache, generateCacheKey, withCache } from "../cache";

describe("MemoryCache", () => {
  beforeEach(() => {
    cache.clear();
  });

  it("should set and get values", () => {
    cache.set("test-key", "test-value", 100);
    expect(cache.get("test-key")).toBe("test-value");
  });

  it("should return null for non-existent keys", () => {
    expect(cache.get("non-existent")).toBeNull();
  });

  it("should handle expiration", (done) => {
    cache.set("expired-key", "value", 0.1); // 100ms

    setTimeout(() => {
      expect(cache.get("expired-key")).toBeNull();
      done();
    }, 150);
  });

  it("should delete keys", () => {
    cache.set("delete-key", "value", 100);
    expect(cache.delete("delete-key")).toBe(true);
    expect(cache.get("delete-key")).toBeNull();
  });

  it("should clear all keys", () => {
    cache.set("key1", "value1", 100);
    cache.set("key2", "value2", 100);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("should enforce max size limit", () => {
    // Set max size to 2 for testing
    const testCache = new (class extends cache.constructor {
      maxSize = 2;
    })();

    testCache.set("key1", "value1", 100);
    testCache.set("key2", "value2", 100);
    testCache.set("key3", "value3", 100);

    expect(testCache.size()).toBe(2);
    expect(testCache.get("key1")).toBeNull(); // First key should be evicted
    expect(testCache.get("key3")).toBe("value3"); // Newest key should exist
  });
});

describe("generateCacheKey", () => {
  it("should generate keys with prefix and parts", () => {
    expect(generateCacheKey("user", "123", "profile")).toBe("user:123:profile");
    expect(generateCacheKey("lesson", "456")).toBe("lesson:456");
  });

  it("should handle empty parts", () => {
    expect(generateCacheKey("empty")).toBe("empty:");
  });
});

describe("withCache", () => {
  beforeEach(() => {
    cache.clear();
  });

  it("should cache function results", async () => {
    const mockFn = jest.fn().mockResolvedValue("result");
    const cachedFn = withCache(mockFn, (...args) => args.join(":"), 100);

    // First call
    const result1 = await cachedFn("arg1", "arg2");
    expect(result1).toBe("result");
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const result2 = await cachedFn("arg1", "arg2");
    expect(result2).toBe("result");
    expect(mockFn).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it("should handle different arguments separately", async () => {
    const mockFn = jest
      .fn()
      .mockImplementation((...args) => Promise.resolve(args.join("-")));
    const cachedFn = withCache(mockFn, (...args) => args.join(":"), 100);

    await cachedFn("arg1", "arg2");
    await cachedFn("arg3", "arg4");

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});




