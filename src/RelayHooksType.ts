import {
    CacheConfig,
    GraphQLTaggedNode,
    IEnvironment,
    RelayContext,
    Variables,
} from 'relay-runtime/lib/RelayStoreTypes';

export const NETWORK_ONLY = 'NETWORK_ONLY';
export const STORE_THEN_NETWORK = 'STORE_THEN_NETWORK';
interface DataFromEnum {
    NETWORK_ONLY,
    STORE_THEN_NETWORK,
};
export type DataFrom = keyof DataFromEnum;



export type RenderProps = {
    error: Error,
    props: Object,
    retry: () => void,
    cached?: boolean
};

export type HooksProps = {
    renderProps: RenderProps,
    relayContext: RelayContext,
};

export interface UseQueryProps {
    cacheConfig?: CacheConfig,
    dataFrom?: DataFrom,
    environment: IEnvironment,
    query: GraphQLTaggedNode,
    variables: Variables,
};

export type OperationContextProps = {
    operation: any,
    relayContext: RelayContext,
};