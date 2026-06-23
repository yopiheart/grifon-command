import React from 'react';
import { T_LABEL } from './wizardTokens';

// ===========================================================================
// FieldLabel — the canonical "// Label" meta-label above a control.
// Mono, uppercase, tracked; turns gold when its field group is focused
// (wrap the field in a `group/field` to get the focus tint). Matches the
// One-Shot composer's label grammar so every step reads identically.
// ===========================================================================

export const FieldLabel: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    /** Show the leading `// ` marker (house convention). Default true. */
    marker?: boolean;
  }
> = ({ children, className = '', marker = true, ...props }) => (
  <label
    className={`block text-zinc-400 ${T_LABEL} group-focus-within/field:text-[#FFCC00] transition-colors ${className}`}
    {...props}
  >
    {marker ? '// ' : ''}
    {children}
  </label>
);

export default FieldLabel;
