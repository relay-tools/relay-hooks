import { useState, useEffect, useContext, useRef } from "react";
import usePrevious from "./usePrevious";
import { ReactRelayContext } from 'react-relay';
import { OperationType, GraphQLTaggedNode } from 'relay-runtime';
import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryProps, DataFrom, FetchPolicy } from './RelayHooksType';
import { CacheConfig } from 'relay-runtime';


import UseQueryFetcher from './UseQueryFetcher';
import { convertDataFrom } from "./Utils";



type Reference<T extends OperationType> = {
    queryFetcher: UseQueryFetcher<T>,
}

function useDeepCompare<T>(value: T): T {
    const latestValue = useRef(value);
    if (!areEqual(latestValue.current, value)) {
      latestValue.current = value;
    }
    return latestValue.current;
  }

const defaultPolicy = 'store-or-network';

export const useQueryModern = function<TOperationType extends OperationType>(props: UseQueryProps<TOperationType>) {
        
    const { query, variables, dataFrom, cacheConfig } = props;
        return useQueryExp(
            query, 
            variables, 
            { 
                fetchPolicy: convertDataFrom(dataFrom),
                networkCacheConfig: cacheConfig
            }
        )
    }

export const useQueryExp = function<TOperationType extends OperationType>(query: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options : {
        fetchPolicy?: FetchPolicy,
        networkCacheConfig?: CacheConfig,
    } = {}
    ) {
    const { environment } = useContext(ReactRelayContext);
    const [, forceUpdate] = useState(null);
    const { fetchPolicy = defaultPolicy, networkCacheConfig } = options;
    const latestVariables = useDeepCompare(variables);
    const prev = usePrevious({ environment, query, latestVariables});
    
    const ref = useRef<Reference<TOperationType>>();
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            queryFetcher: new UseQueryFetcher<TOperationType>(forceUpdate),
        };
    }
    const { queryFetcher } = ref.current;
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    

    if (!prev || prev.query !== query ||
        prev.environment !== environment ||
            prev.latestVariables!== latestVariables) {
                queryFetcher.execute(environment, query, variables, fetchPolicy, networkCacheConfig);
    }

    return queryFetcher.getLastResult();
}

export default useQueryModern;
