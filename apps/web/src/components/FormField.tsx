import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring/50 focus:border-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none";

const textareaClass =
  "border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring/50 focus:border-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none";

interface BaseProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
}

interface InputFieldProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: "input";
}

interface TextareaFieldProps extends BaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: "textarea";
}

type FormFieldProps = InputFieldProps | TextareaFieldProps;

export function FormField(props: FormFieldProps) {
  const { id, label, error, required, as = "input", ...rest } = props;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          aria-invalid={!!error}
          className={`${textareaClass} aria-[invalid=true]:border-destructive`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          aria-invalid={!!error}
          className={`${inputClass} aria-[invalid=true]:border-destructive`}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}
