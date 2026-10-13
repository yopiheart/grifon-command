import React from 'react';
import { T_CTRL } from './wizardTokens';

// ===========================================================================
// FieldLabel — the canonical "// Label" above a control.
// Readable sans, normal case/tracking; turns gold when its field group is focused
// (wrap the field in a `group/field` to get the focus tint). Matches the
// shared control typography so every step reads identically.
// ===========================================================================

export const FieldLabel: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    /** Show the leading `// ` marker (house convention). Default true. */
    marker?: boolean;
    /** Turns the label red (on-confirm validator). */
    invalid?: boolean;
  }
> = ({ children, className = '', marker = true, invalid = false, ...props }) => (
  <label
    className={`block ${invalid ? 'text-red-400' : 'text-zinc-400 group-focus-within/field:text-[#FFCC00]'} ${T_CTRL} transition-colors ${className}`}
    {...props}
  >
    {marker ? '// ' : ''}
    {children}
  </label>
);

export default FieldLabel;
