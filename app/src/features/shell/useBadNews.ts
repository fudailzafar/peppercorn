import { useEffect } from 'react';
import { messages } from '@/state/app';
import { useAppState } from '@/state/hooks';

/** Says it again this often while nothing can be saved. */
const REMIND = 8000;

/** What has to be said about the data on this phone, for as long as it's true. */
export function useBadNews() {
  const unsaved = useAppState((s) => s.unsaved);
  const recovered = useAppState((s) => s.recovered);
  useEffect(() => {
    if (recovered) messages.warn('Your saved data couldn’t be read. A copy was kept on this phone.');
  }, [recovered]);
  useEffect(() => {
    if (!unsaved) return;
    const say = () => messages.warn('Couldn’t save on this phone. Free up some space.');
    say();
    const timer = setInterval(say, REMIND);
    return () => clearInterval(timer);
  }, [unsaved]);
}
