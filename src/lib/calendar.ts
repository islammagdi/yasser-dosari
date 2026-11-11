import type { ImamateSlot } from "@/types";
import { IMAMATE_PRAYER_LABELS, NIGHT_PART_LABELS } from "./imamate";

const LOCATION = "المسجد الحرام، مكة المكرمة";
const DURATION_MIN = 45;

interface CalendarEvent {
  title: string;
  details: string;
  /** "20261108T020000Z" أو لو اليوم كله: "20261108" */
  start: string;
  end: string;
  allDay: boolean;
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dayStamp = (iso: string) => iso.replace(/-/g, "");

/** موعد الإمامة كحدث: من الأذان لمدة ٤٥ دقيقة. لو مواقيت الصلاة مش متاحة، بيبقى حدث لليوم كله */
export function imamateEvent(slot: ImamateSlot, siteUrl: string): CalendarEvent {
  const prayer = slot.prayer === "jumuah" ? "خطبة وصلاة الجمعة" : `صلاة ${IMAMATE_PRAYER_LABELS[slot.prayer]}`;
  const part = slot.part ? ` (${NIGHT_PART_LABELS[slot.part]})` : "";
  const backup = slot.backup ? " (احتياطي)" : "";
  const title = `${slot.backup ? "الشيخ ياسر الدوسري إمام احتياطي" : "إمامة الشيخ ياسر الدوسري"}: ${prayer}${part}${backup}`;
  const details = slot.backup
    ? `الشيخ ياسر الدوسري إمام احتياطي في ${prayer} بالمسجد الحرام، فقد لا يؤم الصلاة.\n${siteUrl}`
    : `${prayer} في المسجد الحرام بإمامة الشيخ ياسر الدوسري، حسب الجدول المعلن.\n${siteUrl}`;

  if (slot.start) {
    // بتوقيت مكة (UTC+3). التراويح والتهجد أطول من الفروض
    const begin = new Date(`${slot.date}T${slot.start}:00+03:00`);
    const end = slot.time ? new Date(`${slot.date}T${slot.time}:00+03:00`) : new Date(begin.getTime() + DURATION_MIN * 60_000);
    return { title, details, start: stamp(begin), end: stamp(end), allDay: false };
  }
  const next = new Date(`${slot.date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { title, details, start: dayStamp(slot.date), end: dayStamp(next.toISOString().slice(0, 10)), allDay: true };
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${e.start}/${e.end}`,
    details: e.details,
    location: LOCATION,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

/** معيار iCalendar: السطر ميزيدش عن ٧٥ بايت، والزيادة بتنزل سطر جديد أوله مسافة (من غير ما نقطع حرف عربي) */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function veventLines(e: CalendarEvent, uid: string): string[] {
  const when = e.allDay
    ? [`DTSTART;VALUE=DATE:${e.start}`, `DTEND;VALUE=DATE:${e.end}`]
    : [`DTSTART:${e.start}`, `DTEND:${e.end}`];
  const alarm = e.allDay
    ? []
    : ["BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM"];
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@yasser-dosari`,
    `DTSTAMP:${stamp(new Date())}`,
    ...when,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(LOCATION)}`,
    `DESCRIPTION:${esc(e.details)}`,
    ...alarm,
    "END:VEVENT",
  ];
}

/**
 * تقويم كامل فيه أكتر من موعد. لو فيه name، بيبقى تقويم اشتراك:
 * التطبيق بيعرضه باسمه وبيحدّثه لوحده كل refreshHours ساعة.
 */
export function icsCalendar(items: { event: CalendarEvent; uid: string }[], opts: { name?: string; refreshHours?: number } = {}): string {
  const header = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//yasser-dosari//imamate//AR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (opts.name) header.push(`X-WR-CALNAME:${esc(opts.name)}`, "X-WR-TIMEZONE:Asia/Riyadh");
  if (opts.refreshHours) {
    header.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${opts.refreshHours}H`, `X-PUBLISHED-TTL:PT${opts.refreshHours}H`);
  }
  const lines = [...header, ...items.flatMap((i) => veventLines(i.event, i.uid)), "END:VCALENDAR"];
  return lines.map(fold).join("\r\n");
}

/** ملف .ics بيفتح في تقويم الآيفون وأغلب تطبيقات التقويم، وفيه تنبيه قبل الموعد بنص ساعة */
export function icsFile(e: CalendarEvent, uid: string): Blob {
  return new Blob([icsCalendar([{ event: e, uid }])], { type: "text/calendar;charset=utf-8" });
}