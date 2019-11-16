import { useEffect, useState, useRef } from 'react';
import { RelayFeatureFlags } from 'relay-runtime';

import { ContainerResult, FragmentResult } from './RelayHooksType';

import useRelayEnvironment from './useRelayEnvironment';
import FragmentResolver from './FragmentResolver';

const useOssFragment = function(fragmentNode, fragmentRef: any): FragmentResult {
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
        return () => {
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
};

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
