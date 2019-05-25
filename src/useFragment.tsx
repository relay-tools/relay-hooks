import { useEffect, useState, useRef } from "react";
import * as mapObject from 'fbjs/lib/mapObject';
import * as areEqual from 'fbjs/lib/areEqual';
import { RelayFeatureFlags, getFragment } from 'relay-runtime';

import { ContainerResult } from './RelayHooksType';
import {
  Disposable,
  IEnvironment,
  GraphQLTaggedNode,
  Observable,
  Observer,
  Variables,
  getFragmentOwners
} from 'relay-runtime';
import FragmentRefetch from "./FragmentRefetch";
import FragmentPagination, { ConnectionConfig } from "./FragmentPagination";

export type RefetchOptions = {
  force?: boolean,
  fetchPolicy?: 'store-or-network' | 'network-only',
};

interface FragmentResult {
  [key: string]: any,
  relay: any;
  refetch: (taggedNode: any, refetchVariables: any, renderVariables: any, observerOrCallback: any, options: RefetchOptions) => {
      dispose(): void;
  };
  loadMore: (connectionConfig: ConnectionConfig, pageSize: number, observerOrCallback: any, options: RefetchOptions) => any;
  hasMore: () => boolean;
  isLoading: () => boolean;
  refetchConnection: (connectionConfig: ConnectionConfig, totalCount: number, callback: any, refetchVariables: any) => any;
}
export type ObserverOrCallback = Observer<void> | ((error: Error) => any);

const usePrevious = function usePrevious(value): any {
  const ref = useRef();
  if (ref.current === null || ref.current === undefined) {
    const c: any = {
      fragmentRefetch: new FragmentRefetch(),
      fragmentPagination: new FragmentPagination()
    };
    ref.current = c;
  }
  useEffect(() => {
    value.fragmentRefetch = (ref.current as any).fragmentRefetch;
    value.fragmentPagination = (ref.current as any).fragmentPagination;
    ref.current = value;
  });
  return ref.current;
}


const useFragment = function (hooksProps: any, fragmentSpec):FragmentResult {
  const { relay: relayHooks, ...others } = hooksProps;
  const { environment, variables } = relayHooks;
  const prev = usePrevious({ environment, variables, others });
  const [fragments, setFragments] = useState<any>(() => {
    RelayFeatureFlags.PREFER_FRAGMENT_OWNER_OVER_CONTEXT = true;
    const { getFragment: getFragmentFromTag } = environment.unstable_internal;
    return mapObject(fragmentSpec, getFragmentFromTag)
  });


  const [result, setResult] = useState<ContainerResult>(() => {
    return newResolver(relayHooks);
  });

  const { resolver, relay } = result;

  function newResolver(relay) {
    const {
      createFragmentSpecResolver,
    } = environment.unstable_internal;
    const res = createFragmentSpecResolver(
      relay,
      'useFragment',
      fragments,
      { ...others, ...others.props },
    )
    res.setCallback(() => {
      const newData = resolver.resolve();
      if (result.data !== newData) {
        setResult({ resolver: resolver, data: newData, relay: relay })
      }
    });
    return { resolver: res, data: res.resolve(), relay: relay };
  }

  useEffect(() => {
    return () => {
      resolver.dispose();
      prev && prev.fragmentRefetch.dispose();
      prev && prev.fragmentPagination.dispose();
    };
  }, []);

  useEffect(() => {
    if (prev && prev.others) {
      const { getDataIDsFromObject } = environment.unstable_internal;
      const prevIDs = getDataIDsFromObject(fragments, prev.others);
      const nextIDs = getDataIDsFromObject(fragments, others);
      if (prev.environment !== environment ||
        !areEqual(prev.variables, variables) ||
        !areEqual(prevIDs, nextIDs)) {
        resolver.dispose();
        setResult(newResolver(relay));
      } /*else {
                resolver.setProps(others);
                setResult({resolver, data: resolver.resolve()})
            }*/

    }
  }, [environment, variables, others]);

  function _getFragmentVariables(): Variables {
    const {
      getVariablesFromObject,
    } = environment.unstable_internal;
    return getVariablesFromObject(
      // NOTE: We pass empty operationVariables because we want to prefer
      // the variables from the fragment owner
      {},
      fragments,
      { ...others, ...others.props },
      getFragmentOwners(fragments, { ...others, ...others.props }),
    );
  }

  function refetch(taggedNode: GraphQLTaggedNode,
    refetchVariables:
      | Variables
      | ((fragmentVariables: Variables) => Variables),
    renderVariables: Variables,
    observerOrCallback: ObserverOrCallback,
    options: RefetchOptions, ) {
    return (prev.fragmentRefetch as FragmentRefetch).refetch(variables,
      environment,
      _getFragmentVariables(),
      taggedNode,
      refetchVariables,
      renderVariables,
      observerOrCallback,
      options,
      result,
      setResult
    );
  }

  function loadMore(connectionConfig: ConnectionConfig,
    pageSize: number,
    observerOrCallback: ObserverOrCallback,
    options: RefetchOptions, ) {
    const props = { ...others, ...others.props };
    (prev.fragmentPagination as FragmentPagination).init(result, props);
    return (prev.fragmentPagination as FragmentPagination).loadMore(variables,
      environment,
      connectionConfig,
      props,
      pageSize,
      observerOrCallback,
      options,
      result,
      setResult
    );
  }

  function refetchConnection(connectionConfig: ConnectionConfig,
    totalCount: number,
    callback: ObserverOrCallback,
    refetchVariables: Variables, ) {
    const props = { ...others, ...others.props };
    (prev.fragmentPagination as FragmentPagination).init(result, props);
    return (prev.fragmentPagination as FragmentPagination).refetchConnection(variables,
      environment,
      connectionConfig,
      props,
      result,
      setResult,
      totalCount,
      callback,
      refetchVariables
    );
  }

  function hasMore() {
    const props = { ...others, ...others.props };
    (prev.fragmentPagination as FragmentPagination).init(result, props);
    return (prev.fragmentPagination as FragmentPagination).hasMore(result, props);
  }

  function isLoading() {
    const props = { ...others, ...others.props };
    (prev.fragmentPagination as FragmentPagination).init(result, props);
    return (prev.fragmentPagination as FragmentPagination).isLoading();
  }

  return { ...result.data, relay: result.relay, refetch, loadMore, hasMore, isLoading, refetchConnection };
}

export default useFragment;

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