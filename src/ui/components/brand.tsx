import { cn } from "@/ui/lib/cn";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 font-sans font-extrabold",
        large
          ? "text-[32px] leading-10 sm:gap-4 sm:text-[40px]"
          : "text-[22px] leading-7",
      )}
      aria-label="PapanNalar"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className={large ? "size-16" : "size-10"}
      >
        <rect
          x="4"
          y="8"
          width="56"
          height="44"
          rx="10"
          fill="var(--pn-teal-700)"
        />
        <path
          d="M15 42h10V32h11V22h10"
          fill="none"
          stroke="var(--pn-putih)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle cx="47" cy="18" r="5" fill="var(--pn-amber-500)" />
      </svg>
      <span aria-hidden="true">
        Papan<span className="text-primary">Nalar</span>
      </span>
    </div>
  );
}
