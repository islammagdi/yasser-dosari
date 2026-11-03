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
  const prayer = IMAMATE_PRAYER_LABELS[slot.prayer];
  const part = slot.part ? ` (${NIGHT_PART_LABELS[slot.part]})` : "";
  const title = `إمامة الشيخ ياسر الدوسري: صلاة ${prayer}${part}`;
  const details = `صلاة ${prayer} في المسجد الحرام بإمامة الشيخ ياسر الدوسري، حسب الجدول المعلن.\n${siteUrl}`;

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

/** ملف .ics بيفتح في تقويم الآيفون وأغلب تطبيقات التقويم، وفيه تنبيه قبل الموعد بنص ساعة */
export function icsFile(e: CalendarEvent, uid: string): Blob {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
  const when = e.allDay
    ? [`DTSTART;VALUE=DATE:${e.start}`, `DTEND;VALUE=DATE:${e.end}`]
    : [`DTSTART:${e.start}`, `DTEND:${e.end}`];
  const alarm = e.allDay
    ? []
    : ["BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM"];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//yasser-dosari//imamate//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@yasser-dosari`,
    `DTSTAMP:${stamp(new Date())}`,
    ...when,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(LOCATION)}`,
    `DESCRIPTION:${esc(e.details)}`,
    ...alarm,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
}