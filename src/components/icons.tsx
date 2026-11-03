type P = { className?: string };
const base = { "aria-hidden": true, viewBox: "0 0 24 24" } as const;

// أيقونات التشغيل مش بتتعكس في الواجهات العربية — دي القاعدة المتعارف عليها
export const PlayIcon = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor"><path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z" /></svg>
);
export const PauseIcon = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></svg>
);
export const PrevIcon = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor"><path d="M17 6.2v11.6a.7.7 0 0 1-1.1.6L8.4 12.6a.7.7 0 0 1 0-1.2l7.5-5.8a.7.7 0 0 1 1.1.6Z" /><rect x="6" y="6" width="2" height="12" rx="1" /></svg>
);
export const NextIcon = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor"><path d="M7 6.2v11.6a.7.7 0 0 0 1.1.6l7.5-5.8a.7.7 0 0 0 0-1.2L8.1 5.6A.7.7 0 0 0 7 6.2Z" /><rect x="16" y="6" width="2" height="12" rx="1" /></svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const MarkIcon = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16 3 28 10v12L16 29 4 22V10Z" /><path d="M11 18c0-4 3-6 5-6s5 2 5 6" /><path d="M9 21h14" /></svg>
);
export const EqualizerIcon = ({ className }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <rect className="eq-bar" x="5" y="6" width="3" height="12" rx="1" />
    <rect className="eq-bar" x="10.5" y="6" width="3" height="12" rx="1" />
    <rect className="eq-bar" x="16" y="6" width="3" height="12" rx="1" />
  </svg>
);

export function CategoryIcon({ category, className }: P & { category: "fard" | "mushaf" | "taraweeh" | "lectures" }) {
  const common = { "aria-hidden": true, viewBox: "0 0 24 24", className, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (category === "fard") {
    return (
      <svg {...common}><path d="M4 20h16" /><path d="M6.5 20v-5.5a5.5 5.5 0 0 1 11 0V20" /><path d="M12 9V5.5" /><path d="M12 5.5a1.5 1.5 0 0 0 1.5-1.5" /><path d="M10 20v-3a2 2 0 0 1 4 0v3" /></svg>
    );
  }
  if (category === "mushaf") {
    // مصحف مفتوح على حامل (رحل)
    return (
      <svg {...common}><path d="M12 6.5C10 5.2 7.5 4.8 4.5 5.3v8.5c3-.5 5.5-.1 7.5 1.2 2-1.3 4.5-1.7 7.5-1.2V5.3c-3-.5-5.5-.1-7.5 1.2Z" /><path d="M12 6.5V15" /><path d="m7 20.5 10-5.5" /><path d="m17 20.5-10-5.5" /></svg>
    );
  }
  if (category === "lectures") {
    // ميكروفون
    return (
      <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /><path d="M9 21h6" /></svg>
    );
  }
  return (
    <svg {...common}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /><path d="m17 4 .6 1.4 1.4.6-1.4.6L17 8l-.6-1.4L15 6l1.4-.6Z" /></svg>
  );
}

const stroke = { "aria-hidden": true, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const HeartIcon = ({ className, filled }: P & { filled?: boolean }) => (
  <svg {...stroke} className={className} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7.5-4.5-7.5-10.2A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.7C19.5 15.5 12 20 12 20Z" />
  </svg>
);
export const GaugeIcon = ({ className }: P) => (
  <svg {...stroke} className={className}><path d="M4.2 17a8.5 8.5 0 1 1 15.6 0" /><path d="m12 14 3.5-4" /><circle cx="12" cy="14" r="1.2" fill="currentColor" /></svg>
);
export const Replay10Icon = ({ className }: P) => (
  <svg {...stroke} className={className}>
    <path d="M5 12.5a7 7 0 1 0 2.1-5" /><path d="M4.5 4v4h4" />
    <text x="12.2" y="15.6" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">10</text>
  </svg>
);
export const Forward10Icon = ({ className }: P) => (
  <svg {...stroke} className={className}>
    <path d="M19 12.5a7 7 0 1 1-2.1-5" /><path d="M19.5 4v4h-4" />
    <text x="11.8" y="15.6" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">10</text>
  </svg>
);
export const TimerIcon = ({ className }: P) => (
  <svg {...stroke} className={className}><circle cx="12" cy="13.5" r="7" /><path d="M12 10.5v3l2 2" /><path d="M10 3h4" /></svg>
);
export const VolumeIcon = ({ className, muted }: P & { muted?: boolean }) => (
  <svg {...stroke} className={className}>
    <path d="M4 9.5h3l4.5-4v13L7 14.5H4Z" fill="currentColor" />
    {muted ? (
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    ) : (
      <>
        <path d="M15 9.2a4 4 0 0 1 0 5.6" />
        <path d="M17.6 6.6a7.6 7.6 0 0 1 0 10.8" />
      </>
    )}
  </svg>
);

export const ClockIcon = ({ className }: P) => (
  <svg {...stroke} className={className}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></svg>
);

/** أيقونة لكل صلاة: شروق للفجر، غروب للمغرب، هلال ونجمة للعشاء */
export function PrayerIcon({ prayer, className }: P & { prayer: "fajr" | "maghrib" | "isha" }) {
  if (prayer === "isha") {
    return (
      <svg {...stroke} className={className}><path d="M15.5 16.5A6.5 6.5 0 1 1 9 7a5 5 0 0 0 6.5 9.5Z" /><path d="M18 4.5v3M16.5 6h3" /></svg>
    );
  }
  const up = prayer === "fajr";
  return (
    <svg {...stroke} className={className}>
      <path d="M3 18h18" />
      <path d="M7 18a5 5 0 0 1 10 0" />
      <path d="M4.8 14.2 6.2 15M19.2 14.2l-1.4.8" />
      {up ? <path d="M12 10V4.5M9.8 6.7 12 4.5l2.2 2.2" /> : <path d="M12 4.5V10M9.8 7.8 12 10l2.2-2.2" />}
    </svg>
  );
}
