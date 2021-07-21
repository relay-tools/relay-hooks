import * as React from 'react';
const { useEffect, useRef } = React;

export function useMounted(): () => boolean {
    const mounted = useRef(true);
    const isMounted = useRef(() => mounted.current);
    useEffect(
        () => (): void => {
            mounted.current = false;
        },
        [],
    );

    return isMounted.current;
}
