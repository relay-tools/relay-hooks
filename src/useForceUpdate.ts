import { useCallback, useEffect, useRef, useState } from 'react';

export function useForceUpdate(): () => void {
    const [, forceUpdate] = useState([]);
    const mountState = useRef({ mounted: false, pending: false });
    useEffect(() => {
        mountState.current.mounted = true;
        if (mountState.current.pending) {
            mountState.current.pending = false;
            forceUpdate([]);
        }
        return () => {
            mountState.current = { mounted: false, pending: false };
        };
    }, []);
    const update = useCallback(() => {
        if (mountState.current.mounted) {
            forceUpdate([]);
        } else {
            mountState.current.pending = true;
        }
    }, [forceUpdate]);
    return update;
}
