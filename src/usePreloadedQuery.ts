import { useState, useEffect } from 'react';
import { OperationType } from 'relay-runtime';
import { RenderProps, LoadQuery } from './RelayHooksType';
import { useRelayEnvironment } from './useRelayEnvironment';

export const usePreloadedQuery = <TOperationType extends OperationType = OperationType>(
    loadQuery: LoadQuery,
): RenderProps<TOperationType> => {
    const [, forceUpdate] = useState();
    const environment = useRelayEnvironment();

    useEffect(() => {
        const dispose = loadQuery.subscribe(forceUpdate);
        return (): void => dispose();
    }, [loadQuery]);

    return loadQuery.getValue(environment) as RenderProps<TOperationType>;
};
