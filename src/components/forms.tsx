"use client";

import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { initialActionState, type ActionState } from "@/server/state";

export function BoundForm({
  action,
  children,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction}>
      {children}
      <div className="form-footer">
        {state.message ? (
          <p className={state.ok ? "form-ok" : "form-error"} role={state.ok ? "status" : "alert"}>
            {state.message}
          </p>
        ) : (
          <span />
        )}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function AutoSelect({
  action,
  id,
  name,
  value,
  options,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  name: string;
  value: string;
  options: readonly { value: string; label: string }[];
  label: string;
}) {
  const selectId = `${name}-${id}`;
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}

export function ConfirmSubmit({
  action,
  id,
  label,
  message,
  hidden,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  message: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {hidden
        ? Object.entries(hidden).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)
        : null}
      <button className="btn small danger" type="submit">
        {label}
      </button>
    </form>
  );
}

function NoticeText() {
  const params = useSearchParams();
  const notice = params.get("notice");
  if (!notice) return null;
  return (
    <p className="notice" role="status">
      {notice}
    </p>
  );
}

export function Notice() {
  return (
    <Suspense fallback={null}>
      <NoticeText />
    </Suspense>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn secondary"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
    >
      {copied ? "Copied" : "Copy email version"}
    </button>
  );
}

export function PrintButton() {
  return (
    <button className="btn secondary" type="button" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
