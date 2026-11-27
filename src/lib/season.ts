/**
 * وضع رمضان: الموقع بيقلب لوحده أول ما يدخل رمضان، ويرجع للنسخة العادية أول ما يخلص.
 *
 * الحساب بيحصل في المتصفح (مش في السيرفر)، عشان الصفحات الثابتة متتجمدش على تاريخ الـ build.
 * - التاريخ: تقويم أم القرى بتوقيت مكة.
 * - "الليلة" بتبدأ من المغرب: بعد ٦ مساءً بتوقيت مكة بنعتبر إننا في اليوم الهجري اللي بعده.
 *   يعني وضع رمضان بيشتغل من مغرب آخر يوم في شعبان (ليلة أول تراويح)،
 *   وبيقفل مغرب آخر يوم في رمضان (ليلة العيد، مفيش تراويح).
 * - للتجربة: ?season=ramadan أو ?season=regular بتتحفظ في المتصفح، و ?season=auto بترجع للحساب التلقائي.
 */

export const SEASON_KEY = "yd-season";
export type Season = "regular" | "ramadan";

/** لون شريط المتصفح في وضع رمضان (نفس خلفية الوضع الغامق) */
export const RAMADAN_THEME_COLOR = "#0D1512";

/** بيشتغل في <head> قبل أول رسم: بيحط data-season على <html> */
export const seasonInitScript = `try{var K="${SEASON_KEY}",q=new URLSearchParams(location.search).get("season");if(q==="auto")localStorage.removeItem(K);else if(q==="ramadan"||q==="regular")localStorage.setItem(K,q);var s=localStorage.getItem(K);if(s!=="ramadan"&&s!=="regular"){var d=new Date(Date.now()+9*36e5);var m=new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn",{timeZone:"UTC",month:"numeric"}).format(d);s=parseInt(m,10)===9?"ramadan":"regular"}if(s==="ramadan"){document.documentElement.dataset.season="ramadan";var t=document.querySelector('meta[name="theme-color"]');if(t)t.content="${RAMADAN_THEME_COLOR}"}}catch(e){}`;

/** نفس الحساب للاستخدام في الكود (مثلًا في الاختبارات أو السيرفر لو احتجناه) */
export function seasonAt(now: Date): Season {
  // +٣ ساعات توقيت مكة، و+٦ كمان عشان الليلة تبدأ من المغرب
  const shifted = new Date(now.getTime() + 9 * 3_600_000);
  const m = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", month: "numeric" }).format(shifted);
  return parseInt(m, 10) === 9 ? "ramadan" : "regular";
}
