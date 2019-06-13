import {
    CacheConfig,
    GraphQLTaggedNode,
    IEnvironment,
    RelayContext,
    Variables,
    FragmentSpecResolver,
} from 'relay-runtime/lib/RelayStoreTypes';

export const NETWORK_ONLY = 'NETWORK_ONLY';
export const STORE_THEN_NETWORK = 'STORE_THEN_NETWORK';
export const STORE_OR_NETWORK = 'STORE_OR_NETWORK';
export const STORE_ONLY = 'STORE_ONLY';
interface DataFromEnum {
    NETWORK_ONLY,
    STORE_THEN_NETWORK,
    STORE_OR_NETWORK,
    STORE_ONLY
};
export type DataFrom = keyof DataFromEnum;

export type ContainerResult = {
    data: { [key: string]: any },
    resolver: FragmentSpecResolver,
};


export interface RenderProps {
    error: Error,
    props: Object,
    retry: () => void,
    cached?: boolean
};

export interface UseQueryProps {
    dataFrom?: DataFrom,
    query: GraphQLTaggedNode,
    variables: Variables,
};

export type OperationContextProps = {
    operation: any,
    relay: RelayContext,
};

