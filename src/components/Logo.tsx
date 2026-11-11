/** اللوجو PNG أبيض، فبنعرضه كـ mask بلون الوضع الحالي (أخضر في الفاتح، كريمي في الغامق) */
export function Logo({ className = "", label }: { className?: string; label?: string }) {
  return label ? (
    <span role="img" aria-label={label} className={`logo-mask ${className}`} />
  ) : (
    <span aria-hidden className={`logo-mask ${className}`} />
  );
}
