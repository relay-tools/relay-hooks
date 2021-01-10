import React from 'react';
import TodoApp, { QUERY_APP } from '../components/TodoApp';
import { withData } from '../relay';
import { useLazyLoadQuery, STORE_OR_NETWORK } from 'relay-hooks';
import { TodoAppQuery } from '../__generated__/relay/TodoAppQuery.graphql';

const query = QUERY_APP;

const variables = {
    // Mock authenticated ID that matches database
    userId: 'you',
};

const Home = () => {
    const { data, retry } = useLazyLoadQuery<TodoAppQuery>(query, variables, {
        fetchPolicy: STORE_OR_NETWORK,
    });
    if (!data) {
        return <div>no data || skip</div>;
    }
    return <TodoApp query={data} retry={retry} />;
};

// <Header />
export default withData(Home, {
    query,
    variables,
});
