import { BACKUP_FILES, listBackups, type BackupName } from "@/lib/admin/backup";
import { RestoreButton } from "./RestoreButton";

const when = (d: Date) => d.toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" });

export default async function AdminBackupsPage() {
  const names = Object.keys(BACKUP_FILES) as BackupName[];
  const lists = await Promise.all(names.map((n) => listBackups(n).catch(() => [])));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold">النسخ الاحتياطية</h1>
        <p className="max-w-2xl leading-7 text-muted">
          كل مرة تضغط «حفظ» في اللوحة، يُحفظ الشكل السابق هنا تلقائيًا (آخر ٣٠ نسخة لكل قسم). لو حفظت شيئًا بالخطأ، اختر النسخة التي قبلها واضغط «استرجاع».
          الاسترجاع نفسه يمكن التراجع عنه، لأن الشكل الحالي يُحفظ أولًا.
        </p>
      </div>

      {names.map((name, i) => (
        <section key={name} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold text-gold-soft">
            {BACKUP_FILES[name].label} <span className="text-base font-normal text-muted">({lists[i].length})</span>
          </h2>
          {lists[i].length === 0 ? (
            <p className="text-sm text-muted">لا توجد نسخ بعد. ستظهر هنا بعد أول «حفظ» في هذا القسم.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lists[i].map((b, j) => (
                <li key={b.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-3 text-sm">
                  <span>
                    الشكل قبل حفظ {when(b.date)}
                    {j === 0 && <span className="ms-2 text-gold-soft">(الأحدث)</span>}
                  </span>
                  <RestoreButton name={name} backupKey={b.key} label={when(b.date)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
