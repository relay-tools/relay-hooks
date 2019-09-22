import {
    GraphQLTaggedNode,
    RelayContext,
    FragmentSpecResolver,
} from 'relay-runtime/lib/RelayStoreTypes';
import { OperationType, CacheConfig } from 'relay-runtime';


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
export type FetchPolicy =
| 'store-only'
| 'store-or-network'
| 'store-and-network'
| 'network-only';

export type DataFrom = keyof DataFromEnum;

export type ContainerResult = {
    data: { [key: string]: any },
    resolver: FragmentSpecResolver,
};

export interface RenderProps<T extends OperationType> {
    error: Error,
    props: T['response'],
    retry: () => void,
    cached?: boolean
};

export interface UseQueryProps<T extends OperationType> {
    cacheConfig?: CacheConfig,
    dataFrom?: DataFrom,
    query: GraphQLTaggedNode,
    variables: T['variables'],
};

export type OperationContextProps = {
    operation: any,
    relay: RelayContext,
};

