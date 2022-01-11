import {
    Environment,
    Network,
    RecordSource,
    Store,
    RequestParameters,
    Variables,
} from 'relay-runtime';

async function fetchQuery(operation: RequestParameters, variables: Variables) {
    const response = await fetch('http://localhost:3000/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: operation.text,
            variables,
        }),
    });

    return response.json();
}

export const environment: Environment = new Environment({
    network: Network.create(fetchQuery),
    store: new Store(new RecordSource()),
});
