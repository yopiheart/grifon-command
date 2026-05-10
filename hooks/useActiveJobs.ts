import { useEffect, useState } from 'react';
import { subscribeActiveJobs, type ActiveJob } from '../services/activeJobsService';

export const useActiveJobs = (): ActiveJob[] => {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  useEffect(() => subscribeActiveJobs(setJobs), []);
  return jobs;
};
