import assert from "node:assert/strict";
import test from "node:test";
import { routingTeamForDirection } from "../lib/server/lead-notifications.ts";

test("routes consultation directions to role queues without claiming an individual assignee", () => {
  assert.equal(routingTeamForDirection("home"), "design_consulting");
  assert.equal(routingTeamForDirection("designer"), "design_consulting");
  assert.equal(routingTeamForDirection("project"), "project_delivery");
  assert.equal(routingTeamForDirection("channel"), "channel_development");
  assert.equal(routingTeamForDirection("unknown-history-value"), "manual_review");
});
