import { STORE_OR_NETWORK, STORE_THEN_NETWORK, NETWORK_ONLY, FetchPolicy } from './RelayHooksType';

export const isNetworkPolicy = (policy: FetchPolicy, storeSnapshot): boolean => {
    return policy === NETWORK_ONLY || policy === STORE_THEN_NETWORK || (policy === STORE_OR_NETWORK && !storeSnapshot);
};

export const isStorePolicy = (policy: FetchPolicy): boolean => {
    return policy !== NETWORK_ONLY;
};
