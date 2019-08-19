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

import MarkAllTodosMutation, {mutation} from '../mutations/MarkAllTodosMutation';
import Todo from './Todo';

import React from 'react';
import {createFragmentContainer, graphql, type RelayProp} from 'react-relay';
import QueryApp from '../query/QueryApp';
import type {TodoList_user} from 'relay/TodoList_user.graphql';
import { useFragment, useMutation } from 'relay-hooks';
type Todos = $NonMaybeType<$ElementType<TodoList_user, 'todos'>>;
type Edges = $NonMaybeType<$ElementType<Todos, 'edges'>>;
type Edge = $NonMaybeType<$ElementType<Edges, number>>;
type Node = $NonMaybeType<$ElementType<Edge, 'node'>>;

type Props = {|
  +relay: RelayProp,
  +user: TodoList_user,
|};

const fragmentSpec = graphql`
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

const TodoList = (props) => {
  const { refetch, user } = props;
  //const { refetch } = props;
  //const user = useFragment(fragmentSpec, props.user);
  const  { todos, completedCount, totalCount, userId } = user;
  const [mutate] = useMutation(mutation);
  const handleMarkAllChange = (e: SyntheticEvent<HTMLInputElement>) => {
    const complete = e.currentTarget.checked;

    if (todos) {
      MarkAllTodosMutation.commit(mutate, complete, todos, user);
    }
  };

  const handlerRefetch = () => {
    const response = refetch(QueryApp,
      {userId: "you"},  
      null,  
      () => { console.log('Refetch done') },
      {force: true},  
    );
    //response.dispose();

  }

  const nodes: $ReadOnlyArray<Node> =
    todos && todos.edges
      ? todos.edges
          .filter(Boolean)
          .map((edge: Edge) => edge.node)
          .filter(Boolean)
      : [];

  return (
    <section className="main">
      <input
        checked={totalCount === completedCount}
        className="toggle-all"
        onChange={handleMarkAllChange}
        type="checkbox"
      />

      <label htmlFor="toggle-all">Mark all as complete</label>

      <ul className="todo-list">
        {nodes.map((node: Node) => (
          <Todo key={node.id} todo={node} user={user} />
        ))}
      </ul>
      <button onClick={handlerRefetch} 
      className="refetch" >
          Refetch
          </button>
    </section>
  );
};
//export default TodoList;

export default createFragmentContainer(TodoList, {
  // This `list` fragment corresponds to the prop named `list` that is
  // expected to be populated with server data by the `<TodoList>` component.
  user: graphql`
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
`,
});
