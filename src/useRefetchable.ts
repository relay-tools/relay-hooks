import { useCallback, useMemo } from 'react';
import useOssFragment from './useOssFragment';
import { RefetchableFunction, RefetchOptions } from './RelayHooksType';
import {
    GraphQLTaggedNode,
    getFragment,
    Variables,
    ObserverOrCallback,
    createOperationDescriptor,
} from 'relay-runtime';

import * as invariant from 'fbjs/lib/invariant';

import { KeyType, KeyReturnType, $Call, ArrayKeyType, ArrayKeyReturnType } from './RelayHooksType';

function useRefetchable<TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, RefetchableFunction];
function useRefetchable<TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, RefetchableFunction];
function useRefetchable<TKey extends ArrayKeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>, RefetchableFunction];
function useRefetchable<TKey extends ArrayKeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null, RefetchableFunction] {
    const fragmentNode = getFragment(fragmentInput);

    const [data, { refetch }] = useOssFragment(fragmentInput, fragmentRef);

    const refetchNode = useMemo(() => {
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
        return refetchMetadata.operation;
    }, [fragmentNode]);

    const refetchable = useCallback(
        (
            refetchVariables: Variables | ((fragmentVariables: Variables) => Variables),
            options: {
                renderVariables?: Variables;
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
        [refetchNode],
    );

    return [data, refetchable];
}

export default useRefetchable;
