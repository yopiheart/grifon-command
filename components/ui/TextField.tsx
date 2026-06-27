import React from 'react';
import { CTRL_H, R_CTRL, INPUT_SHELL, INPUT_SHELL_INVALID } from './wizardTokens';
import { FieldLabel } from './FieldLabel';

// ===========================================================================
// TextField / TextArea — token-based inputs on the wizard's shared shell
// (gold focus ring; TextField on the h-11 control floor, TextArea sized by
// `rows`). Optional FieldLabel above. Tokenized successors to the
// under-spec'd ui/Input + ui/Textarea; adopt these in wizard steps going
// forward. Co-located in one file because TextArea.tsx would case-collide with
// the legacy ui/Textarea.tsx on Windows.
//
// PRESENTATIONAL ONLY: callers keep owning value/onChange — these change how a
// control looks, never what it writes.
// ===========================================================================

export const TextField: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; invalid?: boolean }
> = ({ label, invalid = false, className = '', id, ...props }) => (
  <div className="group/field w-full">
    {label && (
      <FieldLabel htmlFor={id} className="mb-2" invalid={invalid}>
        {label}
      </FieldLabel>
    )}
    <input id={id} className={`${invalid ? INPUT_SHELL_INVALID : INPUT_SHELL} ${CTRL_H} ${R_CTRL} ${className}`} {...props} />
  </div>
);

export const TextArea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; invalid?: boolean }
> = ({ label, invalid = false, className = '', id, rows = 3, ...props }) => (
  <div className="group/field w-full">
    {label && (
      <FieldLabel htmlFor={id} className="mb-2" invalid={invalid}>
        {label}
      </FieldLabel>
    )}
    <textarea
      id={id}
      rows={rows}
      className={`${invalid ? INPUT_SHELL_INVALID : INPUT_SHELL} resize-none py-3 leading-relaxed ${R_CTRL} ${className}`}
      {...props}
    />
  </div>
);

export default TextField;
