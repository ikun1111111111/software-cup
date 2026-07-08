import { create } from 'zustand';

export type Scene = 'welcome' | 'chat' | 'history' | 'route' | 'story';
export type TransitionState = 'idle' | 'fade-out' | 'fade-in';

interface SceneState {
  currentScene: Scene;
  transition: TransitionState;
  setScene: (scene: Scene) => void;
  setTransition: (state: TransitionState) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  currentScene: 'welcome',
  transition: 'idle',

  setScene: (scene) => set({ currentScene: scene }),
  setTransition: (state) => set({ transition: state }),
}));

export default useSceneStore;
