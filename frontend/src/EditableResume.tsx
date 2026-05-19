import { useEffect, useRef } from "react";

type EditableResumeProps = {
  html: string;
  readOnly: boolean;
  onChange: (html: string) => void;
};

export function EditableResume({ html, readOnly, onChange }: EditableResumeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!rootRef.current || editingRef.current) return;
    if (rootRef.current.innerHTML !== html) {
      rootRef.current.innerHTML = html;
    }
  }, [html]);

  return (
    <div
      ref={rootRef}
      className={`resume-html editable-resume ${readOnly ? "readonly" : ""}`}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => {
        editingRef.current = true;
      }}
      onBlur={(event) => {
        editingRef.current = false;
        onChange(event.currentTarget.innerHTML);
      }}
      onInput={(event) => {
        if (readOnly) return;
        onChange(event.currentTarget.innerHTML);
      }}
      onPaste={(event) => {
        if (readOnly) return;
        const text = event.clipboardData.getData("text/plain");
        if (!text) return;
        event.preventDefault();
        document.execCommand("insertText", false, text);
      }}
    />
  );
}
