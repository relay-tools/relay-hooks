import React from 'react';
import TodoApp, { QUERY_APP } from '../components/TodoApp';
import { withData } from '../relay';
import { useLazyLoadQuery, STORE_OR_NETWORK } from 'relay-hooks';
import { TodoAppQuery } from '../__generated__/relay/TodoAppQuery.graphql';

const query = QUERY_APP;

const variables = {
    // Mock authenticated ID that matches database
    userId: 'me',
};

// issue
export type $Call<Fn extends (...args: any[]) => any> = Fn extends (arg: any) => infer RT
    ? RT
    : never;
export type ArrayKeyType = ReadonlyArray<{ readonly ' $data'?: ReadonlyArray<unknown> } | null>;
export type ArrayKeyReturnType<T extends ArrayKeyType> = (
    arg: T,
) => NonNullable<NonNullable<T[0]>[' $data']>[0];

const issue223: ReadonlyArray<$Call<ArrayKeyReturnType<any>>> = [];
console.log('issue 223', issue223);

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
