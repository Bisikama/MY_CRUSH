import { create } from 'zustand';
import type { CurrentRoomSummary, RoomView } from '@duoquest/shared-types';

interface RoomStore {
  room: RoomView | null;
  currentRoom: CurrentRoomSummary | null;
  connected: boolean;
  dismissedBannerKey: string | null;
  setRoom: (room: RoomView | null) => boolean;
  setConnected: (connected: boolean) => void;
  dismissBanner: (key: string) => void;
  resetRoomState: () => void;
}

export function deriveCurrentRoomFromView(
  view: RoomView | null,
  previous: CurrentRoomSummary | null = null,
): CurrentRoomSummary | null {
  if (!view) return previous;
  if (view.status === 'CANCELLED') {
    return previous && previous.code !== view.code ? previous : null;
  }
  return {
    code: view.code,
    gameId: 'quiz',
    status: view.status,
  };
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  currentRoom: null,
  connected: false,
  dismissedBannerKey: null,
  setRoom: (room) => {
    let accepted = true;
    set((state) => {
      if (
        room?.game &&
        state.room?.game?.sessionId === room.game.sessionId &&
        state.room.game.version > room.game.version
      ) {
        accepted = false;
        return state;
      }
      const nextCurrentRoom =
        room === null ? null : deriveCurrentRoomFromView(room, state.currentRoom);
      return {
        room,
        currentRoom: nextCurrentRoom,
      };
    });
    return accepted;
  },
  setConnected: (connected) => set({ connected }),
  dismissBanner: (key) => set({ dismissedBannerKey: key }),
  resetRoomState: () =>
    set({
      room: null,
      currentRoom: null,
      connected: false,
      dismissedBannerKey: null,
    }),
}));
