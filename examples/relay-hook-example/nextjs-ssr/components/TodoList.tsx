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

import MarkAllTodosMutation from '../mutations/MarkAllTodosMutation';
import Todo from './Todo';

import React, {SyntheticEvent} from 'react';
import {graphql} from 'relay-hooks';
import styled from 'styled-components';
import {useFragment, useRelayEnvironment} from 'relay-hooks';
import {
  TodoList_user,
  TodoList_user$key,
} from '../__generated__/relay/TodoList_user.graphql';
import {isNotNull} from './TodoApp';
type Todos = NonNullable<TodoList_user['todos']>;
type Edges = NonNullable<Todos['edges']>;
type Edge = NonNullable<Edges[number]>;
type Node = NonNullable<Edge['node']>;
type NullableNode = Edge['node'];

type Props = {
  user: TodoList_user$key;
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

const StyledInput = styled.input`
  position: absolute;
  top: -55px;
  left: -12px;
  width: 60px;
  height: 34px;
  text-align: center;
  border: none;

  @media screen and (-webkit-min-device-pixel-ratio: 0) {
    background: none;
    -webkit-transform: rotate(90deg);
    transform: rotate(90deg);
    -webkit-appearance: none;
    appearance: none;
  }

  &:before {
    content: '❯';
    font-size: 22px;
    color: #e6e6e6;
    padding: 10px 27px 10px 27px;
  }

  &:checked:before {
    color: #737373;
  }
`;

const fragmentSpecs = graphql`
  fragment TodoList_user on User {
    todos(
      first: 2147483647 # max GraphQLInt
    ) @connection(key: "TodoList_todos") {
      edges {
        node {
          id
          complete
          ...Todo_todo
        }
      }
    }
    id
    userId
    totalCount
    completedCount
    ...Todo_user
  }
`;

const StyledLabelMark = styled.label`
  display: none;
`;
const TodoList = (props: Props) => {
  const environment = useRelayEnvironment();
  const user = useFragment(fragmentSpecs, props.user);
  const {todos, completedCount, totalCount, userId} = user;
  const handleMarkAllChange = (e: SyntheticEvent<HTMLInputElement>) => {
    const complete = e.currentTarget.checked;

    if (todos) {
      MarkAllTodosMutation.commit(environment, complete, todos, user);
    }
  };

  const nodes: ReadonlyArray<Node> =
    todos && todos.edges
      ? todos.edges
          .filter(isNotNull)
          .map((edge: Edge): NullableNode => edge.node)
          .filter(isNotNull)
      : [];

  return (
    <StyledSection>
      <StyledInput
        checked={totalCount === completedCount}
        onChange={handleMarkAllChange}
        type="checkbox"
      />

      <StyledLabelMark htmlFor="toggle-all">
        Mark all as complete
      </StyledLabelMark>

      <StyledList>
        {nodes.map((node: Node) => (
          <Todo key={node.id} todo={node} user={user} />
        ))}
      </StyledList>
    </StyledSection>
  );
};

export default TodoList;
