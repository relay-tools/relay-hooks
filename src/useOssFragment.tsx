import { useEffect, useState, useRef, useCallback } from "react";
import * as areEqual from "fbjs/lib/areEqual";
import {
  RelayFeatureFlags,
  getFragment,
  getDataIDsFromFragment,
  getVariablesFromFragment,
  createFragmentSpecResolver
} from "relay-runtime";

import { ContainerResult } from "./RelayHooksType";
import {
  IEnvironment,
  GraphQLTaggedNode,
  Observer,
  Variables,
  getFragmentOwner
} from "relay-runtime";
import FragmentRefetch from "./FragmentRefetch";
import FragmentPagination, { ConnectionConfig } from "./FragmentPagination";
import useRelayEnvironment from "./useRelayEnvironment";

export type RefetchOptions = {
  force?: boolean;
  fetchPolicy?: "store-or-network" | "network-only";
};

export type PaginationFunction = {
  loadMore: (
    connectionConfig: ConnectionConfig,
    pageSize: number,
    observerOrCallback: any,
    options: RefetchOptions
  ) => any;
  hasMore: () => boolean;
  isLoading: () => boolean;
  refetchConnection: (
    connectionConfig: ConnectionConfig,
    totalCount: number,
    callback: any,
    refetchVariables: any
  ) => any;
};

export type RefetchFunction = (
  taggedNode: any,
  refetchVariables: any,
  renderVariables: any,
  observerOrCallback: any,
  options: RefetchOptions
) => {
  dispose(): void;
};

interface OssFragmentFunction extends PaginationFunction {
  refetch: RefetchFunction;
}

type FragmentResult = [any, OssFragmentFunction];
export type ObserverOrCallback = Observer<void> | ((error: Error) => any);

interface PrevState {
  fragmentRef: any;
  environment: IEnvironment;
}

const usePrevious = function usePrevious(value): PrevState {
  const ref = useRef<PrevState>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const useOssFragment = function(fragmentDef, fragmentRef: any): FragmentResult {
  const environment = useRelayEnvironment();
  const prev: PrevState = usePrevious({ environment, fragmentRef });
  const propsFragments = { frag: fragmentRef };
  const [fragments, setFragments] = useState<any>(() => {
    RelayFeatureFlags.PREFER_FRAGMENT_OWNER_OVER_CONTEXT = true;
    return getFragment(fragmentDef);
  });

  const [, forceUpdate] = useState<ContainerResult>(null);
  const ref = useRef<any>(null);
  if (ref.current === null || ref.current === undefined) {
    ref.current = {
      result: newResolver(),
      fragmentRefetch: new FragmentRefetch(),
      fragmentPagination: new FragmentPagination()
    };
  }

  const { fragmentRefetch, fragmentPagination } = ref.current;

  function newResolver() {
    const res = createFragmentSpecResolver(
      { environment },
      "useFragment",
      { frag: fragments },
      propsFragments
    );
    res.setCallback(() => {
      const newData = res.resolve();
      if (ref.current.result.data !== newData) {
        const result = { resolver: res, data: newData };
        ref.current.result = result;
        forceUpdate(result);
      }
    });
    return { resolver: res, data: res.resolve() };
  }

  useEffect(() => {
    return () => {
      ref.current.result.resolver.dispose();
      fragmentRefetch.dispose();
      fragmentPagination.dispose();
    };
  }, []);

  if (prev && prev.fragmentRef !== fragmentRef) {
    const prevIDs = getDataIDsFromFragment(fragments, prev.fragmentRef);
    const nextIDs = getDataIDsFromFragment(fragments, fragmentRef);
    if (
      _getFragmentVariables() !== _getFragmentVariables(prev.fragmentRef) ||
      !areEqual(prevIDs, nextIDs)
    ) {
      ref.current.result.resolver.dispose();
      ref.current.result = newResolver();
    }
  } else if (prev && prev.environment !== environment) {
    ref.current.result.resolver.dispose();
    ref.current.result = newResolver();
  }

  function _getFragmentVariables(fRef = fragmentRef): Variables {
    // hack v6.0.0
    if (getVariablesFromFragment.length === 2) {
      return getVariablesFromFragment(fragments, fRef);
    }
    return getVariablesFromFragment(
      // NOTE: We pass empty operationVariables because we want to prefer
      // the variables from the fragment owner
      {},
      fragments,
      fRef,
      getFragmentOwner(fragments, fRef)
    );
  }

  const refetch = useCallback(
    (
      taggedNode: GraphQLTaggedNode,
      refetchVariables:
        | Variables
        | ((fragmentVariables: Variables) => Variables),
      renderVariables: Variables,
      observerOrCallback: ObserverOrCallback,
      options: RefetchOptions
    ) =>
      fragmentRefetch.refetch(
        environment,
        _getFragmentVariables(),
        taggedNode,
        refetchVariables,
        renderVariables,
        observerOrCallback,
        options,
        ref.current.result,
        result => {
          ref.current.result = result;
          forceUpdate(result);
        }
      ),
    [environment, ref.current.result]
  );

  const loadMore = useCallback(
    (
      connectionConfig: ConnectionConfig,
      pageSize: number,
      observerOrCallback: ObserverOrCallback,
      options: RefetchOptions
    ) =>
      fragmentPagination.loadMore(
        environment,
        connectionConfig,
        propsFragments,
        pageSize,
        observerOrCallback,
        options,
        ref.current.result,
        result => {
          ref.current.result = result;
          forceUpdate(result);
        }
      ),
    [environment, propsFragments, ref.current.result]
  );

  const refetchConnection = useCallback(
    (
      connectionConfig: ConnectionConfig,
      totalCount: number,
      callback: ObserverOrCallback,
      refetchVariables: Variables
    ) =>
      fragmentPagination.refetchConnection(
        environment,
        connectionConfig,
        propsFragments,
        ref.current.result,
        result => {
          ref.current.result = result;
          forceUpdate(result);
        },
        totalCount,
        callback,
        refetchVariables
      ),
    [environment, propsFragments, ref.current.result]
  );

  const hasMore = useCallback(
    () => fragmentPagination.hasMore(ref.current.result),
    [ref.current.result]
  );

  const {
    result: { data }
  } = ref.current;

  return [
    data && data.frag
      ? Array.isArray(data.frag)
        ? data.frag
        : { ...data.frag }
      : {},
    {
      refetch,
      loadMore,
      hasMore,
      isLoading: fragmentPagination.isLoading,
      refetchConnection
    }
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
