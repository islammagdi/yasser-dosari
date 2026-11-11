import { deleteKey, getFresh, listKeys, putJson } from "./r2";

/**
 * نسخ احتياطية لملفات اللوحة: قبل أي حفظ، النسخة الحالية بتتحفظ في admin/backups/<الاسم>/<التاريخ>.json
 * وبنحتفظ بآخر ٣٠ نسخة لكل ملف.
 */
export const BACKUP_FILES = {
  catalog: { key: "admin/catalog.json", label: "التسجيلات (الكتالوج)" },
  imamate: { key: "admin/imamate.json", label: "جدول الإمامة ورمضان" },
  daily: { key: "admin/daily.json", label: "تلاوة اليوم" },
} as const;
export type BackupName = keyof typeof BACKUP_FILES;

const KEEP = 30;
const dir = (name: BackupName) => `admin/backups/${name}/`;

/** بياخد نسخة من الملف الحالي قبل ما يتغيّر. لو فشلت، الحفظ نفسه بيكمّل عادي */
export async function backupBeforeSave(name: BackupName): Promise<void> {
  try {
    const current = await getFresh<unknown>(BACKUP_FILES[name].key);
    if (!current) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await putJson(`${dir(name)}${stamp}.json`, current);
    const keys = (await listKeys(dir(name))).sort();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - KEEP)).map((k) => deleteKey(k)));
  } catch (err) {
    console.warn(`backup ${name}: failed`, err);
  }
}

/** النسخ الموجودة، الأحدث الأول: { key, date } */
export async function listBackups(name: BackupName): Promise<{ key: string; date: Date }[]> {
  const keys = await listKeys(dir(name));
  return keys
    .map((key) => {
      const s = key.slice(dir(name).length, -5); // 2026-11-11T19-30-00-000Z
      const iso = s.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "T$1:$2:$3.$4Z");
      return { key, date: new Date(iso) };
    })
    .filter((b) => !Number.isNaN(b.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** بيرجّع نسخة قديمة مكان الملف الحالي (وبياخد نسخة من الحالي الأول، عشان الاسترجاع نفسه يتراجع عنه) */
export async function restoreBackup(name: BackupName, key: string): Promise<void> {
  if (!key.startsWith(dir(name))) throw new Error("نسخة غير صحيحة");
  const data = await getFresh<unknown>(key);
  if (!data) throw new Error("النسخة مش موجودة");
  await backupBeforeSave(name);
  await putJson(BACKUP_FILES[name].key, data);
}
