import { Reducer, useCallback, useEffect, useReducer, useRef } from 'react';

export function useForceUpdate(): () => void {
    const [, forceUpdate] = useReducer<Reducer<number, void>>((x) => x + 1, 0);
    const isMounted = useRef(false);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);
    const update = useCallback(() => {
        if (isMounted.current) {
            forceUpdate();
        }
    }, [isMounted, forceUpdate]);
    return update;
}
