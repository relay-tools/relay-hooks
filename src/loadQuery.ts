import * as areEqual from 'fbjs/lib/areEqual';
import { GraphQLTaggedNode, OperationType, IEnvironment, OperationDescriptor } from 'relay-runtime';
import { QueryFetcher } from './QueryFetcher';
import { RenderProps, QueryOptions, LoadQuery } from './RelayHooksType';
import { createOperation, forceCache } from './Utils';

export const internalLoadQuery = <TOperationType extends OperationType = OperationType>(
    promise = false,
    queryExecute = (
        queryFetcher: QueryFetcher<TOperationType>,
        environment: IEnvironment,
        query: OperationDescriptor,
        options: QueryOptions,
    ): RenderProps<TOperationType> => queryFetcher.execute(environment, query, options),
): LoadQuery<TOperationType> => {
    let listener = undefined;
    let queryFetcher = new QueryFetcher<TOperationType>();

    let prev = {
        environment: null,
        gqlQuery: null,
        variables: null,
        options: null,
        query: null,
    };

    const dispose = (): void => {
        queryFetcher.dispose();
        queryFetcher = new QueryFetcher<TOperationType>();
        listener = undefined;
        prev = {
            environment: null,
            gqlQuery: null,
            variables: null,
            options: null,
            query: null,
        };
    };

    const next = (
        environment,
        gqlQuery: GraphQLTaggedNode,
        variables: TOperationType['variables'] = {},
        options: QueryOptions = {},
    ): Promise<void> => {
        prev.environment = environment;
        prev.options = options;
        if (
            !areEqual(variables, prev.variables) ||
            gqlQuery != prev.gqlQuery ||
            options.networkCacheConfig != prev.options.networkCacheConfig
        ) {
            const { networkCacheConfig = forceCache } = options;
            prev.variables = variables;
            prev.gqlQuery = gqlQuery;
            prev.query = createOperation(gqlQuery, prev.variables, networkCacheConfig);
        }
        const execute = (): void => {
            queryExecute(queryFetcher, prev.environment, prev.query, prev.options);
            const data = queryFetcher.getData();
            listener && listener(data);
        };
        queryFetcher.setMounted();
        queryFetcher.setForceUpdate(execute);
        execute();
        const toThrow = queryFetcher.checkAndSuspense();
        return toThrow
            ? toThrow instanceof Error
                ? Promise.reject(toThrow)
                : toThrow.then(execute)
            : Promise.resolve();
    };

    const getValue = (
        environment?: IEnvironment,
    ): RenderProps<TOperationType> | null | Promise<any> => {
        if (environment && environment != prev.environment) {
            next(environment, prev.gqlQuery, prev.variables, prev.options);
        }

        queryFetcher.checkAndSuspense(promise);

        return queryFetcher.getData();
    };

    const subscribe = (callback: (value) => any): (() => void) => {
        listener = callback;
        return (): void => {
            listener = null;
        };
    };
    return {
        next,
        subscribe,
        getValue,
        dispose,
    };
};

export const loadLazyQuery = <
    TOperationType extends OperationType = OperationType
>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(true);
};

export const loadQuery = <
    TOperationType extends OperationType = OperationType
>(): LoadQuery<TOperationType> => {
    return internalLoadQuery(false);
};
