/**
 * قفل سكرول الصفحة اللي ورا (المشغّل الكبير، والنوافذ، واللوحات اللي من تحت).
 *
 * بيتقفل على html مش body: html عليه overflow-x: hidden (عشان الموبايل ميتسحبش بالعرض)،
 * وده بيخلّي overflow بتاع body ميوصلش للصفحة نفسها، فقفل body لوحده مكانش بيوقف السكرول
 * (وده اللي كان بيخلّي الخلفية تنزل ورا المشغّل على الديسكتوب).
 * بيعدّ الأقفال، عشان لو لوحة فتحت فوق المشغّل وقفلت، الصفحة تفضل مقفولة لحد ما المشغّل يقفل.
 */
let locks = 0;
let saved = "";

export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  const html = document.documentElement;
  if (locks === 0) {
    saved = html.style.overflow;
    html.style.overflow = "hidden";
  }
  locks++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks--;
    if (locks === 0) html.style.overflow = saved;
  };
}
