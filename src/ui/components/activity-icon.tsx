import type { PublicTool } from "@/contracts/tools";
import { cn } from "@/ui/lib/cn";

// Original vector illustrations; decorative faces never encode an answer.
export function FaceMarks() {
  return (
    <g fill="currentColor">
      <circle cx="16" cy="20" r="1.6" />
      <circle cx="26" cy="20" r="1.6" />
      <path
        d="M17 25 Q21 29 25 25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </g>
  );
}
export function ObjectFace({ className = "" }: { className?: string }) {
  return (
    <svg
      className={cn("object-face", className)}
      viewBox="9 13 24 18"
      aria-hidden="true"
      focusable="false"
    >
      <FaceMarks />
    </svg>
  );
}
export function ActivityIcon({
  kind,
  className,
}: {
  kind: PublicTool["kind"] | "writing";
  className?: string;
}) {
  return (
    <span className={cn("activity-icon", className)} aria-hidden="true">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="var(--pn-teal-700)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        {kind === "number-line" && (
          <>
            <path d="M5 36H43M10 32V40M24 32V40M38 32V40" />
            <circle cx="24" cy="18" r="12" fill="var(--pn-amber-500)" />
            <g transform="translate(3 -3)">
              <FaceMarks />
            </g>
          </>
        )}
        {kind === "fractions" && (
          <>
            <rect
              x="5"
              y="10"
              width="38"
              height="28"
              rx="8"
              fill="var(--pn-kertas)"
            />
            <path d="M18 11V37M31 11V37" />
            <path
              d="M6 18V30Q6 37 17 37V11Q6 11 6 18"
              fill="var(--pn-amber-500)"
              stroke="none"
            />
            <g transform="translate(11 2)">
              <FaceMarks />
            </g>
          </>
        )}
        {kind === "ratio" && (
          <>
            <rect
              x="5"
              y="8"
              width="38"
              height="33"
              rx="8"
              fill="var(--pn-teal-100)"
            />
            <path d="M5 25H43M21 8V41" />
            <circle cx="13" cy="17" r="4" fill="var(--pn-amber-500)" />
            <circle cx="12" cy="33" r="3" fill="var(--pn-amber-500)" />
            <circle cx="30" cy="33" r="3" fill="var(--pn-amber-500)" />
            <g transform="translate(9 -2)">
              <FaceMarks />
            </g>
          </>
        )}
        {kind === "algebra" && (
          <>
            <rect
              x="5"
              y="7"
              width="19"
              height="34"
              rx="5"
              fill="var(--pn-teal-100)"
            />
            <rect
              x="28"
              y="23"
              width="15"
              height="18"
              rx="4"
              fill="var(--pn-amber-500)"
            />
            <g transform="translate(-7 0)">
              <FaceMarks />
            </g>
            <path d="M10 33L18 25M10 25L18 33" />
          </>
        )}
        {kind === "balance" && (
          <>
            <path d="M7 13H41M24 8V40M16 41H32M11 13L5 28H17L11 13M37 13L31 28H43L37 13" />
            <path
              d="M5 28Q11 38 17 28M31 28Q37 38 43 28"
              fill="var(--pn-amber-500)"
            />
            <circle cx="24" cy="13" r="7" fill="var(--pn-teal-100)" />
            <g transform="translate(11 1) scale(.62)">
              <FaceMarks />
            </g>
          </>
        )}
        {kind === "graphs" && (
          <>
            <path d="M6 6V41H44M10 35Q20 35 24 24T40 9" />
            <circle cx="27" cy="21" r="11" fill="var(--pn-amber-500)" />
            <g transform="translate(6 0)">
              <FaceMarks />
            </g>
          </>
        )}
        {kind === "writing" && (
          <>
            <rect
              x="7"
              y="5"
              width="29"
              height="38"
              rx="7"
              fill="var(--pn-teal-100)"
            />
            <path
              d="M15 33L33 15L39 21L21 39L14 40Z"
              fill="var(--pn-amber-500)"
            />
            <g transform="translate(0 -6)">
              <FaceMarks />
            </g>
          </>
        )}
      </svg>
    </span>
  );
}
