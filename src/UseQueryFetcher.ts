import * as ReactRelayQueryFetcher from 'react-relay/lib/ReactRelayQueryFetcher';
import { Snapshot } from 'relay-runtime/lib/RelayStoreTypes';
import {
    RenderProps,
    STORE_THEN_NETWORK,
    NETWORK_ONLY,
    STORE_OR_NETWORK,
    FetchPolicy
} from './RelayHooksType';
import { 
    createOperationDescriptor, 
    getRequest, 
    OperationType, 
    CacheConfig,
    IEnvironment 
} from 'relay-runtime';
import { isNetworkPolicy, isStorePolicy } from './Utils';

class UseQueryFetcher<TOperationType extends OperationType> {
    _queryFetcher: ReactRelayQueryFetcher;
    _forceUpdate: any;
    _lastResult: RenderProps<TOperationType>;


    constructor(forceUpdate) {
        this._queryFetcher = new ReactRelayQueryFetcher();
        this._forceUpdate = forceUpdate;
    }

    getLastResult() {
        return this._lastResult;
    }

    dispose() {
        this._queryFetcher.dispose();
    }

    /*execute(environment, query, variables): RenderProps {
        if (!query) {
            this._queryFetcher.dispose();
            return this.getOperationContext({ operation: null, relay: { environment, variables } });
        } else {
            this._queryFetcher.disposeRequest();
            const { createOperationDescriptor, getRequest, } = environment.unstable_internal;
            const request = getRequest(query);
            const operation = createOperationDescriptor(request, variables);
            return this.getOperationContext({ operation: operation, relay: { environment, variables: operation.variables } });
        }
    }*/

    lookupInStore(environment, operation, fetchPolicy): Snapshot {
        if (isStorePolicy(fetchPolicy) && environment.check(operation.root)) {
            this._queryFetcher._retainCachedOperation(environment, operation);
            return environment.lookup(operation.fragment, operation);
        }
        return null;
    }

    execute(environment: IEnvironment, query, variables, fetchPolicy, cacheConfig): void {
        const renderProps = this._execute(environment, query, variables, fetchPolicy, cacheConfig);
        this._lastResult = renderProps;
    }

    _execute(environment: IEnvironment, query, variables, fetchPolicy, cacheConfig): RenderProps<TOperationType> {
        if (!query) {
            this._queryFetcher.dispose();
            return this.getResult(environment, query, variables, fetchPolicy, cacheConfig, { empty: true });
        }
        this._queryFetcher.disposeRequest();
        const request = getRequest(query);
        const operation = createOperationDescriptor(request, variables);
        try {
            const storeSnapshot = this.lookupInStore(environment, operation, fetchPolicy);
            const isNetwork = isNetworkPolicy(fetchPolicy, storeSnapshot);
            if (isNetwork) {
                this._queryFetcher._fetchOptions = null;
            }
            const querySnapshot = isNetwork ? this._queryFetcher.fetch({
                cacheConfig,
                environment,
                onDataChange: (params: { //TODO BETTER
                    error?: Error,
                    snapshot?: Snapshot,
                }): void => {
                    const error = params.error == null ? null : params.error;
                    const snapshot = params.snapshot == null ? null : params.snapshot;

                    const onDataChangeProps = this.getResult(environment, query, variables, fetchPolicy, cacheConfig, { error, snapshot, cached: false });
                    if (this._lastResult !== onDataChangeProps) {
                        this._lastResult = onDataChangeProps;
                        this._forceUpdate(onDataChangeProps);
                    }
                },
                operation,
            }) : null;

            // Use network data first, since it may be fresher
            const snapshot = querySnapshot || storeSnapshot;
            return this.getResult(environment, query, variables, fetchPolicy, cacheConfig,{ error: null, snapshot, cached: !!storeSnapshot }); //relay
        } catch (error) {
            return this.getResult(environment, query, variables, fetchPolicy, cacheConfig, { error: error, snapshot: null, cached: false }); //relay
        }
    }

    getResult(environment: IEnvironment, query, variables, fetchPolicy: FetchPolicy, cacheConfig: CacheConfig, result: { empty?: boolean, error?: Error, snapshot?: Snapshot, cached?: boolean }): RenderProps<TOperationType> {
        if (!result) {
            return;
        }
        const renderProps = {
            error: null,
            props: result.empty ? {} : null,
            retry: null,
            cached: false
        }
        if (result.snapshot || result.error || result.cached) {
            renderProps.props = result.snapshot ? result.snapshot.data : null;
            renderProps.error = result.error ? result.error : null;
            renderProps.cached = result.cached || false;
            renderProps.retry = (cacheConfigOverride: CacheConfig = cacheConfig) => {
                const retryProps = this._execute(environment, query, variables, fetchPolicy, cacheConfigOverride);
                if (this._lastResult !== retryProps) {
                    this._lastResult = retryProps;
                    this._forceUpdate(retryProps);
                }
            }
        }
        return renderProps;
    }


}

export default UseQueryFetcher;
