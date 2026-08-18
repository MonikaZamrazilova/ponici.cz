import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  span?: 1 | 2;
};

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  span?: 1 | 2;
};

type FormFieldProps = InputProps | TextareaProps;

const inputClasses =
  "mt-3 w-full border-b border-border bg-transparent py-3 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:border-sage-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-sage-deep focus-visible:outline-offset-2";

function isTextarea(props: FormFieldProps): props is TextareaProps {
  return "rows" in props && props.rows !== undefined;
}

export function FormField(props: FormFieldProps) {
  const { label, span, ...fieldProps } = props;

  return (
    <label className={`block${span === 2 ? " md:col-span-2" : ""}`}>
      <span className="text-micro uppercase tracking-caption text-muted-foreground">{label}</span>
      {isTextarea(props) ? (
        <textarea
          className={`${inputClasses} resize-none`}
          {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={inputClasses}
          {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </label>
  );
}
