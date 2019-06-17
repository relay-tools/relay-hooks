const QueryApp = graphql`
query QueryAppQuery($userId: String) {
  user(id: $userId) {
    ...TodoApp_data
  }
}
`;

export default QueryApp;