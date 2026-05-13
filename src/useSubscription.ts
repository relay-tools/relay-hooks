import { useEffect } from 'react';
import { GraphQLSubscriptionConfig, requestSubscription, OperationType } from 'relay-runtime';
import { SkipGraphQLSubscriptionConfig, SkipSubscriptionConfig, SubscriptionConfig } from './RelayHooksTypes';
import { useRelayEnvironment } from './useRelayEnvironment';

export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: GraphQLSubscriptionConfig<TSubscriptionPayload>,
    opts?: SubscriptionConfig,
): void;
export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: SkipGraphQLSubscriptionConfig<TSubscriptionPayload>,
    opts: SkipSubscriptionConfig,
): void;
export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: GraphQLSubscriptionConfig<TSubscriptionPayload>,
    opts?: SubscriptionConfig | SkipSubscriptionConfig,
): void {
    const environment = useRelayEnvironment();
    const skip = opts && opts.skip;

    useEffect(() => {
        if (skip) {
            return;
        }
        const { dispose } = requestSubscription(environment, config);
        return dispose;
    }, [environment, config, skip]);
}
