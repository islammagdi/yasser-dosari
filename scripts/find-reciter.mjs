// بيدوّر على الشيخ في Quran.com، ويطبع كل تسجيلاته ورابط سورة الفاتحة من كل واحد
const API = "https://api.quran.com/api/v4";
const { reciters = [] } = await fetch(`${API}/resources/chapter_reciters?language=ar`).then((r) => r.json());

const matches = reciters.filter((r) =>
  /dossar|dussar|dosari|الدوسري/i.test(`${r.name} ${r.arabic_name ?? ""} ${r.translated_name?.name ?? ""}`),
);
if (!matches.length) console.log("مفيش نتايج. أسماء أول ٥ قراء عشان تتأكد إن الطلب شغال:", reciters.slice(0, 5).map((r) => r.name));

for (const r of matches) {
  const { audio_files = [] } = await fetch(`${API}/chapter_recitations/${r.id}`).then((x) => x.json());
  const fatiha = audio_files.find((f) => f.chapter_id === 1);
  console.log(`\n#${r.id} | ${r.name} | ${r.translated_name?.name ?? ""}`);
  console.log(`   ${audio_files.length} سورة`);
  console.log(`   الفاتحة: ${fatiha?.audio_url ?? "مش موجودة"}`);
}