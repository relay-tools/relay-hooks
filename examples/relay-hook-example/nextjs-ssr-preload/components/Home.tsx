import React from 'react';
import TodoApp, {QUERY_APP} from './TodoApp';
import {usePreloadedQuery, useQuery} from 'relay-hooks';
import {TodoAppQuery} from '../__generated__/relay/TodoAppQuery.graphql';

const Home = ({prefetch}) => {
  console.log('prefetch ssr', prefetch);
  const {error, cached, props, retry} = usePreloadedQuery<TodoAppQuery>(
    prefetch,
  );
  if (props) {
    return <TodoApp query={props} retry={retry} />;
  } else if (error) {
    return <div>{error.message}</div>;
  }
  return <div>loading</div>;
};

export default Home;
