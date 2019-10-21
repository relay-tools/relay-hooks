import { Disposable, CacheConfig, IEnvironment, Snapshot } from "relay-runtime";
import { isNetworkPolicy, isStorePolicy } from "./Utils";
import { __internal } from "relay-runtime";

const { fetchQuery } = __internal;

class UseQueryFetcher {
  environment: IEnvironment;
  query: any;
  networkSubscription: Disposable;
  rootSubscription: Disposable;
  error: Error;
  snapshot: Snapshot;
  result = {
    retry: (_cacheConfigOverride: CacheConfig) => undefined,
    cached: false,
    error: null,
    snapshot: null
  };
  forceUpdate: any;

  constructor(forceUpdate) {
    this.forceUpdate = forceUpdate;
  }

  lookupInStore(environment: IEnvironment, operation, fetchPolicy): Snapshot {
    if (isStorePolicy(fetchPolicy) && environment.check(operation.root)) {
      return environment.lookup(operation.fragment, operation);
    }
    return null;
  }

  execute(environment: IEnvironment, query, fetchPolicy, networkCacheConfig) {
    let storeSnapshot;
    const retry = (cacheConfigOverride: CacheConfig = networkCacheConfig) => {
      this.dispose();
      this.fetch(cacheConfigOverride);
    };
    if (environment !== this.environment || query !== this.query) {
      this.environment = environment;
      this.query = query;
      this.dispose();

      storeSnapshot = this.lookupInStore(environment, this.query, fetchPolicy);
      const isNetwork = isNetworkPolicy(fetchPolicy, storeSnapshot);
      if (isNetwork) {
        this.fetch(networkCacheConfig);
      } else if (!!storeSnapshot) {
        this.snapshot = storeSnapshot;
        this.error = null;
        this.subscribe(this.snapshot);
      }
    }
    this.result = {
      cached: !!storeSnapshot,
      retry,
      error: this.error,
      snapshot: storeSnapshot || this.snapshot
    };
    return this.result;
  }

  subscribe(snapshot) {
    this.rootSubscription = this.environment.subscribe(
      this.snapshot,
      snapshot => {
        // Read from this._fetchOptions in case onDataChange() was lazily added.
        this.snapshot = snapshot;
        this.error = null;
        this.forceUpdate(snapshot);
      }
    );
  }

  fetch(networkCacheConfig) {
    let fetchHasReturned = false;
    fetchQuery(this.environment, this.query, {
      networkCacheConfig
    }).subscribe({
      start: subscription => {
        this.networkSubscription = subscription;
      },
      next: () => {
        this._onQueryDataAvailable({ notifyFirstResult: fetchHasReturned });
      },
      error: error => {
        this.error = error;
        this.snapshot = null;
        if (fetchHasReturned) {
          this.forceUpdate(error);
        }
        this.error = error;
        this.networkSubscription = null;
      },
      complete: () => {
        this.networkSubscription = null;
      }
    });
    fetchHasReturned = true;
  }

  dispose() {
    this.error = null;
    if (this.networkSubscription) {
      this.networkSubscription.dispose();
    }
    if (this.rootSubscription) {
      this.rootSubscription.dispose();
    }
  }

  _onQueryDataAvailable({ notifyFirstResult }) {
    // `_onQueryDataAvailable` can be called synchronously the first time and can be called
    // multiple times by network layers that support data subscriptions.
    // Wait until the first payload to call `onDataChange` and subscribe for data updates.
    if (this.snapshot) {
      return;
    }

    this.snapshot = this.environment.lookup(this.query.fragment);

    // Subscribe to changes in the data of the root fragment
    this.subscribe(this.snapshot);

    if (this.snapshot && notifyFirstResult) {
      this.error = null;
      this.forceUpdate(this.snapshot);
    }
  }
}

export default UseQueryFetcher;
