import { useEffect } from 'react';
import { GraphQLSubscriptionConfig, requestSubscription, OperationType } from 'relay-runtime';
import { useRelayEnvironment } from './useRelayEnvironment';

type SubscriptionConfig = {
    skip?: boolean;
};

export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: GraphQLSubscriptionConfig<TSubscriptionPayload>,
    opts?: SubscriptionConfig,
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
