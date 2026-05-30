import { useEffect, useState } from 'react';

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the deadline has passed (or the date is invalid). */
  expired: boolean;
}

const compute = (deadlineISO: string): CountdownState => {
  const diff = new Date(deadlineISO).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
};

/** Live countdown to an ISO deadline. Re-renders once per second. */
export const useCountdown = (deadlineISO: string): CountdownState => {
  const [state, setState] = useState<CountdownState>(() => compute(deadlineISO));

  useEffect(() => {
    setState(compute(deadlineISO));
    const id = window.setInterval(() => setState(compute(deadlineISO)), 1000);
    return () => window.clearInterval(id);
  }, [deadlineISO]);

  return state;
};
