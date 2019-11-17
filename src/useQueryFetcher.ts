import { useState, useEffect, useRef } from 'react';
import QueryFetcher from './QueryFetcher';
import { OperationType } from 'relay-runtime';

export type Reference<TOperationType extends OperationType> = {
    queryFetcher: QueryFetcher<TOperationType>;
};

export const useQueryFetcher = <
    TOperationType extends OperationType
>(): QueryFetcher<TOperationType> => {
    const [, forceUpdate] = useState(null);
    const ref = useRef<Reference<TOperationType>>();
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            queryFetcher: new QueryFetcher(forceUpdate),
        };
    }
    const { queryFetcher } = ref.current;

    useEffect(() => {
        return (): void => queryFetcher.dispose();
    }, []);
    return queryFetcher;
};

export default useQueryFetcher;
