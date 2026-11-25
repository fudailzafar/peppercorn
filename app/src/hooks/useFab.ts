import { create } from 'zustand';

/** Whether the add button is tucked away. */
export const useFab = create<{ tucked: boolean }>(() => ({ tucked: false }));
