import * as React from 'react';

import { useQuery, RelayEnvironmentProvider } from 'relay-hooks';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';
import { QueryRenderer } from 'react-relay';

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
    const { data, error } = useQuery(
        QueryApp,
        {},
        {
            fetchPolicy: 'store-or-network',
        },
    ); /*propsApp; */
    async function submitEntry() {
        await create('try', modernEnvironment).catch(console.error);
    }

    console.log('renderer', data, propsApp);
    if (data && data.entries) {
        return (
            <React.Fragment>
                <button onClick={submitEntry} className="refetch">
                    Add
                </button>
                <QueryRenderer
                    environment={modernEnvironment}
                    query={QueryApp}
                    variables={{}}
                    render={({ props }) => {
                        if (props && props.entries) {
                            return <Entries entries={props.entries} />;
                        }
                        return <div>prova</div>
                    }
                    }
                />
                <Entries entries={data.entries} />
            </React.Fragment>
        );
    } else if (error) {
        console.log('error', error);
        return <div />;
    }
    return <div>loading</div>;
};

const App = (
    <div>
        <QueryRenderer
            environment={modernEnvironment}
            query={QueryApp}
            variables={{}}
            render={({ props }) => {
                if (props && props.entries) {
                    return <AppTodo />;
                }
                return <div>prova</div>
            }
            }
        />

    </div>
);

export default App;
