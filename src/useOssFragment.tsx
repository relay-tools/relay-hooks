import { useEffect, useState, useRef, useContext } from "react";
import * as mapObject from 'fbjs/lib/mapObject';
import * as areEqual from 'fbjs/lib/areEqual';
import { RelayFeatureFlags, getFragment } from 'relay-runtime';
import { ReactRelayContext } from 'react-relay';
import { RelayContext } from 'relay-runtime/lib/RelayStoreTypes';

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

export type PaginationFunction = {
  loadMore: (connectionConfig: ConnectionConfig, pageSize: number,
    observerOrCallback: any, options: RefetchOptions) => any;
  hasMore: () => boolean;
  isLoading: () => boolean;
  refetchConnection: (connectionConfig: ConnectionConfig, totalCount: number,
    callback: any, refetchVariables: any) => any;
};

export type RefetchFunction = (taggedNode: any, refetchVariables: any, renderVariables: any,
    observerOrCallback: any, options: RefetchOptions) => {
      dispose(): void;
    };

interface OssFragmentFunction extends PaginationFunction { 
  refetch: RefetchFunction
};

type FragmentResult = [
  any,
  OssFragmentFunction];
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


const useOssFragment = function (fragmentDef, fragmentRef: any, ): FragmentResult {
  const { environment }: RelayContext = useContext(ReactRelayContext);
  const prev = usePrevious({ environment, fragmentRef });
  const [fragments, setFragments] = useState<any>(() => {
    RelayFeatureFlags.PREFER_FRAGMENT_OWNER_OVER_CONTEXT = true;
    const { getFragment: getFragmentFromTag } = environment.unstable_internal;
    return getFragmentFromTag(fragmentDef);
  });


  const [result, setResult] = useState<ContainerResult>(() => {
    return newResolver();
  });

  const { resolver } = result;

  function newResolver() {
    const {
      createFragmentSpecResolver,
    } = environment.unstable_internal;
    //const resKey = fragments.name.split('_').pop();
    const res = createFragmentSpecResolver(
      { environment },
      'useFragment',
      { frag: fragments },
      { frag: fragmentRef },
    )
    res.setCallback(() => {
      const newData = resolver.resolve();
      if (result.data !== newData) {
        setResult({ resolver: resolver, data: newData })
      }
    });
    return { resolver: res, data: res.resolve() };
  }

  useEffect(() => {
    return () => {
      resolver.dispose();
      prev && prev.fragmentRefetch.dispose();
      prev && prev.fragmentPagination.dispose();
    };
  }, []);

  useEffect(() => {
    if (prev && prev.fragmentRef) {
      const { getDataIDsFromObject } = environment.unstable_internal;
      const prevIDs = getDataIDsFromObject(fragments, prev.fragmentRef);
      const nextIDs = getDataIDsFromObject(fragments, fragmentRef);
      if (prev.environment !== environment ||
        !areEqual(prevIDs, nextIDs)) {
        resolver.dispose();
        setResult(newResolver());
      } /*else {
                resolver.setProps(others);
                setResult({resolver, data: resolver.resolve()})
            }*/

    }
  }, [environment, fragmentRef]);

  function _getFragmentVariables(): Variables {
    const {
      getVariablesFromObject,
    } = environment.unstable_internal;
    return getVariablesFromObject(
      // NOTE: We pass empty operationVariables because we want to prefer
      // the variables from the fragment owner
      {},
      fragments,
      fragmentRef,
      getFragmentOwners(fragments, fragmentRef),
    );
  }

  function refetch(taggedNode: GraphQLTaggedNode,
    refetchVariables:
      | Variables
      | ((fragmentVariables: Variables) => Variables),
    renderVariables: Variables,
    observerOrCallback: ObserverOrCallback,
    options: RefetchOptions, ) {
    return (prev.fragmentRefetch as FragmentRefetch).refetch(environment,
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
    (prev.fragmentPagination as FragmentPagination).init(result, fragmentRef);
    return (prev.fragmentPagination as FragmentPagination).loadMore(environment,
      connectionConfig,
      fragmentRef,
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
    (prev.fragmentPagination as FragmentPagination).init(result, fragmentRef);
    return (prev.fragmentPagination as FragmentPagination).refetchConnection(environment,
      connectionConfig,
      fragmentRef,
      result,
      setResult,
      totalCount,
      callback,
      refetchVariables
    );
  }

  function hasMore() {
    (prev.fragmentPagination as FragmentPagination).init(result, fragmentRef);
    return (prev.fragmentPagination as FragmentPagination).hasMore(result, fragmentRef);
  }

  function isLoading() {
    (prev.fragmentPagination as FragmentPagination).init(result, fragmentRef);
    return (prev.fragmentPagination as FragmentPagination).isLoading();
  }

  return [result.data && result.data.frag ? { ...result.data.frag } : {}, { refetch, loadMore, hasMore, isLoading, refetchConnection }];
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