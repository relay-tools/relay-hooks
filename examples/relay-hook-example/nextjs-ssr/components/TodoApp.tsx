import React from 'react';
import AddTodoMutation from '../mutations/AddTodoMutation';
import TodoList from './TodoList';
import TodoListFooter from './TodoListFooter';
import TodoTextInput from './TodoTextInput';
import styled from 'styled-components';
import Header from './Header';
import {useRefetch, useRelayEnvironment, graphql} from 'relay-hooks';
import {TodoApp_user$key} from '../__generated__/relay/TodoApp_user.graphql';
//import {TodoApp_user$key} from 'relay/TodoApp_user.graphql';
//import TodoApp, { fragmentSpec } from './components/TodoApp';
export const QUERY_APP = graphql`
  query TodoAppQuery($userId: String) {
    ...TodoApp_user
  }
`;

const StyledSection = styled.section`
  flex: 1;
  background: #fff;
  margin: 130px 0 40px 0;
  position: relative;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
  h1 {
    position: absolute;
    top: -155px;
    width: 100%;
    font-size: 100px;
    font-weight: 100;
    text-align: center;
    color: rgba(175, 47, 47, 0.15);
    -webkit-text-rendering: optimizeLegibility;
    -moz-text-rendering: optimizeLegibility;
    text-rendering: optimizeLegibility;
  }
`;

const StyledButton = styled.button`
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

const StyledDivButton = styled.div`
  display: flex;
  background: #fff;
`;

const isServer = typeof window === 'undefined';
type Props = {
  query: TodoApp_user$key;
  retry: () => void;
};

const fragmentSpec = graphql`
  fragment TodoApp_user on Query {
    user(id: $userId) {
      id
      userId
      totalCount
      completedCount
      ...TodoListFooter_user
      ...TodoList_user
    }
  }
`;

export function isNotNull<T>(it: T): it is NonNullable<T> {
  return it != null;
}

const AppTodo = (props: Props) => {
  const environment = useRelayEnvironment();
  const [{user}, refetch] = useRefetch(fragmentSpec, props.query);

  if (!user) {
    return <div />;
  }

  const handleTextInputSave = (text: string) => {
    AddTodoMutation.commit(environment, text, user);
    return;
  };

  const hasTodos = user.totalCount > 0;
  console.log('renderer');
  return (
    <React.Fragment>
      <Header userId={user.userId} />
      <StyledSection>
        <header>
          <h1>todos</h1>

          <TodoTextInput
            edit
            onSave={handleTextInputSave}
            placeholder="What needs to be done?"
          />
        </header>

        <TodoList user={user} />
        {hasTodos && <TodoListFooter user={user} />}
        <StyledDivButton>
          <StyledButton onClick={props.retry}>Retry</StyledButton>
        </StyledDivButton>
        <StyledDivButton>
          <StyledButton
            onClick={() => {
              refetch(QUERY_APP, {
                userId: user.userId === 'me' ? 'you' : 'me',
              });
            }}>
            Change User
          </StyledButton>
        </StyledDivButton>
        <StyledFooter>
          <StyledP>Double-click to edit a todo</StyledP>
        </StyledFooter>
      </StyledSection>
    </React.Fragment>
  );
};

export default AppTodo;
