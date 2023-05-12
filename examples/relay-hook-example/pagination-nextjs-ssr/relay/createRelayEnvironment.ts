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
    return Observable.create((sink) => { 
        sleep(2000).then(() => fetch(endpoint, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            }, // Add authentication and other headers here
            body: JSON.stringify({
                query: operation.text, // GraphQL text from input
                variables,
            }),
        }).then(response => response.json())
        .then(data => {
          if (data.errors) {
            sink.error(data.errors);
            return
          }
          sink.next(data);
          sink.complete();
        }));
    });
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
