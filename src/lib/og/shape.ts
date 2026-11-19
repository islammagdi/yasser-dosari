/**
 * تشكيل الحروف العربية لصورة المشاركة.
 * مكتبة الصور بتحسب عرض الكلمة بالحروف المنفصلة وترسمها متوصّلة، فالمسافات بين الكلمات بتبوظ.
 * الحل: نحوّل كل حرف بنفسنا لشكله الجاهز (أول/وسط/آخر الكلمة) من حروف Unicode الجاهزة،
 * فالمكتبة بتحسب وترسم نفس الشكل بالظبط.
 */

// [منفصل، آخر، أول، وسط]. الحروف اللي بتتوصل من ناحية واحدة بس ليها شكلين
const FORMS: Record<number, number[]> = {
  0x0621: [0xfe80],
  0x0622: [0xfe81, 0xfe82],
  0x0623: [0xfe83, 0xfe84],
  0x0624: [0xfe85, 0xfe86],
  0x0625: [0xfe87, 0xfe88],
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  0x0627: [0xfe8d, 0xfe8e],
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  0x0629: [0xfe93, 0xfe94],
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  0x062f: [0xfea9, 0xfeaa],
  0x0630: [0xfeab, 0xfeac],
  0x0631: [0xfead, 0xfeae],
  0x0632: [0xfeaf, 0xfeb0],
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0],
  0x0640: [0x0640, 0x0640, 0x0640, 0x0640],
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0],
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  0x0648: [0xfeed, 0xfeee],
  0x0649: [0xfeef, 0xfef0],
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4],
};

// لام + ألف: [منفصل، آخر]
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6],
  0x0623: [0xfef7, 0xfef8],
  0x0625: [0xfef9, 0xfefa],
  0x0627: [0xfefb, 0xfefc],
};

/** التشكيل والشدة: مبيقطعوش التوصيل */
const isMark = (c: number) => (c >= 0x064b && c <= 0x065f) || c === 0x0670;
const dual = (c?: number) => c !== undefined && (FORMS[c]?.length ?? 0) === 4;

export function shapeArabic(text: string): string {
  const cps = Array.from(text, (ch) => ch.codePointAt(0)!);
  // أقرب حرف قبل/بعد مع تخطّي التشكيل
  const neighbor = (i: number, step: 1 | -1) => {
    for (let j = i + step; j >= 0 && j < cps.length; j += step) if (!isMark(cps[j])) return cps[j];
    return undefined;
  };

  let out = "";
  let prevJoins = false; // الحرف اللي قبل ده بيتوصل باللي بعده
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    if (isMark(c)) {
      out += String.fromCodePoint(c);
      continue;
    }
    const forms = FORMS[c];
    if (!forms) {
      out += String.fromCodePoint(c);
      prevJoins = false;
      continue;
    }

    const next = neighbor(i, 1);
    if (c === 0x0644 && next !== undefined && LAM_ALEF[next]) {
      out += String.fromCodePoint(LAM_ALEF[next][prevJoins ? 1 : 0]);
      // نتخطّى الألف (ومعاها أي تشكيل على اللام)
      while (++i < cps.length && cps[i] !== next) if (isMark(cps[i])) out += String.fromCodePoint(cps[i]);
      prevJoins = false;
      continue;
    }

    const nextJoins = dual(c) && next !== undefined && Boolean(FORMS[next]) && next !== 0x0621;
    let form: number;
    if (forms.length === 4) form = prevJoins && nextJoins ? 3 : prevJoins ? 1 : nextJoins ? 2 : 0;
    else form = prevJoins && forms.length > 1 ? 1 : 0;
    out += String.fromCodePoint(forms[form]);
    prevJoins = nextJoins;
  }
  return out;
}

/**
 * الحروف الجاهزة مبتتقلبش لوحدها، فبنرتّب الكلمة من الشمال لليمين بنفسنا:
 * الحروف بالمقلوب، والأرقام والكلام الإنجليزي بيفضلوا بترتيبهم.
 */
export function visualWord(word: string): string {
  const chars = Array.from(word);
  const tokens: string[] = [];
  const ltr = /[0-9\u0660-\u0669A-Za-z.:/]/;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cp = ch.codePointAt(0)!;
    if (ltr.test(ch)) {
      let run = ch;
      while (i + 1 < chars.length && ltr.test(chars[i + 1])) run += chars[++i];
      tokens.push(run);
    } else if (isMark(cp) && tokens.length) {
      tokens[tokens.length - 1] += ch;
    } else {
      tokens.push(ch);
    }
  }
  return tokens.reverse().join("");
}
