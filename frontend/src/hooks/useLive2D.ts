import { useCallback, useRef, useState } from 'react';

export interface Live2DModelActions {
  setExpression: (name: string) => void;
  motion: (group: string, index?: number) => void;
  setParameter: (id: string, value: number) => void;
  getModel: () => any;
}

export interface Live2DState {
  isModelReady: boolean;
  currentExpression: string;
  isSpeaking: boolean;
}

export const useLive2D = () => {
  const [state, setState] = useState<Live2DState>({
    isModelReady: false,
    currentExpression: 'default',
    isSpeaking: false,
  });

  const actionsRef = useRef<Live2DModelActions | null>(null);

  const setModelActions = useCallback((actions: Live2DModelActions) => {
    actionsRef.current = actions;
    setState(prev => ({ ...prev, isModelReady: true }));
  }, []);

  const setExpression = useCallback((name: string) => {
    actionsRef.current?.setExpression(name);
    setState(prev => ({ ...prev, currentExpression: name }));
  }, []);

  const triggerMotion = useCallback((group: string, index?: number) => {
    actionsRef.current?.motion(group, index);
  }, []);

  const setParameter = useCallback((id: string, value: number) => {
    actionsRef.current?.setParameter(id, value);
  }, []);

  const setSpeaking = useCallback((speaking: boolean) => {
    setState(prev => ({ ...prev, isSpeaking: speaking }));
  }, []);

  return {
    state,
    setModelActions,
    setExpression,
    triggerMotion,
    setParameter,
    setSpeaking,
  };
};

export default useLive2D;
