/** إطار على شكل محراب لصورة الشيخ. بدّل الـ placeholder بـ next/image لما الصورة تجهز. */
import Image from "next/image";

export function ArchPortrait({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full ${className}`}>
      <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-gold/10 blur-3xl" />
      <div className="rounded-b-[28px] rounded-t-[999px] border border-gold/40 p-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-b-[20px] rounded-t-[999px] border border-gold/20 bg-gradient-to-b from-emerald/70 to-surface">
          <Image
            src="/images/sheikh.jpg"
            alt="الشيخ ياسر الدوسري"
            fill
            priority
            sizes="(min-width: 1024px) 280px, 240px"
            className="object-cover object-[50%_80%]"
          />
        </div>
      </div>
    </div>
  );
}