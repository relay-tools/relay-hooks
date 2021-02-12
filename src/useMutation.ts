import useMounted from '@restart/hooks/useMounted';
import * as invariant from 'fbjs/lib/invariant';
import * as React from 'react';
import { Environment, MutationParameters, commitMutation } from 'relay-runtime';
import {
    MutationNode,
    MutationConfig,
    MutationConfigWithoutVariables,
    MutationState,
    Mutate,
    MutateWithVariables,
} from './RelayHooksTypes';
import { useRelayEnvironment } from './useRelayEnvironment';

const { useCallback, useState } = React;

export function useMutation<T extends MutationParameters>(
    mutation: MutationNode<T>,
    userConfig?: MutationConfigWithoutVariables<T>,
    /** if not provided, the context environment will be used. */
    environment?: Environment,
): [MutateWithVariables<T>, MutationState<T>];
export function useMutation<T extends MutationParameters>(
    mutation: MutationNode<T>,
    userConfig?: MutationConfig<T>,
    /** if not provided, the context environment will be used. */
    environment?: Environment,
): [Mutate<T>, MutationState<T>];
export function useMutation<T extends MutationParameters>(
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

    const relayEnvironment = useRelayEnvironment();
    const resolvedEnvironment = environment || relayEnvironment;
    const {
        configs,
        variables,
        uploadables,
        onCompleted,
        onError,
        optimisticUpdater,
        optimisticResponse,
        updater,
    } = userConfig;

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

            if (isMounted()) {
                setState({
                    loading: true,
                    data: mergedConfig.optimisticResponse,
                    error: null,
                });
            }

            return new Promise((resolve, reject) => {
                function handleError(error: any): void {
                    if (isMounted()) {
                        setState({
                            loading: false,
                            data: null,
                            error,
                        });
                    }

                    if (mergedConfig.onError) {
                        mergedConfig.onError(error);
                        resolve(null);
                    } else {
                        reject(error);
                    }
                }

                commitMutation(resolvedEnvironment, {
                    ...mergedConfig,
                    mutation,
                    variables: mergedConfig.variables,
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
