import fetch from 'isomorphic-unfetch';
import { Store, Environment, RecordSource, DefaultHandlerProvider, Network, Observable } from 'relay-runtime';

import { HandlerProvider } from 'relay-runtime/lib/handlers/RelayDefaultHandlerProvider';
import { update } from './connection';

let relayEnvironment: Environment;

function sleep(ms): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchQuery(operation, variables, _cacheConfig, _uploadables): any {
    const endpoint = 'http://localhost:3000/graphql';
    const controller = new AbortController();
    let doAbort = true;
    const observer = Observable.create((sink) => {
        sleep(2).then(() =>
            fetch(endpoint, {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                }, // Add authentication and other headers here
                body: JSON.stringify({
                    query: operation.text, // GraphQL text from input
                    variables,
                }),
            })
                .then((response) => {
                    doAbort = false;
                    return response.json();
                })
                .then((data) => {
                    console.log('end fetch', data);
                    if (data.errors) {
                        sink.error(data.errors);
                        return;
                    }
                    sink.next(data);
                    sink.complete();
                })
                .catch((e) => {
                    sink.error(e);
                }),
        );
        return (): void => {
            if (doAbort) {
                console.log('aborttt');
                controller.abort('unsubscribe');
            }
        };
    });
    /*observer.subscribe({
        unsubscribe: (): void => {
            console.log('aborttt');
            controller.abort();
        },
    });*/
    return observer;
}

type InitProps = {
    records?: any;
};

const network = Network.create(fetchQuery);

const handlerProvider: HandlerProvider = (handle: string) => {
    if (handle === 'connection_table') return { update };
    return DefaultHandlerProvider(handle);
};

function createEnvironment(records): Environment {
    const recordSource = new RecordSource(records);
    const store = new Store(recordSource);
    const environment = new Environment({
        network,
        store,
        handlerProvider,
    });
    return environment;
}

export function initEnvironment(options: InitProps = {}): Environment {
    const { records = {} } = options;

    if (typeof window === 'undefined') {
        return createEnvironment(records);
    }

    // reuse Relay environment on client-side
    if (!relayEnvironment) {
        relayEnvironment = createEnvironment(records);
    }

    return relayEnvironment;
}
