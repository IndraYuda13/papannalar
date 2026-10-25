import { ArrowUpRight, Check, Layers, Presentation } from "lucide-react";
import { integerText } from "@/content/templates/format";

/** Product illustration only. The worked example is not a student's live result. */
export function LearningPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`pn-learning-preview ${compact ? "pn-learning-preview-compact" : ""}`}
      aria-label="Contoh kegiatan PapanNalar: memahami perpindahan pada garis bilangan"
    >
      <div className="pn-preview-back-card" aria-hidden>
        <Layers size={24} />
        <span>Jelajahi. Coba. Pahami.</span>
      </div>
      <div className="pn-preview-board">
        <div className="pn-preview-toolbar">
          <span>
            <Presentation size={15} /> Layar Kelas
          </span>
          <span>CONTOH</span>
        </div>
        <div className="pn-preview-question">
          <span>BILANGAN BULAT</span>
          <h3>
            Dari −2 ke 5.
            <br />
            Berapa langkah naik?
          </h3>
        </div>
        <svg
          viewBox="0 0 360 122"
          role="img"
          aria-label="Garis bilangan dari minus dua menuju lima, tujuh langkah ke kanan"
        >
          <path d="M24 81H336" stroke="currentColor" strokeWidth="2" />
          <path
            d="M68 52C68 5 292 5 292 52"
            fill="none"
            stroke="var(--pn-teal-700)"
            strokeWidth="3"
          />
          <path
            d="m285 45 7 8 6-9"
            fill="none"
            stroke="var(--pn-teal-700)"
            strokeWidth="3"
          />
          {Array.from({ length: 10 }, (_, i) => (
            <g key={i}>
              <path
                d={`M${36 + i * 32} 75v12`}
                stroke="currentColor"
                strokeWidth="2"
              />
              <text
                x={36 + i * 32}
                y="110"
                textAnchor="middle"
                fill="currentColor"
                fontSize="13"
              >
                {integerText(i - 3)}
              </text>
            </g>
          ))}
          <circle cx="68" cy="81" r="7" fill="var(--pn-teal-700)" />
          <circle
            cx="292"
            cy="81"
            r="7"
            fill="white"
            stroke="var(--pn-teal-700)"
            strokeWidth="3"
          />
          <rect
            x="139"
            y="9"
            width="73"
            height="28"
            rx="14"
            fill="var(--pn-teal-700)"
          />
          <text x="175" y="28" textAnchor="middle" fill="white" fontSize="13">
            +7 langkah
          </text>
        </svg>
        <div className="pn-preview-answer">
          <span>
            <Check size={17} /> Model dulu, angka kemudian.
          </span>
          <ArrowUpRight size={18} />
        </div>
      </div>
      <div className="pn-preview-note" aria-hidden>
        <span>?</span>
        <div>
          <strong>Kenapa bisa begitu?</strong>
          <p>Ajak siswa menjelaskan caranya.</p>
        </div>
      </div>
    </div>
  );
}
