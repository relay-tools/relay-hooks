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

import {useQuery, RelayEnvironmentProvider} from 'relay-hooks';
import {
  Environment,
  Network,
  RecordSource,
  Store,
  type RequestNode,
  type Variables,
} from 'relay-runtime';

import TodoApp, {fragmentSpec} from './components/TodoApp';
import type {appQueryResponse} from 'relay/appQuery.graphql';
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
  network: Network.create(RelayNetworkLogger.wrapFetch (fetchQuery, () => '')),
  store: new Store(new RecordSource()),
});


const AppTodo = function (appProps)  {
  const {props, error, retry, cached} = useQuery({ query: QueryApp,
    variables: {
      // Mock authenticated ID that matches database
      userId: 'me',
    }});

  if (props && props.user) {
    return <TodoApp user={props.user} retry={retry}/>;
  } else if (error) {
    return <div>{error.message}</div>;
  }
  return <div>loading</div>;

}

const App = <RelayEnvironmentProvider environment={modernEnvironment}>
<AppTodo/>
</RelayEnvironmentProvider>;

export default App;



