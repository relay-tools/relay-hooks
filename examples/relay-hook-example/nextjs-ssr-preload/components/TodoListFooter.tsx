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

import RemoveCompletedTodosMutation from '../mutations/RemoveCompletedTodosMutation';

import React from 'react';
import {graphql, useFragment, useRelayEnvironment} from 'relay-hooks';
import styled, {css} from 'styled-components';
import {
  TodoListFooter_user$key,
  TodoListFooter_user,
} from '../__generated__/relay/TodoListFooter_user.graphql';
import {isNotNull} from './TodoApp';
type Todos = NonNullable<TodoListFooter_user['todos']>;
type Edges = NonNullable<Todos['edges']>;
type Edge = NonNullable<Edges[number]>;

type Props = {
  user: TodoListFooter_user$key;
};

const StyledFooter = styled.footer`
  color: #777;
  padding: 10px 15px;
  height: 20px;
  text-align: center;
  border-top: 1px solid #e6e6e6;

  &:before {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 50px;
    overflow: hidden;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2), 0 8px 0 -3px #f6f6f6,
      0 9px 1px -3px rgba(0, 0, 0, 0.2), 0 16px 0 -6px #f6f6f6,
      0 17px 2px -6px rgba(0, 0, 0, 0.2);
  }
`;

const StyledSpan = styled.span`
  float: left;
  text-align: left;
`;

const StyledStrong = styled.strong`
  font-weight: 300;
`;

const StyledButton = styled.button`
  float: right;
  position: relative;
  line-height: 20px;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const fragmentSpec = graphql`
  fragment TodoListFooter_user on User {
    id
    userId
    completedCount
    todos(
      first: 2147483647 # max GraphQLInt
    ) @connection(key: "TodoList_todos") {
      edges {
        node {
          id
          complete
        }
      }
    }
    totalCount
  }
`;
const TodoListFooter = (props: Props) => {
  const environment = useRelayEnvironment();
  const user = useFragment(fragmentSpec, props.user);
  const {todos, completedCount, totalCount} = user;
  const completedEdges: ReadonlyArray<Edge> =
    todos && todos.edges
      ? todos.edges
          .filter(isNotNull)
          .filter((edge: Edge) => edge && edge.node && edge.node.complete)
      : [];

  const handleRemoveCompletedTodosClick = () => {
    RemoveCompletedTodosMutation.commit(
      environment,
      {
        edges: completedEdges,
      },
      user,
    );
  };

  const numRemainingTodos = totalCount - completedCount;

  return (
    <StyledFooter>
      <StyledSpan>
        <StyledStrong>{numRemainingTodos}</StyledStrong> item
        {numRemainingTodos === 1 ? '' : 's'} left
      </StyledSpan>

      {completedCount > 0 && (
        <StyledButton onClick={handleRemoveCompletedTodosClick}>
          Clear completed
        </StyledButton>
      )}
    </StyledFooter>
  );
};

export default TodoListFooter;
