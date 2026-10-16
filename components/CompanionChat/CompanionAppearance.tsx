import { Moon, Sun } from 'lucide-react';
import Button from '../ui/Button';

export type CompanionAppearance = 'light' | 'dark';
export const COMPANION_APPEARANCE_KEY = 'grifon-companion-appearance';

export function readCompanionAppearance(): CompanionAppearance {
  try { return localStorage.getItem(COMPANION_APPEARANCE_KEY) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function CompanionAppearanceChoices({ appearance, onChange }: {
  appearance: CompanionAppearance;
  onChange: (appearance: CompanionAppearance) => void;
}) {
  return <div role="group" aria-label="Chat appearance" className="companion-appearance-choices flex items-center gap-1">
    <Button type="button" variant="ghost" aria-label="Light" aria-pressed={appearance === 'light'} onClick={() => onChange('light')} className="companion-appearance-choice min-h-11 min-w-11 !rounded-full !p-3">
      <Sun aria-hidden="true" className="h-4 w-4" /><span className="companion-appearance-label">Light</span>
    </Button>
    <Button type="button" variant="ghost" aria-label="Dark" aria-pressed={appearance === 'dark'} onClick={() => onChange('dark')} className="companion-appearance-choice min-h-11 min-w-11 !rounded-full !p-3">
      <Moon aria-hidden="true" className="h-4 w-4" /><span className="companion-appearance-label">Dark</span>
    </Button>
  </div>;
}
