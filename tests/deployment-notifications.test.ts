import assert from "node:assert/strict";
import test from "node:test";
import worker, {
  buildNotification,
  deliverNotification,
} from "../workers/deployment-notifications/index";

const env = {
  DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/test-token",
  ACCOUNT_ID: "account",
  WORKER_NAME: "tier-list-maker",
  BRANCH: "main",
};
const event = {
  type: "cf.workersBuilds.worker.build.succeeded",
  source: { workerName: "tier-list-maker" },
  payload: {
    buildUuid: "build-123",
    buildTriggerMetadata: { branch: "main", commitHash: "abcdef123456" },
  },
};

test("sends distinct success and failure notifications with build logs", () => {
  const success = buildNotification(event, env)!;
  const failure = buildNotification(
    { ...event, type: "cf.workersBuilds.worker.build.failed" },
    env,
  )!;
  assert.match(success.embeds[0].title, /succeeded/);
  assert.match(failure.embeds[0].title, /failed/);
  assert.match(success.embeds[0].url, /\/builds\/build-123$/);
  assert.deepEqual(success.allowed_mentions, { parse: [] });
});

test("ignores unrelated workers, preview branches and nonterminal events", () => {
  for (const other of [
    { ...event, source: { workerName: "other-worker" } },
    { ...event, type: "cf.workersBuilds.worker.build.started" },
    { ...event, type: "cf.workersBuilds.worker.build.canceled" },
    {
      ...event,
      payload: {
        ...event.payload,
        buildTriggerMetadata: { branch: "preview" },
      },
    },
  ]) {
    assert.equal(buildNotification(other, env), null);
  }
});

test("waits for Discord confirmation and reports failed sends without secrets", async () => {
  let sent = false;
  const send = (async (input, init) => {
    assert.equal(new URL(String(input)).searchParams.get("wait"), "true");
    assert.equal(init?.method, "POST");
    sent = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  await deliverNotification(event, env, send);
  assert.equal(sent, true);
  await assert.rejects(
    deliverNotification(
      event,
      env,
      async () => new Response("secret response", { status: 429 }),
    ),
    { message: "Discord delivery failed (HTTP 429)" },
  );
});

test("failed delivery retries while irrelevant events are acknowledged", async () => {
  const outcomes: string[] = [];
  await worker.queue(
    {
      messages: [
        {
          body: event,
          ack: () => outcomes.push("unexpected ack"),
          retry: ({ delaySeconds }) => outcomes.push(`retry ${delaySeconds}`),
        },
        {
          body: { ...event, type: "cf.workersBuilds.worker.build.started" },
          ack: () => outcomes.push("ack"),
          retry: () => outcomes.push("unexpected retry"),
        },
      ],
    },
    { ...env, DISCORD_WEBHOOK_URL: "" },
  );
  assert.deepEqual(outcomes, ["retry 60", "ack"]);
});
