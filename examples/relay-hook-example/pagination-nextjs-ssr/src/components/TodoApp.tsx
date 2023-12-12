/* eslint-disable @typescript-eslint/camelcase */
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';
import { graphql, useFragment } from 'relay-hooks';
import styled from 'styled-components';
import { TodoApp_user$key } from '../__generated__/relay/TodoApp_user.graphql';
import { TodoList } from './TodoList';
export const QUERY_APP = graphql`
    query TodoAppQuery($userId: String, $after: String, $first: Int, $before: String, $last: Int) {
        ...TodoApp_user
    }
`;

export const StyledButton = styled.button`
    margin: auto;
    padding: 10px;
    cursor: pointer;
    display: -webkit-box;
`;

const StyledFooter = styled.footer`
    margin: 65px auto 0;
    color: #bfbfbf;
    font-size: 10px;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
    text-align: center;
`;

const StyledP = styled.p`
    line-height: 1;
`;

export const StyledDivButton = styled.div`
    display: flex;
    background: #fff;
`;

type Props = {
    query: TodoApp_user$key;
    retry: any;
    isLoading?: boolean;
};

const fragmentSpec = graphql`
    fragment TodoApp_user on Query {
        user(id: $userId, first: $first, after: $after, before: $before, last: $last) {
            id
            userId
            ...ReadInlineUser_user
            ...TodoList_user @arguments(first: $first, after: $after, before: $before, last: $last)
            ...TodoListTable_user
                @arguments(first: $first, after: $after, before: $before, last: $last)
        }
    }
`;

export function isNotNull<T>(it: T): it is NonNullable<T> {
    return it != null;
}

export const TodoApp = ({ query, retry, isLoading }: Props): JSX.Element => {
    const router = useRouter();
    const { user } = useFragment(fragmentSpec, query);

    const retryFunction = React.useCallback(
        () => retry(undefined, { fetchPolicy: 'store-and-network' }),
        [retry],
    );

    const { userId } = user || {};

    const changeUser = useCallback(() => {
        router.push({
            pathname: router.pathname,
            query: { userId: userId === 'me' ? 'you' : 'me' },
        });
    }, [router, userId]);

    if (!user) {
        return <div />;
    }

    // <Profiler id="TodoApp" onRender={onRender}>

    return (
        <React.Fragment>
            <TodoList isLoading={isLoading} user={user} />

            <StyledDivButton>
                <StyledButton onClick={changeUser}>Change User</StyledButton>
            </StyledDivButton>

            <StyledDivButton>
                <StyledButton onClick={retryFunction}>Retry</StyledButton>
            </StyledDivButton>
            <StyledFooter>
                <StyledP>Double-click to edit a todo</StyledP>
            </StyledFooter>
        </React.Fragment>
    );
};
