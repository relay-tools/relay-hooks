import { useEffect, useRef } from 'react';

const usePrevious = function usePrevious(value): any {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};

export default usePrevious;
