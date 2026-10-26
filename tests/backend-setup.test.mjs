import { test } from "node:test";
import assert from "node:assert/strict";
import {
  provision,
  readConfig,
  waitForReady,
  setupScopes,
  runtimeScopes,
} from "../scripts/setup-appwrite.mjs";

const config = {
  databaseId: "db",
  usersTableId: "users",
  filesTableId: "files",
  bucketId: "bucket",
  projectId: "project",
};
function adapters() {
  const data = new Map();
  const mutations = [];
  const queries = [];
  const read = async (key) => {
    if (!data.has(key))
      throw Object.assign(new Error("Missing"), { code: 404 });
    return data.get(key);
  };
  const write = async (key, params) => {
    mutations.push(key);
    const result = {
      ...params,
      $permissions: params.permissions || [],
      status: "available",
    };
    data.set(key, result);
    return result;
  };
  const columnKey = ({ tableId, key }) => `${tableId}.column.${key}`;
  const tablesDB = {
    get: () => read("database"),
    create: (params) => write("database", params),
    getTable: ({ tableId }) => read(`table.${tableId}`),
    createTable: (params) => write(`table.${params.tableId}`, params),
    getColumn: (params) => read(columnKey(params)),
    getIndex: ({ tableId, key }) => read(`${tableId}.index.${key}`),
    createIndex: (params) =>
      write(`${params.tableId}.index.${params.key}`, params),
    listRows: async (params) => {
      queries.push(params);
      return { rows: [], total: 0 };
    },
  };
  for (const method of [
    "createVarcharColumn",
    "createEmailColumn",
    "createEnumColumn",
    "createIntegerColumn",
    "createRelationshipColumn",
  ]) {
    tablesDB[method] = (params) =>
      write(
        columnKey(params),
        method === "createRelationshipColumn"
          ? {
              ...params,
              type: "relationship",
              relationType: params.type,
              relatedTable: params.relatedTableId,
            }
          : params,
      );
  }
  const storage = {
    getBucket: () => read("bucket"),
    createBucket: (params) => write("bucket", params),
  };
  return { data, mutations, queries, tablesDB, storage, log: () => {} };
}

test("provisioning creates the schema and private bucket and checks app queries", async () => {
  const fake = adapters();
  await provision(config, { ...fake, apply: true });
  assert.deepEqual(fake.data.get("bucket").$permissions, []);
  assert.equal(fake.data.get("bucket").fileSecurity, true);
  assert.equal(fake.data.get("bucket").maximumFileSize, 4 * 1024 * 1024);
  assert.deepEqual(fake.data.get("table.users").$permissions, []);
  assert.equal(fake.data.get("files.column.owner").relatedTableId, "users");
  assert.equal(fake.data.get("files.column.owner").relationType, "manyToOne");
  assert.equal(fake.data.get("files.column.users").array, true);
  assert.equal(fake.data.get("users.index.email_unique").type, "unique");
  assert.equal(fake.queries.length, 3);
  assert.equal(fake.mutations.includes("files.index.users_filter"), false);
});

test("setup can be resumed or rerun without recreating resources", async () => {
  const fake = adapters();
  await provision(config, { ...fake, apply: true });
  const count = fake.mutations.length;
  await provision(config, { ...fake, apply: true });
  await provision(config, { ...fake, apply: false });
  assert.equal(fake.mutations.length, count);
});

test("check mode never creates a missing resource", async () => {
  const fake = adapters();
  await assert.rejects(provision(config, fake), /database is missing/);
  assert.equal(fake.mutations.length, 0);
});

test("existing public permissions are rejected rather than silently widened or changed", async () => {
  const fake = adapters();
  await provision(config, { ...fake, apply: true });
  fake.data.get("table.users").$permissions = ['read("any")'];
  const count = fake.mutations.length;
  await assert.rejects(
    provision(config, { ...fake, apply: true }),
    /no client permissions/,
  );
  assert.equal(fake.mutations.length, count);
});

test("failed or timed-out schema jobs do not get reported as ready", async () => {
  await assert.rejects(
    waitForReady(
      async () => ({ status: "failed", error: "invalid index" }),
      "index",
    ),
    /invalid index/,
  );
  await assert.rejects(
    waitForReady(async () => ({ status: "processing" }), "column", {
      timeout: 0,
    }),
    /Timed out/,
  );
});

test("missing config names the variable without printing a credential", () => {
  assert.throws(() => readConfig({}), /NEXT_PUBLIC_APPWRITE_ENDPOINT/);
  assert.ok(runtimeScopes.every((scope) => setupScopes.includes(scope)));
  assert.equal(setupScopes.includes("keys.write"), false);
});
