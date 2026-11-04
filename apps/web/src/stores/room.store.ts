import { create } from 'zustand';
import type { RoomView } from '@duoquest/shared-types';

interface RoomStore {
  room: RoomView | null;
  connected: boolean;
  setRoom: (room: RoomView | null) => void;
  setConnected: (connected: boolean) => void;
}
export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  connected: false,
  setRoom: (room) =>
    set((state) => {
      if (
        room?.game &&
        state.room?.game?.sessionId === room.game.sessionId &&
        state.room.game.version > room.game.version
      )
        return state;
      return { room };
    }),
  setConnected: (connected) => set({ connected }),
}));
