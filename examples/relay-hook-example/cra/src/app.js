import * as React from 'react';

import { useQuery, RelayEnvironmentProvider } from 'relay-hooks';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import { create } from './mutations/create';

import QueryApp from './query/QueryApp';
import Entries from './components/Entries';

async function fetchQuery(operation, variables) {
    const response = await fetch('http://localhost:3003/graphql', {
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

const modernEnvironment = new Environment({
    network: Network.create(fetchQuery),
    store: new Store(new RecordSource()),
});

const AppTodo = (propsApp) => {
    const { props, error } = useQuery(
        QueryApp,
        {},
        {
            fetchPolicy: 'store-or-network',
        },
    ); /*propsApp; */
    async function submitEntry() {
        await create('try', modernEnvironment).catch(console.error);
    }

    console.log('renderer', props, propsApp);
    if (props && props.entries) {
        return (
            <React.Fragment>
                <button onClick={submitEntry} className="refetch">
                    Add
                </button>
                <Entries entries={props.entries} />
            </React.Fragment>
        );
    } else if (error) {
        console.log('error', error);
        return <div />;
    }
    return <div>loading</div>;
};

const App = (
    <RelayEnvironmentProvider environment={modernEnvironment}>
        <AppTodo />
    </RelayEnvironmentProvider>
);

export default App;
