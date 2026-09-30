import type { MathPrompt as Prompt } from "@/content/templates/types";
export function MathPrompt({ value }: { value: Prompt }) {
  return (
    <span>
      {value.map((node, index) =>
        node.kind === "text" ? (
          <span key={index}>{node.text}</span>
        ) : (
          <span
            key={index}
            className="mx-1 inline-flex flex-col items-center align-middle leading-tight"
            aria-label={`${node.numerator} per ${node.denominator}`}
          >
            <span className="border-b-2 border-current px-1">
              {node.numerator.replaceAll("-", "−")}
            </span>
            <span>{node.denominator}</span>
          </span>
        ),
      )}
    </span>
  );
}
