const QueryApp = graphql`
query QueryAppQuery($userId: String) {
  ...TodoApp_user
}
`;

export default QueryApp;