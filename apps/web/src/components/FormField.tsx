import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BaseProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
}

interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id">, BaseProps {
  as?: "input";
}

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">, BaseProps {
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
        <Textarea
          id={id}
          aria-invalid={!!error}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <Input
          id={id}
          aria-invalid={!!error}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}
