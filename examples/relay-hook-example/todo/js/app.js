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

//import 'todomvc-common';

import * as React from 'react';

import { useState } from 'react';

import { useQuery, RelayEnvironmentProvider, useQueryExp } from 'relay-hooks';
import {
  Environment,
  Network,
  RecordSource,
  Store,
  type RequestNode,
  type Variables,
} from 'relay-runtime';

import TodoApp, { fragmentSpec } from './components/TodoApp';
//import { useQuery, RelayEnvironmentProvider } from 'relay-hooks';

import TodoTextInput from './components/TodoTextInput';
import type { appQueryResponse } from 'relay/appQuery.graphql';
import QueryApp from './query/QueryApp';
import RelayNetworkLogger from 'relay-runtime/lib/RelayNetworkLogger'

async function fetchQuery(
  operation: RequestNode,
  variables: Variables,
): Promise<{}> {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
  });

  return response.json();
}

const modernEnvironment: Environment = new Environment({
  network: Network.create(RelayNetworkLogger.wrapFetch(fetchQuery, () => '')),
  store: new Store(new RecordSource()),
});


const AppTodo = function (appProps) {

  const [userId, setUserId] = useState('me');

  console.log("renderer apptodo", userId)

  const handleTextUser = (text: string) => {
    console.log("change user", text)
    setUserId(text);
    return;
  };

  return <div>
    <div className="apptodo">
      <h2>who is the user?</h2>
      <div id="radioGroup">
        <div className="wrap">
          <input type="radio" name="user" id="userMe" value="me" checked={userId === 'me'} onChange={() => handleTextUser('me')} />
          <label htmlFor="userMe">Me</label>
        </div>

        <div className="wrap">
          <input type="radio" name="user" id="userYou" value="you" checked={userId === 'you'} onChange={() => handleTextUser('you')} />
          <label htmlFor="userYou">You</label>
        </div>
      </div>
    </div>
    <LayoutTodo userId={userId} />
  </div>


}
const isServer = typeof window === 'undefined';
const LayoutTodo = ({ userId }) => {
  console.log("LayoutTodo", userId, isServer);
  useQueryExp
  const { props, error, retry, cached } = useQueryExp(
    QueryApp,
    { userId },
    {
      fetchPolicy: "store-or-network"
    }
  );
  /*const { props, error, retry, cached } = useQuery({
    query: QueryApp,
    variables: {
      // Mock authenticated ID that matches database
      userId,
    },
    dataFrom: "STORE_THEN_NETWORK"
  });*/

  console.log("renderer", props, cached)
  if (props && props.user) {
    return <TodoApp user={props.user} userId={userId} retry={retry} />;

  } else if (error) {
    return <div>{error.message}</div>;
  }
  return <div>loading</div>;
}

const App = <RelayEnvironmentProvider environment={modernEnvironment}>
  <AppTodo />
</RelayEnvironmentProvider>;

export default App;



