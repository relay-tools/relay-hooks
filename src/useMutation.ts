import * as invariant from 'fbjs/lib/invariant';
import * as React from 'react';
import { useCallback, useContext, useState } from 'react';
import { ReactRelayContext, commitMutation } from 'react-relay';
import { MutationConfig as BaseMutationConfig, Environment, OperationBase } from 'relay-runtime';
import useMounted from '@restart/hooks/useMounted';

export type MutationState<T extends OperationBase> = {
    loading: boolean;
    data: T['response'] | null;
    error?: Error | null;
};

export type MutationNode<T extends OperationBase> = BaseMutationConfig<T>['mutation'];

export type MutationConfig<T extends OperationBase> = Partial<Omit<BaseMutationConfig<T>, 'mutation' | 'onCompleted'>> & {
    onCompleted?(response: T['response']): void;
};

export type Mutate<T extends OperationBase> = (config?: Partial<MutationConfig<T>>) => Promise<T['response']>;

export function useMutation<T extends OperationBase>(
    mutation: MutationNode<T>,
    userConfig: MutationConfig<T> = {},
    /** if not provided, the context environment will be used. */
    environment?: Environment,
): [Mutate<T>, MutationState<T>] {
    const [state, setState] = useState<MutationState<T>>({
        loading: false,
        data: null,
        error: null,
    });

    const isMounted = useMounted();

    const relayContext: any = useContext(ReactRelayContext);
    const resolvedEnvironment = environment || relayContext.environment;
    const { configs, variables, uploadables, onCompleted, onError, optimisticUpdater, optimisticResponse, updater } = userConfig;

    const mutate: Mutate<T> = useCallback(
        (config) => {
            const mergedConfig = {
                configs,
                variables,
                uploadables,
                onCompleted,
                onError,
                optimisticUpdater,
                optimisticResponse,
                updater,
                ...config,
            };

            invariant(mergedConfig.variables, 'you must specify variables');

            setState({
                loading: true,
                data: null,
                error: null,
            });

            return new Promise((resolve, reject) => {
                function handleError(error: any) {
                    if (isMounted()) {
                        setState({
                            loading: false,
                            data: null,
                            error,
                        });
                    }

                    if (mergedConfig.onError) {
                        mergedConfig.onError(error);
                        resolve();
                    } else {
                        reject(error);
                    }
                }

                commitMutation(resolvedEnvironment, {
                    ...mergedConfig,
                    mutation,
                    variables: mergedConfig.variables!,
                    onCompleted: (response, errors) => {
                        if (errors) {
                            // FIXME: This isn't right. onError expects a single error.
                            handleError(errors);
                            return;
                        }

                        if (isMounted()) {
                            setState({
                                loading: false,
                                data: response,
                                error: null,
                            });
                        }

                        if (mergedConfig.onCompleted) {
                            mergedConfig.onCompleted(response);
                        }
                        resolve(response);
                    },
                    onError: handleError,
                });
            });
        },
        [
            resolvedEnvironment,
            configs,
            mutation,
            variables,
            uploadables,
            onCompleted,
            onError,
            optimisticUpdater,
            optimisticResponse,
            updater,
            isMounted,
        ],
    );

    return [mutate, state];
}

export type MutationProps<T extends OperationBase> = MutationConfig<T> & {
    children: (mutate: Mutate<T>, state: MutationState<T>) => React.ReactNode;
    mutation: MutationNode<T>;
    /** if not provided, the context environment will be used. */
    environment?: Environment;
};

export function Mutation<T extends OperationBase>({ children, mutation, environment, ...config }: MutationProps<T>) {
    const [mutate, state] = useMutation(mutation, config, environment);
    return children(mutate, state) as React.ReactElement;
}
