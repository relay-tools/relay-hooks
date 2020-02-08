import { useState, useEffect, useRef } from 'react';
import QueryFetcher, { getOrCreateQueryFetcher } from './QueryFetcher';
import { OperationType, OperationDescriptor } from 'relay-runtime';

export type Reference<TOperationType extends OperationType> = {
    queryFetcher: QueryFetcher<TOperationType>;
};

// set query when you want suspends
export const useQueryFetcher = <TOperationType extends OperationType>(
    query?: OperationDescriptor,
): QueryFetcher<TOperationType> => {
    const [, forceUpdate] = useState(null);
    const ref = useRef<Reference<TOperationType>>();
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            queryFetcher: getOrCreateQueryFetcher(query, forceUpdate),
        };
    }
    //const { queryFetcher } = ref.current;

    useEffect(() => {
        return (): void => ref.current.queryFetcher.dispose();
    }, []);
    return ref.current.queryFetcher;
};

export default useQueryFetcher;
