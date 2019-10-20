import { Disposable, CacheConfig, IEnvironment } from "relay-runtime";
import { isNetworkPolicy, isStorePolicy } from "./Utils";

import { __internal } from "relay-runtime";

const { fetchQuery } = __internal;

class UseQueryFetcher {
  environment: IEnvironment;
  query: any;
  networkSubscription: Disposable;
  error: Error;
  result = {
    retry: (_cacheConfigOverride: CacheConfig) => undefined,
    cached: false,
    error: null
  };
  forceUpdate: any;

  constructor(forceUpdate) {
    this.forceUpdate = forceUpdate;
  }

  execute(environment: IEnvironment, query, fetchPolicy, networkCacheConfig) {
    let cached = false;
    const retry = (cacheConfigOverride: CacheConfig = networkCacheConfig) => {
      this.dispose();
      this.fetch(cacheConfigOverride);
    };
    if (environment !== this.environment || query !== this.query) {
      this.environment = environment;
      this.query = query;
      this.dispose();

      const fullQuery = environment.check(query.root);
      const isNetwork = isNetworkPolicy(fetchPolicy, fullQuery);
      const isStore = isStorePolicy(fetchPolicy);
      cached = fullQuery && isStore;
      if (isNetwork) {
        this.fetch(networkCacheConfig);
      }
    }
    this.result = {
      cached,
      retry,
      error: this.error
    };
    return this.result;
  }

  fetch(networkCacheConfig) {
    fetchQuery(this.environment, this.query, {
      networkCacheConfig
    }).subscribe({
      start: subscription => {
        this.networkSubscription = subscription;
      },
      error: error => {
        this.error = error;
        this.networkSubscription = null;
        this.forceUpdate(error);
      },
      complete: () => {
        this.networkSubscription = null;
      }
    });
  }

  dispose() {
    this.error = null;
    if (this.networkSubscription) {
      this.networkSubscription.dispose();
    }
  }
}

export default UseQueryFetcher;
