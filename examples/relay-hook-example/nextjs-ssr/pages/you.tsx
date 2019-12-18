import React from 'react';
import TodoApp, {QUERY_APP} from '../components/TodoApp';
import {withData} from '../relay';
import {useQuery} from 'relay-hooks';
import {STORE_OR_NETWORK} from 'relay-hooks/lib/RelayHooksType';
import {TodoAppQuery} from '../__generated__/relay/TodoAppQuery.graphql';

const query = QUERY_APP;

const variables = {
  // Mock authenticated ID that matches database
  userId: 'you',
};

const Home = () => {
  const {error, cached, props, retry} = useQuery<TodoAppQuery>(
    query,
    variables,
    {
      fetchPolicy: STORE_OR_NETWORK,
    },
  );
  if (props) {
    return <TodoApp query={props} retry={retry} />;
  } else if (error) {
    return <div>{error.message}</div>;
  }
  return <div>loading</div>;
};

// <Header />
export default withData(Home, {
  query,
  variables,
});
