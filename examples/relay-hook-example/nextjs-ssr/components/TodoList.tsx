/* eslint-disable @typescript-eslint/camelcase */
// @flow
/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import LinearProgress from '@material-ui/core/LinearProgress';
import TablePagination from '@material-ui/core/TablePagination';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';

import InfiniteScroll from 'react-infinite-scroller';
import { graphql, usePagination, useRelayEnvironment } from 'relay-hooks';
import styled from 'styled-components';
import { TodoList_user, TodoList_user$key } from '../__generated__/relay/TodoList_user.graphql';
import { UserFragmentRefetchQuery } from '../__generated__/relay/UserFragmentRefetchQuery.graphql';
import { AddTodoMutation } from '../mutations/AddTodoMutation';
import { isPaginated, isScroll } from './Header';
import { Todo } from './Todo';
import { isNotNull, StyledButton, StyledDivButton } from './TodoApp';
import { TodoTextInput } from './TodoTextInput';
import { Disposable } from 'relay-runtime';
type Todos = NonNullable<TodoList_user['todos']>;
type Edges = NonNullable<Todos['edges']>;
type Edge = NonNullable<Edges[number]>;
type Node = NonNullable<Edge['node']>;
type NullableNode = Edge['node'];

type Props = {
    user: TodoList_user$key;
    isLoading?: boolean;
};

const StyledSection = styled.section`
    position: relative;
    z-index: 2;
    border-top: 1px solid #e6e6e6;
`;
const StyledList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
`;

const fragmentSpecs = graphql`
    fragment TodoList_user on User
        @refetchable(queryName: "UserFragmentRefetchQuery")
        @argumentDefinitions(
            first: { type: Int }
            after: { type: String }
            last: { type: Int }
            before: { type: String }
        ) {
        todos(first: $first, after: $after, before: $before, last: $last)
            @connection(key: "TodoList_todos") {
            edges {
                node {
                    id
                    complete
                    ...Todo_todo
                }
            }
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
        }
        userId
        totalCount
        completedCount
        ...ReadInlineUser_user
    }
`;

const fragmentTableSpecs = graphql`
    fragment TodoListTable_user on User
        @refetchable(queryName: "UserFragmentRefetchTableQuery")
        @argumentDefinitions(
            first: { type: Int }
            after: { type: String }
            last: { type: Int }
            before: { type: String }
        ) {
        todos(first: $first, after: $after, before: $before, last: $last)
            @connection(key: "TodoList_todos", handler: "connection_table") {
            edges {
                node {
                    id
                    complete
                    ...Todo_todo
                }
            }
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
        }
        userId
        totalCount
        completedCount
        ...ReadInlineUser_user
    }
`;

export const TodoList = (props: Props): JSX.Element => {
    const environment = useRelayEnvironment();
    const [rowsPerPage, setRowsPerPage] = useState(2);
    const [page, setPage] = useState(0);
    const router = useRouter();

    const paginated = isPaginated(router);
    const scroll = isScroll(router);
    const {
        data: user,
        loadNext,
        loadPrevious,
        refetch,
        hasNext,
        isLoadingNext,
        isLoadingPrevious,
        isLoading: refetchLoading,
    } = usePagination<UserFragmentRefetchQuery, TodoList_user$key>(
        paginated ? fragmentTableSpecs : fragmentSpecs,
        props.user,
    );

    const { todos, totalCount } = user || {};
    const refresh = useCallback((): Disposable => {
        const onComplete = (): void => {
            setRowsPerPage(rowsPerPage);
            setPage(0);
        };
        return refetch({}, { onComplete });
    }, [refetch, rowsPerPage]);

    const list = React.useMemo(() => {
        /* eslint-disable indent */
        return todos && todos.edges
            ? todos.edges
                  .filter(isNotNull)
                  .map((edge: Edge): NullableNode => edge.node)
                  .filter(isNotNull)
            : [];
        /* eslint-enable indent */
    }, [todos]);

    const isLoading =
        props.isLoading || refetchLoading || (paginated && (isLoadingPrevious || isLoadingNext));
    const loadMore = useCallback(() => {
        // Don't fetch again if we're already loading the next page
        if (isLoading) {
            return;
        }
        loadNext(1);
    }, [isLoading, loadNext]);

    const handleChangePage = useCallback(
        (_event, newPage) => {
            const previous = page < newPage;
            const refetch = previous ? loadNext : loadPrevious;
            refetch(rowsPerPage, {
                onComplete: (_error: Error | null) => setPage(newPage),
            });
        },
        [page, rowsPerPage, loadNext, loadPrevious],
    );

    const handleChangeRowsPerPage = useCallback(
        (event) => {
            const rowForPage = parseInt(event.target.value, 10);
            refetch(
                {
                    first: rowForPage,
                    before: null,
                    after: null,
                    last: null,
                },
                {
                    onComplete: () => {
                        setRowsPerPage(rowForPage);
                        setPage(0);
                    },
                },
            );
        },
        [refetch],
    );

    const onCompleted = useCallback(() => {
        if (isPaginated(router)) {
            refresh();
        }
    }, [router, refresh]);

    const handleTextInputSave = useCallback(
        (text: string) => {
            console.log('onCompleted', onCompleted);
            AddTodoMutation.commit(environment, text, user, onCompleted);
            return;
        },
        [environment, user, onCompleted],
    );

    return (
        <React.Fragment>
            <TodoTextInput edit onSave={handleTextInputSave} placeholder="What needs to be done?" />
            {isLoading && <LinearProgress key={'LinearProgress'} />}
            <InfiniteScroll
                pageStart={0}
                loadMore={loadMore}
                hasMore={scroll && hasNext && !isLoading}
                loader={<LinearProgress />}
                useWindow
            >
                <StyledSection>
                    <ProvaList nodes={list} user={user} onCompleted={onCompleted} />
                </StyledSection>
            </InfiniteScroll>

            {paginated && (
                <TablePagination
                    rowsPerPageOptions={[2, 5, 10, 25]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onChangePage={handleChangePage}
                    onChangeRowsPerPage={handleChangeRowsPerPage}
                />
            )}
            <StyledDivButton>
                <StyledButton onClick={refresh}>Refresh</StyledButton>
            </StyledDivButton>
        </React.Fragment>
    );
};

const ProvaList = (props: any): JSX.Element => {
    const { user, onCompleted } = props;
    return (
        <StyledList>
            {props.nodes.map((node: Node) => (
                <Todo key={node.id} todo={node} user={user} onCompleted={onCompleted} />
            ))}
        </StyledList>
    );
};
