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
interface DataFromEnum {
    NETWORK_ONLY,
    STORE_THEN_NETWORK,
};
export type DataFrom = keyof DataFromEnum;

export type ContainerResult = {
    data: { [key: string]: any },
    resolver: FragmentSpecResolver,
    relay: RelayContext
};


export interface RenderProps {
    error: Error,
    props: Object,
    retry: () => void,
    cached?: boolean
};

export interface HooksProps extends RenderProps {
    relay: RelayContext,
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
    relay: RelayContext,
};

