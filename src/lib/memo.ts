/**
 * كاش في ذاكرة السيرفر: نفس النتيجة بترجع لكل الطلبات لمدة محددة،
 * بدل ما الكتالوج يتحمّل ويتعالج من الأول مع كل صفحة بتتبني.
 */
const TTL_MS = 10 * 60 * 1000; // ١٠ دقايق

export function memo<A extends unknown[], T>(fn: (...args: A) => Promise<T>, ttl = TTL_MS) {
  const store = new Map<string, { at: number; value: Promise<T> }>();
  return (...args: A): Promise<T> => {
    const key = JSON.stringify(args);
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.value;
    const value = fn(...args);
    store.set(key, { at: Date.now(), value });
    // لو التحميل فشل منخزنش الخطأ، والطلب اللي بعده يحاول تاني
    value.catch(() => store.delete(key));
    return value;
  };
}