import { CosmosClient, Container } from "@azure/cosmos";
import config from "../config";

const {
  COSMOS_DATABASE_ID,
  COSMOS_PRIMARY_KEY,
  COSMOS_URI
} = config;

const client = new CosmosClient({
  endpoint: COSMOS_URI,
  key: COSMOS_PRIMARY_KEY
});

interface containers {
  sloganMembers?: Container,
  sloganTemplates?: Container,
  events?: Container
}

let containers: containers = {};

export async function initializeDb () {
  const { database } = await client.databases.createIfNotExists({ id: COSMOS_DATABASE_ID });
  const { container: sloganMembers } = await database.containers.createIfNotExists(
    { id: "slogan-members" },
    { offerThroughput: 400 }
  );
  containers.sloganMembers = sloganMembers;
  const { container: sloganTemplates } = await database.containers.createIfNotExists(
    { id: "slogan-templates" },
    { offerThroughput: 400 }
  );
  containers.sloganTemplates = sloganTemplates;
  const { container: events } = await database.containers.createIfNotExists(
    { id: "events" },
    { offerThroughput: 400 }
  );
  containers.events = events;
}

export default containers;
