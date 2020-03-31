import { commitMutation } from 'relay-hooks';
import graphql from 'babel-plugin-relay/macro';
const mutation = graphql`
    mutation createEntryMutation($input: CreateEntryInput) {
        createEntry(input: $input) {
            clientMutationId
            entry {
                id
                text
            }
        }
    }
`;

function updater(store, edge) {
    const records = store.getRoot().getLinkedRecords('entries');

    if (!records) return;

    store.getRoot().setLinkedRecords([...records, edge], 'entries');
}

export function create(text, environment) {
    const id = '' + Math.random() * 1000;

    return new Promise((res, rej) =>
        commitMutation(environment, {
            mutation,
            variables: {
                input: {
                    id,
                    text,
                },
            },
            updater: (store) => {
                const payload = store.getRootField('createEntry');
                if (!payload) return;

                const entry = payload.getLinkedRecord('entry');
                entry && updater(store, entry);
            },
            optimisticUpdater: (store) => {
                const entry = store.create(id, 'Entry');

                entry.setValue(id, 'id');
                entry.setValue(text, 'text');

                updater(store, entry);
            },
            onError: rej,
            onCompleted: res,
        }),
    );
}
