import * as invariant from 'fbjs/lib/invariant';
import { useCallback, useMemo } from 'react';
import { GraphQLTaggedNode, getFragment, OperationType, ConcreteRequest } from 'relay-runtime';
import {
    RefetchableFunction,
    RefetchOptions,
    KeyType,
    KeyReturnType,
    $Call,
    ArrayKeyType,
    ArrayKeyReturnType,
    ObserverOrCallback,
} from './RelayHooksType';
import { useRefetch } from './useRefetch';

export function useRefetchable<
    TKey extends KeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, RefetchableFunction<TOperationType['variables']>];
export function useRefetchable<
    TKey extends KeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, RefetchableFunction<TOperationType['variables']>];
export function useRefetchable<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): [
    ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>,
    RefetchableFunction<TOperationType['variables']>,
];
export function useRefetchable<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [
    ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null,
    RefetchableFunction<TOperationType['variables']>,
] {
    const [data, refetch] = useRefetch(fragmentInput, fragmentRef);

    const refetchNode = useMemo(() => {
        const fragmentNode = getFragment(fragmentInput);
        const metadata = fragmentNode.metadata;
        invariant(
            metadata != null,
            'useRefetchable: Expected fragment `%s` to be refetchable when using `%s`. ' +
                'Did you forget to add a @refetchable directive to the fragment?',
            'useRefetchable',
            fragmentNode.name,
        );
        const isPlural = metadata.plural;
        invariant(
            isPlural !== true,
            'useRefetchable: Expected fragment `%s` not to be plural when using ' +
                '`%s`. Remove `@relay(plural: true)` from fragment `%s` ' +
                'in order to use it with `%s`.',
            fragmentNode.name,
            'useRefetchable',
            fragmentNode.name,
            'useRefetchable',
        );

        const refetchMetadata = metadata.refetch;
        invariant(
            refetchMetadata != null,
            'useRefetchable: Expected fragment `%s` to be refetchable when using `%s`. ' +
                'Did you forget to add a @refetchable directive to the fragment?',
            'useRefetchable',
            fragmentNode.name,
        );

        // handle both commonjs and es modules
        const refetchableRequest: ConcreteRequest = (refetchMetadata as any).operation.default
            ? (refetchMetadata as any).operation.default
            : refetchMetadata.operation;

        return refetchableRequest;
    }, [fragmentInput]);

    const refetchable = useCallback(
        (
            refetchVariables:
                | TOperationType['variables']
                | ((fragmentVariables: TOperationType['variables']) => TOperationType['variables']),
            options: {
                renderVariables?: TOperationType['variables'];
                observerOrCallback?: ObserverOrCallback;
                refetchOptions?: RefetchOptions;
            } = {},
        ) => {
            return refetch(
                refetchNode,
                refetchVariables,
                options.renderVariables,
                options.observerOrCallback,
                options.refetchOptions,
            );
        },
        [refetch, refetchNode],
    );

    return [data, refetchable];
}
