/* eslint-disable @next/next/no-img-element -- مكتبة صور المشاركة بتفهم <img> بس */
import { ImageResponse } from "next/og";
import type { Recording } from "@/types";
import { recordings } from "@/lib/api";
import { getCategory, hijriMonthName } from "@/lib/categories";
import { toArabicDigits } from "@/lib/format";
import { OG_LOGO, ogFonts } from "@/lib/og/assets";
import { shapeArabic, visualWord } from "@/lib/og/shape";
import { siteUrl } from "@/lib/site";

/**
 * صورة المشاركة لكل تلاوة (واتساب وفيسبوك وتليجرام): اسم التلاوة وقسمها، وختم فيه التاريخ أو رقم الليلة أو السورة.
 * بتتولد أول مرة حد يشارك اللينك، وبعدين بتتخزن، فمفيش صور بتترفع ولا بتتخزن على R2.
 */
export const alt = "تلاوة بصوت الشيخ ياسر الدوسري";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 21600;

const C = {
  bg: "#163C30",
  bgDeep: "#0F2A21",
  cream: "#F4EEE1",
  muted: "#B9C4BC",
  gold: "#CDAA62",
  goldSoft: "#E7CD94",
};

/**
 * مكتبة الصور بترسم الكلام من الشمال لليمين، فالجملة العربية بتطلع مقلوبة.
 * الحل: كل كلمة لوحدها في صف بيبدأ من اليمين (row-reverse)، والحروف متشكّلة ومترتّبة مسبقًا (shape.ts).
 */
function Rtl({ text, style }: { text: string; style: React.CSSProperties }) {
  const words = shapeArabic(text).split(/\s+/).filter(Boolean).map(visualWord);
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", ...style }}>
      {words.map((w, i) => (
        <span key={i} style={{ marginLeft: "0.26em" }}>
          {w}
        </span>
      ))}
    </div>
  );
}

/** بيقص النص لو طويل، عند آخر كلمة كاملة */
function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max)} …`;
}

/** محتوى الختم: الرقم الكبير والكلمة اللي فوقه أو تحته. من غير بيانات، اسم القسم */
function seal(r: Recording | undefined, label: string): { top?: string; big?: string; bottom?: string } {
  if (r?.category === "taraweeh" && r.night) return { top: "ليلة", big: toArabicDigits(r.night), bottom: "رمضان" };
  if (r?.hijriDay && r.hijriMonth) return { big: toArabicDigits(r.hijriDay), bottom: hijriMonthName(r.hijriMonth) };
  if (r?.surah) return { top: "سورة", big: toArabicDigits(r.surah) };
  return { bottom: label };
}

/** "صلاة العشاء، ١ رجب ١٤٤٦ هـ" ← العنوان فوق والتاريخ تحته */
function splitTitle(title: string): [string, string] {
  const i = title.indexOf("، ");
  return i > 0 ? [title.slice(0, i), title.slice(i + 2)] : [title, ""];
}

/** نجمة ثمانية زي نقشة الموقع، والنقشة نفسها بتسيح ناحية النص */
const PATTERN = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<defs>
<pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse">
<g fill="none" stroke="${C.gold}" stroke-width="0.8"><path d="M20 20h40v40H20z"/><path d="M40 11.7 68.3 40 40 68.3 11.7 40z"/><path d="M0 0l20 20M80 0 60 20M0 80l20-20M80 80 60 60"/></g>
</pattern>
<linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.06"/><stop offset="0.75" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="m"><rect width="1200" height="630" fill="url(#f)"/></mask>
</defs>
<rect width="1200" height="630" fill="url(#p)" mask="url(#m)"/>
</svg>`)}`;

const STAR = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
<g fill="${C.bgDeep}" stroke="${C.gold}" stroke-width="2.5" stroke-linejoin="round">
<path d="M53 53h214v214H53z"/><path d="M160 8.7 311.3 160 160 311.3 8.7 160z"/>
</g>
</svg>`)}`;

export default async function Image({ params }: { params: { category: string; id: string } }) {
  const category = getCategory(params.category);
  const id = decodeURIComponent(params.id);
  const r = category ? (await recordings.list({ category: category.slug })).find((x) => x.id === id) : undefined;

  const [main, date] = splitTitle(r?.title ?? "تلاوات الشيخ ياسر الدوسري");
  const title = clip(main, 40);
  const subtitle = r?.subtitle ? clip(r.subtitle, 70) : "";
  const s = seal(r, category?.label ?? "");
  const titleSize = title.length > 24 ? 58 : 70;
  const host = siteUrl.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          // لون واحد مش تدرّج: الـ PNG بيفضل خفيف (التدرّج بيضاعف حجم الصورة)
          background: C.bg,
          fontFamily: "Plex, PlexLatin",
          color: C.cream,
        }}
      >
        <img alt="" src={PATTERN} width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />

        {/* الختم على الشمال */}
        <div style={{ position: "absolute", left: 90, top: 155, width: 320, height: 320, display: "flex" }}>
          <img alt="" src={STAR} width={320} height={320} style={{ position: "absolute", top: 0, left: 0 }} />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 320,
              height: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: C.goldSoft,
            }}
          >
            {s.top && <Rtl text={s.top} style={{ fontSize: 28, color: C.gold, lineHeight: 1 }} />}
            {s.big && <div style={{ fontSize: 104, fontWeight: 600, lineHeight: 1.1 }}>{s.big}</div>}
            {s.bottom && <Rtl text={s.bottom} style={{ fontSize: s.big ? 28 : 40, color: s.big ? C.gold : C.goldSoft, lineHeight: 1 }} />}
          </div>
        </div>

        {/* النص على اليمين */}
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 70,
            bottom: 64,
            width: 640,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <img alt="" src={OG_LOGO} width={240} height={60} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", width: "100%" }}>
            {category && <Rtl text={category.title} style={{ fontSize: 30, color: C.gold, marginBottom: 14 }} />}
            <Rtl text={title} style={{ fontSize: titleSize, fontWeight: 600, lineHeight: 1.3, width: "100%" }} />
            {date && <Rtl text={date} style={{ fontSize: 40, color: C.goldSoft, marginTop: 6, width: "100%" }} />}
            {subtitle && <Rtl text={subtitle} style={{ fontSize: 28, color: C.muted, marginTop: 20, width: "100%", lineHeight: 1.4 }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 24, color: C.muted, fontFamily: "PlexLatin" }}>{host}</div>
            <div style={{ width: 56, height: 2, background: C.gold, marginLeft: 18 }} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
