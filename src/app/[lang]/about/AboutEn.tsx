import Link from "@/lib/i18n/nav";
import { CONTACT_EMAIL, FEEDBACK_URL, feedbackHref } from "@/lib/site";

/** صفحة «عن الموقع» بالإنجليزي: نص مكتوب بالإنجليزي مباشرة (مش ترجمة جملة بجملة) */
const SOURCES = [
  { name: "MP3Quran", href: "https://www.mp3quran.net", what: "The recited Mushaf in audio, through their public API." },
  {
    name: "“Telawat Yasser Al-Dosari, Imam of the Grand Mosque” on YouTube",
    href: "https://www.youtube.com/@telawatyasseer1",
    what: "Recitations from the obligatory prayers, Taraweeh and khutbahs. The audio versions on this site are published with the channel owner’s permission.",
  },
  {
    name: "Saudi Center for Quranic Recitations and Prophetic Hadiths",
    href: "https://www.youtube.com/playlist?list=PLbi9UdPlMRS635t0pMgYJARJGYu4BAhe8",
    what: "The recited Mushaf (video edition), shown in YouTube’s official player.",
  },
  {
    name: "Al Quran Cloud",
    href: "https://alquran.cloud",
    what: "The Quran text in Uthmani script, the Saheeh International English translation, and Tafsir al-Muyassar (King Fahd Complex).",
  },
  { name: "QuranEnc (via the quran-json library)", href: "https://quranenc.com", what: "The Quran text used for searching inside verses." },
  {
    name: "General Presidency for the Affairs of the Two Holy Mosques",
    href: "https://x.com/PRAGOVSA",
    what: "The Sheikh’s imamate schedule at the Grand Mosque, as announced weekly.",
  },
  { name: "Aladhan", href: "https://aladhan.com", what: "Prayer times in Makkah (Umm al-Qura calendar)." },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-28 flex-col gap-4">
      <h2 id={`${id}-title`} className="font-display text-3xl font-bold text-gold-soft">
        {title}
      </h2>
      <div className="flex flex-col gap-4 text-[17px] leading-8 text-text/90">{children}</div>
    </section>
  );
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const a = "text-gold-soft underline underline-offset-4";

export function AboutEn() {
  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <article className="mx-auto flex max-w-3xl flex-col gap-14">
        <header className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">About this site</h1>
          <p className="text-lg leading-8 text-muted">
            A volunteer project that brings Sheikh Yasser Al-Dosari’s recitations together in one place: the obligatory prayers he leads at the Grand
            Mosque in Makkah, the full recited Mushaf, the nights of Taraweeh and his khutbahs, along with his next scheduled imamate.
          </p>
        </header>

        <div className="glass-card flex flex-col gap-2 rounded-3xl p-6">
          <p className="font-semibold">This is not an official website.</p>
          <p className="leading-7 text-muted">
            It is not affiliated with Sheikh Yasser Al-Dosari, the General Presidency for the Affairs of the Two Holy Mosques, or any official body. It is a
            volunteer effort to collect his recitations in one place.
          </p>
        </div>

        <Section id="sources" title="Sources">
          <p>All recitations belong to their owners. We show them directly from their sources, or with their owners’ permission, without altering the recitation:</p>
          <ul className="flex flex-col gap-3">
            {SOURCES.map((s) => (
              <li key={s.href} className="glass-card flex flex-col gap-1 rounded-2xl px-5 py-4">
                <a href={s.href} {...ext} className="font-semibold text-gold-soft underline-offset-4 hover:underline">
                  {s.name}
                </a>
                <span className="text-[15px] leading-7 text-muted">{s.what}</span>
              </li>
            ))}
          </ul>
          <p className="text-[15px] text-muted">
            Images on this site belong to their owners. If you own any content here and would like it changed or removed, contact us and we will respond as soon as
            possible.
          </p>
        </Section>

        <Section id="privacy" title="Privacy policy">
          <p>
            <strong>We don’t collect your personal data.</strong> There are no accounts or sign-up forms, and we never sell or share any data.
          </p>
          <p>
            <strong>Stored on your device only:</strong> your favorites and playlists, the last recitation you listened to and where you stopped, your khatma and
            daily wird progress, your last-read surah, bookmark and reading settings, and recitations you saved for offline listening. This data stays in your
            browser, never reaches us, and you can delete it by clearing the site’s data in your browser.
          </p>
          <p>
            <strong>Aggregate statistics:</strong> we count visits, plays and shares in total, to learn what helps visitors most. We don’t use cookies for this, and
            we don’t store your IP address or any persistent device ID, only an encrypted token that changes every day and can’t be traced back to a visitor.
          </p>
          <p>
            <strong>Notifications (optional):</strong> if you turn on notifications, we store the subscription address your browser provides, only to send you
            notifications about new recitations. It contains no name, email or phone number, and is deleted as soon as you turn notifications off.
          </p>
          <p>
            <strong>YouTube services:</strong> this site uses YouTube API Services to show video recitations. When you play a recitation from YouTube, YouTube
            handles it under the{" "}
            <a href="https://www.youtube.com/t/terms" {...ext} className={a}>
              YouTube Terms of Service
            </a>{" "}
            and the{" "}
            <a href="https://policies.google.com/privacy" {...ext} className={a}>
              Google Privacy Policy
            </a>
            , and may set its own cookies. By using these recitations you agree to YouTube’s Terms of Service.
          </p>
          <p>
            <strong>External sources:</strong> when you play an audio recitation, the file loads directly from its source’s servers (such as MP3Quran), which
            see your IP address like any website you visit.
          </p>
          <p>
            <strong>Hosting:</strong> the site is hosted on Vercel, which may keep temporary technical logs (such as IP address and visit time) to run and protect
            the service.
          </p>
          <p className="text-[15px] text-muted">Last updated: November 2026</p>
        </Section>

        <Section id="contact" title="Contact and suggestions">
          <p>The site is still being developed, and any suggestion, note or mistake you spot helps us a lot.</p>
          <a
            href={feedbackHref}
            {...(FEEDBACK_URL ? ext : {})}
            className="self-start rounded-full bg-accent px-6 py-3 font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Send a suggestion
          </a>
          <p className="text-[15px] text-muted">
            Or email us at: <span className="text-gold-soft">{CONTACT_EMAIL}</span>
          </p>
        </Section>

        <Link href="/" className="self-start rounded-full border border-line-strong px-6 py-3 font-semibold text-gold-soft transition-colors hover:border-gold/50">
          Back to home
        </Link>
      </article>
    </>
  );
}
