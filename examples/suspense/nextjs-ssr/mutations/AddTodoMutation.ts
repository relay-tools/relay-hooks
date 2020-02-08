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

import {
  commitMutation,
  graphql,
  //RecordProxy,
  //RecordSourceSelectorProxy,
} from 'relay-hooks';

import {ConnectionHandler, IEnvironment} from 'relay-runtime';

import {v4 as uuid} from 'uuid';

const mutation = graphql`
  mutation AddTodoMutation($input: AddTodoInput!) {
    addTodo(input: $input) {
      todoEdge {
        __typename
        cursor
        node {
          complete
          id
          text
        }
      }
      user {
        id
        totalCount
      }
    }
  }
`;

let tempID = 0;

function sharedUpdater(store: any, user: any, newEdge: any) {
  // Get the current user record from the store
  const userProxy = store.get(user.id);

  // Get the user's Todo List using ConnectionHandler helper
  const conn = ConnectionHandler.getConnection(
    userProxy,
    'TodoList_todos', // This is the connection identifier, defined here
    // https://github.com/relayjs/relay-examples/blob/master/todo/js/components/TodoList.js#L76
  );
  if (!conn) {
    return;
  }

  // Insert the new todo into the Todo List connection
  ConnectionHandler.insertEdgeAfter(conn, newEdge);
}

function commit(environment: IEnvironment, text: string, user: any) {
  //const totalCount = user.totalCount + 1;
  //const idTot = totalCount + user.completedCount;
  const idTodo = uuid();
  const input: any = {
    id: idTodo,
    text,
    userId: user.userId,
    clientMutationId: idTodo,
  };
  const totalCount = user.totalCount + 1;
  const idTot = totalCount + user.completedCount;

  commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    updater: (store: any) => {
      // Get the payload returned from the server
      const payload = store.getRootField('addTodo');

      // Get the edge of the newly created Todo record
      const newEdge = payload.getLinkedRecord('todoEdge');

      // Add it to the user's todo list
      sharedUpdater(store, user, newEdge);
    },
    optimisticUpdater: (store: any) => {
      const id = idTodo;
      const node = store.create(id, 'Todo');
      node.setValue(false, 'complete');
      node.setValue(text, 'text');
      node.setValue(idTodo, 'id');
      const newEdge = store.create('client:newEdge:' + idTodo, 'TodoEdge');
      newEdge.setValue(null, 'cursor');
      newEdge.setLinkedRecord(node, 'node');
      // Add it to the user's todo list
      sharedUpdater(store, user, newEdge);

      // Given that we don't have a server response here,
      // we also need to update the todo item count on the user
      const userRecord = store.get(user.id);
      userRecord.setValue(userRecord.getValue('totalCount') + 1, 'totalCount');
    },
  });
}

export default {commit};
