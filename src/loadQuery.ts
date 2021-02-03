import * as areEqual from 'fbjs/lib/areEqual';
import {
    GraphQLTaggedNode,
    OperationType,
    IEnvironment,
    isPromise,
    OperationDescriptor,
    Disposable,
} from 'relay-runtime';
import { QueryFetcher } from './QueryFetcher';
import { RenderProps, QueryOptions, LoadQuery } from './RelayHooksType';
import { createOperation } from './Utils';

export const internalLoadQuery = <TOperationType extends OperationType = OperationType>(
    promise = false,
    queryExecute = (
        queryFetcher: QueryFetcher<TOperationType>,
        environment: IEnvironment,
        query: OperationDescriptor,
        options: QueryOptions,
        retain?: (environment, query) => Disposable,
    ): RenderProps<TOperationType> => queryFetcher.execute(environment, query, options, retain),
): LoadQuery<TOperationType> => {
    let data: RenderProps<TOperationType> | null | Promise<any> = null;
    let listener = undefined;
    let queryFetcher = new QueryFetcher<TOperationType>(true);

    let prev = {
        environment: null,
        gqlQuery: null,
        variables: null,
        options: null,
        query: null,
    };

    const dispose = (): void => {
        queryFetcher.dispose();
        queryFetcher = new QueryFetcher<TOperationType>(true);
        listener = undefined;
        data = null;
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
        if (!areEqual(variables, prev.variables) || gqlQuery != prev.gqlQuery) {
            prev.variables = variables;
            prev.gqlQuery = gqlQuery;
            prev.query = createOperation(gqlQuery, prev.variables);
        }
        const execute = (): void => {
            data = queryExecute(queryFetcher, prev.environment, prev.query, prev.options);
            listener && listener(data);
        };

        queryFetcher.setForceUpdate(execute);
        let result;
        try {
            execute();
        } catch (e) {
            result = e.then(execute);
            if (promise) {
                data = result;
            } else {
                execute();
            }
        }
        return result ?? Promise.resolve();
    };

    const getValue = (
        environment?: IEnvironment,
    ): RenderProps<TOperationType> | null | Promise<any> => {
        if (environment && environment != prev.environment) {
            next(environment, prev.gqlQuery, prev.variables, prev.options);
        }
        if (isPromise(data)) {
            throw data;
        }

        return data;
    };

    const subscribe = (callback: (value) => any): (() => void) => {
        listener = callback;
        return (): void => {
            if (listener === callback) {
                listener = null;
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
