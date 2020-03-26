import { useEffect, useState, useRef } from 'react';
import { RelayFeatureFlags, GraphQLTaggedNode } from 'relay-runtime';
import useRelayEnvironment from './useRelayEnvironment';
import FragmentResolver from './FragmentResolver';
import {
    ContainerResult,
    KeyType,
    OssFragmentFunction,
    KeyReturnType,
    $Call,
    ArrayKeyType,
    ArrayKeyReturnType,
} from './RelayHooksType';

function useOssFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, OssFragmentFunction];
function useOssFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, OssFragmentFunction];
function useOssFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>, OssFragmentFunction];
function useOssFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null, OssFragmentFunction] {
    RelayFeatureFlags.PREFER_FRAGMENT_OWNER_OVER_CONTEXT = true;
    const environment = useRelayEnvironment();
    const [, forceUpdate] = useState<ContainerResult>(null);
    const ref = useRef<{ resolver: FragmentResolver }>(null);
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            resolver: new FragmentResolver(forceUpdate),
        };
    }

    const { resolver } = ref.current;

    useEffect(() => {
        return (): void => {
            resolver.dispose();
        };
    }, []);

    resolver.resolve(environment, fragmentNode, fragmentRef);

    const data = resolver.getData();

    return [
        data,
        {
            refetch: resolver.refetch,
            loadMore: resolver.loadMore,
            hasMore: resolver.hasMore,
            isLoading: resolver.isLoading,
            refetchConnection: resolver.refetchConnection,
        },
    ];
}

export default useOssFragment;

/**
 * use case?
      // Otherwise, for convenience short-circuit if all non-Relay props
      // are scalar and equal
      const keys = Object.keys(nextProps);
      for (let ii = 0; ii < keys.length; ii++) {
        const key = keys[ii];
        if (key === '__relayContext') {
          if (
            nextState.prevPropsContext.environment !==
              this.state.prevPropsContext.environment ||
            nextState.prevPropsContext.variables !==
              this.state.prevPropsContext.variables
          ) {
            return true;
          }
        } else {
          if (
            !fragments.hasOwnProperty(key) &&
            !isScalarAndEqual(nextProps[key], this.props[key])
          ) {
            return true;
          }
        }
      }
 */
