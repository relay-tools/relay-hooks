import { Reducer, useReducer } from 'react';

export function useForceUpdate(): () => void {
    const [, forceUpdate] = useReducer<Reducer<number, void>>((x) => x + 1, 0);
    return forceUpdate as () => void;
}
