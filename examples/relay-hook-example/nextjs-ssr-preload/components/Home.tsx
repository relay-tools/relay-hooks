import React from 'react';
import TodoApp, { QUERY_APP } from './TodoApp';
import { usePreloadedQuery, useQuery } from 'relay-hooks';
import { TodoAppQuery } from '../__generated__/relay/TodoAppQuery.graphql';

const Home = ({ prefetch }) => {
    const { error, data, retry } = usePreloadedQuery<TodoAppQuery>(prefetch);
    if (data) {
        return <TodoApp query={data} retry={retry} />;
    } else if (error) {
        return <div>{error.message}</div>;
    }
    return <div>loading</div>;
};

export default Home;
