import React from 'react';
import TodoApp, { QUERY_APP } from './TodoApp';
import { usePreloadedQuery, useQuery } from 'relay-hooks';
import { TodoAppQuery } from '../__generated__/relay/TodoAppQuery.graphql';

const Home = ({ prefetch }) => {
    const { data, retry } = usePreloadedQuery<TodoAppQuery>(prefetch);
    if (!data) {
        return <div>no data || skip</div>;
    }

    return <TodoApp query={data} retry={retry} />;
};

export default Home;
