import { GraphQLTaggedNode, OperationType, IEnvironment } from 'relay-runtime';
import { QueryFetcher } from './QueryFetcher';
import { RenderProps, QueryOptions, LoadQuery } from './RelayHooksTypes';
import { forceCache } from './Utils';

const emptyFunction = (): void => undefined;

export const internalLoadQuery = <TOperationType extends OperationType = OperationType>(
    promise = false,
): LoadQuery<TOperationType> => {
    let queryFetcher = new QueryFetcher<TOperationType>();

    const dispose = (): void => {
        queryFetcher.dispose();
        queryFetcher.setForceUpdate(emptyFunction);
        queryFetcher = new QueryFetcher<TOperationType>();
    };

    const next = (
        environment,
        gqlQuery: GraphQLTaggedNode,
        variables: TOperationType['variables'] = {},
        options: QueryOptions = {},
    ): Promise<void> => {
        options.networkCacheConfig = options.networkCacheConfig ?? forceCache;
        queryFetcher.resolve(environment, gqlQuery, variables, options);
        const toThrow = queryFetcher.checkAndSuspense();
        return toThrow ? (toThrow instanceof Error ? Promise.reject(toThrow) : toThrow) : Promise.resolve();
    };

    const getValue = (environment?: IEnvironment): RenderProps<TOperationType> | null | Promise<any> => {
        queryFetcher.resolveEnvironment(environment);
        queryFetcher.checkAndSuspense(promise);
        return queryFetcher.getData();
    };

    const subscribe = (callback: () => any): (() => void) => {
        queryFetcher.setForceUpdate(callback);
        return (): void => {
            if (queryFetcher.getForceUpdate() === callback) {
                queryFetcher.setForceUpdate(emptyFunction);
            }
        };
    };
    return {
        next,
        subscribe,
        getValue,
        dispose,
    };
};

export const loadLazyQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(true);
};

export const loadQuery = <TOperationType extends OperationType = OperationType>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(false);
};
