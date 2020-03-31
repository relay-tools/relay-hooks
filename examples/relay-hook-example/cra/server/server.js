var express = require('express');
const {ApolloServer, gql} = require('apollo-server-express');

// Construct a schema, using GraphQL schema language
var typeDefs = gql`
  type Entry {
    id: ID!
    text: String
  }

  input CreateEntryInput {
    clientMutationId: String
    id: ID!
    text: String!
  }

  type CreateEntryPayload {
    clientMutationId: String
    entry: Entry
  }

  type Query {
    entries: [Entry]
  }

  type Mutation {
    createEntry(input: CreateEntryInput): CreateEntryPayload
  }
`;

// The root provides a resolver function for each API endpoint
var resolvers = {
  Query: {
    entries: getEntries,
  },
  Mutation: {
    createEntry: createEntry,
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

var app = express();

server.applyMiddleware({app});

app.listen(3003);
console.log('Running a GraphQL API server at localhost:3003');

let entries = [];

function getEntries() {
  return entries;
}

function createEntry(parent, args, context) {
  const {id, text} = args.input;
  const entry = {id, text};

  console.log('creating the entry: ', entry);
  entries.push(entry);
  return {
    clientMutationId: args.input.clientMutationId,
    entry,
  };
}
