// بيطبع قوايم التشغيل في القناة، وأول ٣ عناوين في كل قايمة
const KEY = process.env.YOUTUBE_API_KEY;
const handle = process.argv[2] ?? "@telawatyasseer1";
const api = (path) => fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${KEY}`).then((r) => r.json());

const ch = await api(`channels?part=snippet&forHandle=${encodeURIComponent(handle)}`);
const channel = ch.items?.[0];
if (!channel) throw new Error("القناة مش موجودة أو الـ key غلط: " + JSON.stringify(ch.error ?? ch));
console.log("CHANNEL", channel.id, "|", channel.snippet.title);

let pageToken = "";
do {
  const pl = await api(`playlists?part=snippet,contentDetails&channelId=${channel.id}&maxResults=50&pageToken=${pageToken}`);
  for (const p of pl.items ?? []) {
    console.log(`\nPLAYLIST ${p.id} | ${p.snippet.title} | ${p.contentDetails.itemCount} فيديو`);
    const items = await api(`playlistItems?part=snippet&playlistId=${p.id}&maxResults=3`);
    for (const v of items.items ?? []) console.log("   -", v.snippet.title);
  }
  pageToken = pl.nextPageToken ?? "";
} while (pageToken);