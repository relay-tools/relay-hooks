import React from 'react';
import TodoApp, {QUERY_APP} from './TodoApp';
import {usePreloadedQuery, useQuery} from 'relay-hooks';
import {TodoAppQuery} from '../__generated__/relay/TodoAppQuery.graphql';

const Home = ({prefetch}) => {
  console.log('prefetch ssr', prefetch);
  const {props, retry} = usePreloadedQuery<TodoAppQuery>(prefetch);
  if (!props) {
    return <div>no data || skip</div>;
  }

  return <TodoApp query={props} retry={retry} />;
};

export default Home;
