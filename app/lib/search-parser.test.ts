/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import { parseSearchQuery } from "./search-parser";

test("parseSearchQuery extracts operators and preserves free-text terms", () => {
	const parsed = parseSearchQuery(
		'from:"Jane Doe" subject:"Quarterly Update" in:Inbox is:unread has:attachment before:2026-04-01 after:2026-03-01 project status',
	);

	assert.deepEqual(parsed, {
		query: "project status",
		from: "Jane Doe",
		subject: "Quarterly Update",
		folder: "inbox",
		is_read: false,
		has_attachment: true,
		date_start: "2026-03-01T00:00:00.000Z",
		date_end: "2026-04-01T00:00:00.000Z",
	});
});

test("parseSearchQuery uses the last matching operator value", () => {
	const parsed = parseSearchQuery("from:first@example.com from:second@example.com is:read is:unstarred");

	assert.equal(parsed.query, "");
	assert.equal(parsed.from, "second@example.com");
	assert.equal(parsed.is_read, true);
	assert.equal(parsed.is_starred, false);
});

test("parseSearchQuery removes unsupported operators from the free-text query", () => {
	const parsed = parseSearchQuery("is:important has:image roadmap");

	assert.deepEqual(parsed, { query: "roadmap" });
});

test("parseSearchQuery leaves unmatched text in the query", () => {
	const parsed = parseSearchQuery('hello before:not-a-date from:"');

	assert.equal(parsed.query, 'hello from:"');
	assert.equal(parsed.date_end, undefined);
});
