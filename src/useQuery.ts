import * as ReactRelayQueryFetcher from 'react-relay/lib/ReactRelayQueryFetcher';
import { useState, useEffect, useRef } from "react";

import {
    IEnvironment,
    RelayContext,
    Snapshot,
} from 'relay-runtime/lib/RelayStoreTypes';

import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryProps, HooksProps, OperationContextProps, STORE_THEN_NETWORK } from './RelayHooksType';



function usePrevious(value): any {
    const ref = useRef();
    if (ref.current === null || ref.current === undefined) {
        const c:any = {queryFetcher: new ReactRelayQueryFetcher()};
        ref.current = c;
    }
    useEffect(() => {
      value.queryFetcher = (ref.current as any).queryFetcher;
      ref.current = value;
    });
    return ref.current;
  }


const useQuery = function (props: UseQueryProps)  {
    const {environment, query, variables } = props
    const prev = usePrevious({environment, query, variables});
    const queryFetcher = prev.queryFetcher;
    const [hooksProps, setHooksProps] = useState<HooksProps>( { relay: {environment: props.environment, variables: props.variables} , 
        error: null,
        props: null, 
        retry: null,
        cached: false
    });
    
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    useEffect(() => {
        if (prev.query !== query ||
            prev.environment !== environment ||
      !areEqual(prev.variables, variables) ) {
          execute(environment, query, variables)
      }
    }, [environment, query, variables]);

    function execute(environment, query, variables) {
        const genericEnvironment: IEnvironment = (environment);
        if (!query) {
            queryFetcher.dispose();
            setOperationContext({ operation: null, relay: {environment, variables} });
        } else {
            queryFetcher.disposeRequest();
            const { createOperationDescriptor, getRequest, } = genericEnvironment.unstable_internal;
            const request = getRequest(query);
            const operation = createOperationDescriptor(request, variables);
            setOperationContext({ operation: operation, relay: {environment, variables: operation.variables} });
        }
    }

    function setOperationContext(operationContext: OperationContextProps) {
        const { environment } = props;
        const genericEnvironment: IEnvironment = (environment);
        const operation = operationContext.operation;
        if (!operation) {
            setResult({empty: true, relay: operationContext.relay});
            return;
        }
        try {
            //const storeSnapshot = queryFetcher.lookupInStore(genericEnvironment, operation, props.dataFrom); //i need this
            const storeSnapshot =
            props.dataFrom === STORE_THEN_NETWORK
              ? queryFetcher.lookupInStore(genericEnvironment, operation)
            : null;
            queryFetcher.lookupInStore(genericEnvironment, operation);
            const querySnapshot = queryFetcher.fetch({
                    cacheConfig: props.cacheConfig,
                    dataFrom: props.dataFrom,
                    environment: genericEnvironment,
                    onDataChange: !prev.environment || prev.environment === undefined ? (params: {
                        error?: Error,
                        snapshot?: Snapshot,
                    }): void => {
                        const error = params.error == null ? null : params.error;
                        const snapshot = params.snapshot == null ? null : params.snapshot;
            
                        setResult({ error, snapshot, cached: false, relay: operationContext.relay });
                    } : undefined,
                    operation,
                });

            // Use network data first, since it may be fresher
            const snapshot = querySnapshot || storeSnapshot;
            setResult({ error: null, snapshot, cached: !querySnapshot, relay: operationContext.relay }); //relay
        } catch (error) {
            setResult({ error: error, snapshot: null, cached: false, relay: operationContext.relay }); //relay
        }
    }

    function setResult(result: {relay: RelayContext, empty?: boolean, error?: Error, snapshot?: Snapshot, cached?: boolean}) {
        if(!result) {
            return;
        }
        const renderProps = {
            error: null,
            props: result.empty ? {} : null, 
            retry: null,
            cached: false
        }
        if (result.snapshot || result.error || result.cached) {
            renderProps.props = result.snapshot ? result.snapshot.data : null,
            renderProps.error = result.error ? result.error : null,
            renderProps.cached = result.cached || false,
            renderProps.retry = () => {
                execute(props.environment, props.query, props.variables);
            }
        } 
        const {relay, ...hooksRender} = hooksProps;
        if(hooksRender!==renderProps)
            setHooksProps({...renderProps, relay: result.relay});    
    }

   /*useMemo(() => {
          render?
    }, [hooksProps]);*/

    return hooksProps;

}

export default useQuery;