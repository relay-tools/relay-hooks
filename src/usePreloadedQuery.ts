import { useEffect } from 'react';
import { OperationType } from 'relay-runtime';
import { RenderProps, LoadQuery } from './RelayHooksTypes';
import { useForceUpdate } from './useForceUpdate';
import { useRelayEnvironment } from './useRelayEnvironment';

export const usePreloadedQuery = <TOperationType extends OperationType = OperationType>(
    loadQuery: LoadQuery<TOperationType>,
): RenderProps<TOperationType> => {
    const forceUpdate = useForceUpdate();
    const environment = useRelayEnvironment();

    useEffect(() => {
        return loadQuery.subscribe(forceUpdate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadQuery]);

    return loadQuery.getValue(environment) as RenderProps<TOperationType>;
};
