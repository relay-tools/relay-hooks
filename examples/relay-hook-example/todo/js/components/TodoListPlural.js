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
    fragment TodoListPlural_edges on TodoEdge @relay(plural: true) {
          node {
            complete
            id
            text
          }
        }
  `;

const TodoListPlural = (props) => {
  const { refetch } = props;
  const edges = useFragment(fragmentSpec, props.edges);

  const nodes: $ReadOnlyArray<Node> =
  edges  ? edges.map((edge: Edge) => edge.node) : [];

  const handlerRefetch = () => {
    const response = refetch(QueryApp,
      {userId: "you"},  
      null,  
      () => { console.log('Refetch done') },
      {force: true},  
    );
    //response.dispose();

  }

  return (
    <section className="main">

      <label htmlFor="toggle-all">Mark all as complete</label>

      <ul className="todo-list">
        {nodes.map((node: Node) => (
          <Todo key={node.id} todo={node} />
        ))}
      </ul>
      <button onClick={handlerRefetch} 
      className="refetch" >
          Refetch
          </button>
    </section>
  );
};

export default TodoListPlural;
