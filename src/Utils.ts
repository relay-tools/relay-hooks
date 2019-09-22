import { STORE_OR_NETWORK, STORE_THEN_NETWORK, NETWORK_ONLY, FetchPolicy, DataFrom, STORE_ONLY } from "./RelayHooksType";

export const convertDataFrom = (dataFrom: DataFrom = STORE_OR_NETWORK): FetchPolicy => {
    switch (dataFrom) {
        case NETWORK_ONLY:
            return "network-only";
        case STORE_THEN_NETWORK:
            return "store-and-network";
        case STORE_ONLY:
            return "store-only";
        default:
            return "store-or-network";
    }
}

export const isNetworkPolicy = (policy: FetchPolicy, storeSnapshot): boolean => {
    return (policy === "network-only" ||
        policy === "store-and-network" ||
        (policy === "store-or-network" && !storeSnapshot));
}

export const isStorePolicy = (policy: FetchPolicy): boolean => {
    return policy !== "network-only";
}