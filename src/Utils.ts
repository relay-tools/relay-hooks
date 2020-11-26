import {
    Variables,
    ConnectionMetadata,
    createOperationDescriptor,
    getRequest,
    GraphQLTaggedNode,
    OperationDescriptor,
    CacheConfig,
} from 'relay-runtime';
import { STORE_OR_NETWORK, STORE_THEN_NETWORK, NETWORK_ONLY, FetchPolicy } from './RelayHooksType';

export type ReactConnectionMetadata = ConnectionMetadata & { fragmentName: string };

export const isNetworkPolicy = (policy: FetchPolicy, storeSnapshot): boolean => {
    return (
        policy === NETWORK_ONLY ||
        policy === STORE_THEN_NETWORK ||
        (policy === STORE_OR_NETWORK && !storeSnapshot)
    );
};

export const isStorePolicy = (policy: FetchPolicy): boolean => {
    return policy !== NETWORK_ONLY;
};

export const forceCache = { force: true };

// Fetcher
export function createOperation(
    gqlQuery: GraphQLTaggedNode,
    variables: Variables,
    cacheConfig?: CacheConfig | null,
): OperationDescriptor {
    return createOperationDescriptor(getRequest(gqlQuery), variables, cacheConfig);
}
