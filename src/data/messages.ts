import { createStore } from 'zustand/vanilla';

/** A line at the bottom of the screen, with Undo when there is something to undo. */
export interface Message {
  text: string;
  error?: boolean;
  undo?: () => void;
}

const PLAIN = 3000;
/** Time to read what went wrong, or to undo. */
const LONGER = 5000;

/** The message showing now, if any. */
export class Messages {
  readonly state = createStore<{ current: Message | null }>(() => ({ current: null }));
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(text: string, options: Omit<Message, 'text'> = {}) {
    clearTimeout(this.timer);
    this.state.setState({ current: { text, ...options } });
    this.timer = setTimeout(() => this.dismiss(), options.undo || options.error ? LONGER : PLAIN);
  }

  warn(text: string) {
    this.show(text, { error: true });
  }

  dismiss() {
    clearTimeout(this.timer);
    this.state.setState({ current: null });
  }
}
