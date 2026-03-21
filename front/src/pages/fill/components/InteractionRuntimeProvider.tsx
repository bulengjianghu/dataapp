import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import type { PropsWithChildren } from "react";
import type { RootState, AppDispatch } from "../../../store";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import type { InteractionRuntimeRule } from "../services/interactionRuntime";
import { processNextRuntimeEvent } from "../services/interactionRuntime";

type InteractionRuntimeProviderProps = PropsWithChildren<{
  rules: InteractionRuntimeRule[];
}>;

export function InteractionRuntimeProvider({ rules, children }: InteractionRuntimeProviderProps) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const pendingEventCount = useAppSelector((state) => state.interactionEngine.pendingEvents.length);
  const initialized = useAppSelector((state) => state.interactionRuntime.initialized);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!initialized || pendingEventCount === 0 || processingRef.current) {
      return;
    }
    processingRef.current = true;

    const drainRuntimeEvents = async () => {
      try {
        while (store.getState().interactionEngine.pendingEvents.length > 0) {
          await processNextRuntimeEvent({
            dispatch: dispatch as AppDispatch,
            getState: store.getState,
            rules,
          });
        }
      } finally {
        processingRef.current = false;
      }
    };

    void drainRuntimeEvents();
  }, [dispatch, initialized, pendingEventCount, rules, store]);

  return children;
}
