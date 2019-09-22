import {
    Subscription,
    IEnvironment,
    GraphQLTaggedNode,
    Observable,
    Observer,
    Variables,
    createOperationDescriptor,
    getRequest,
    Snapshot
} from 'relay-runtime';

export type RefetchOptions = {
    force?: boolean,
    fetchPolicy?: FetchPolicy,
};

export type ObserverOrCallback = Observer<void> | ((error: Error) => any);
import * as ReactRelayQueryFetcher from 'react-relay/lib/ReactRelayQueryFetcher';
import { ContainerResult, FetchPolicy } from './RelayHooksType';
import { isStorePolicy, isNetworkPolicy } from './Utils';


class FragmentRefetch {
    _refetchSubscription: Subscription;
    _queryFetcher: ReactRelayQueryFetcher;

    constructor() {
        this._queryFetcher = new ReactRelayQueryFetcher();
    }

    dispose() {
        this._queryFetcher && this._queryFetcher.dispose();
        this._refetchSubscription && this._refetchSubscription.unsubscribe();
    }

    lookupInStore(environment: IEnvironment, operation, fetchPolicy): Snapshot {
        if (isStorePolicy(fetchPolicy) && environment.check(operation.root)) {
            this._queryFetcher._retainCachedOperation(environment, operation);
            return environment.lookup(operation.fragment, operation);
        }
        return null;
    }

    refetch(environment: IEnvironment,
        fragmentVariables: Variables,
        taggedNode: GraphQLTaggedNode,
        refetchVariables:
            | Variables
            | ((fragmentVariables: Variables) => Variables),
        renderVariables: Variables,
        observerOrCallback: ObserverOrCallback,
        options: RefetchOptions,
        prevResult: ContainerResult,
        setResult: any) { //TODO Function
        const fetchVariables =
            typeof refetchVariables === 'function'
                ? refetchVariables(fragmentVariables)
                : refetchVariables;
        const newFragmentVariables = renderVariables
            ? { ...fetchVariables, ...renderVariables }
            : fetchVariables;

        const cacheConfig = options ? { force: !!options.force } : undefined;

        const observer =
            typeof observerOrCallback === 'function'
                ? {
                    // callback is not exectued on complete or unsubscribe
                    // for backward compatibility
                    next: observerOrCallback,
                    error: observerOrCallback,
                }
                : observerOrCallback || ({} as any);

        const query = getRequest(taggedNode);
        const operation = createOperationDescriptor(query, fetchVariables);

        // TODO: T26288752 find a better way
        /* eslint-disable lint/react-state-props-mutation */
        //this.state.localVariables = fetchVariables;
        /* eslint-enable lint/react-state-props-mutation */

        // Cancel any previously running refetch.
        this._refetchSubscription && this._refetchSubscription.unsubscribe();

        // Declare refetchSubscription before assigning it in .start(), since
        // synchronous completion may call callbacks .subscribe() returns.
        let refetchSubscription;

        const { fetchPolicy = "network-only"} = options;

        const storeSnapshot = this.lookupInStore(
            environment,
            operation,
            fetchPolicy,
        );
        if (storeSnapshot != null) {
            const res = prevResult.resolver;
            res.setVariables(newFragmentVariables, operation.node || operation.request.node);
            setResult({
                resolver: res, data: res.resolve(), relay: {
                    environment: environment,
                    variables: newFragmentVariables,
                }
            })
            const complete = async () => {
                observer.next && observer.next();
                observer.complete && observer.complete();
            }
            complete();
        }
        const isNetworky = isNetworkPolicy(fetchPolicy, storeSnapshot);
        if(!isNetworky) {
            return {
                dispose() { },
            };
        }
        if (isNetworky) {
            this._queryFetcher
                .execute({
                    environment,
                    operation,
                    cacheConfig,
                    // TODO (T26430099): Cleanup old references
                    preservePreviousReferences: true,
                })
                .mergeMap(response => {
                    const res = prevResult.resolver;
                    res.setVariables(newFragmentVariables, operation.node || operation.request.node);
                    return Observable.create(sink => {
                        setResult({
                            resolver: res, data: res.resolve(), relay: {
                                environment: environment,
                                variables: newFragmentVariables,
                            }
                        })
                        const complete = async () => {
                            sink.next();
                            sink.complete();
                        }
                        complete();
                    }
                    );
                })
                .finally(() => {
                    // Finalizing a refetch should only clear this._refetchSubscription
                    // if the finizing subscription is the most recent call.
                    if (this._refetchSubscription === refetchSubscription) {
                        this._refetchSubscription = null;
                    }
                })
                .subscribe({
                    ...observer,
                    start: subscription => {
                        this._refetchSubscription = refetchSubscription = subscription;
                        observer.start && observer.start(subscription);
                    },
                });

            return {
                dispose() {
                    refetchSubscription && refetchSubscription.unsubscribe();
                },
            };
        }
    }
}

export default FragmentRefetch;
