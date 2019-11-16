import { useState, useEffect, useRef } from 'react';
import QueryFetcher from './QueryFetcher';
export type Reference = {
    queryFetcher: QueryFetcher;
};

export const useQueryFetcher = () => {
    const [, forceUpdate] = useState(null);
    const ref = useRef<Reference>();
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            queryFetcher: new QueryFetcher(forceUpdate),
        };
    }
    const { queryFetcher } = ref.current;

    useEffect(() => {
        return () => queryFetcher.dispose();
    }, []);
    return queryFetcher;
};

export default useQueryFetcher;
