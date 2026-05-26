/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import { Folders } from "../../shared/folders";
import {
	SenderValidationError,
	buildQuotedReplyBlock,
	buildReferencesChain,
	buildThreadingHeaders,
	escapeHtml,
	formatEmailDate,
	generateMessageId,
	getFullEmail,
	getFullThread,
	resolveOriginalEmail,
	stripHtmlToText,
	textToHtml,
	validateSender,
} from "./email-helpers";

test("validateSender normalizes values and rejects invalid senders", () => {
	assert.deepEqual(
		validateSender(
			["USER@example.com", "Second@example.com"],
			{ email: "MAILBOX@example.com", name: "Mailbox" },
			"mailbox@example.com",
		),
		{
			toStr: "user@example.com, second@example.com",
			fromEmail: "mailbox@example.com",
			fromDomain: "example.com",
		},
	);

	assert.throws(
		() => validateSender("to@example.com", "other@example.com", "mailbox@example.com"),
		(error: unknown) =>
			error instanceof SenderValidationError &&
			error.message === "From address must match the mailbox email address",
	);
	assert.throws(
		() => validateSender("to@example.com", "not-an-email", "not-an-email"),
		(error: unknown) =>
			error instanceof SenderValidationError &&
			error.message === "Invalid sender email address",
	);
});

test("generateMessageId returns both a uuid and RFC 2822-style message id", (t) => {
	t.mock.method(globalThis.crypto, "randomUUID", () => "uuid-123");

	assert.deepEqual(generateMessageId("example.com"), {
		messageId: "uuid-123",
		outgoingMessageId: "uuid-123@example.com",
	});
});

test("buildReferencesChain handles existing, missing, and malformed references", () => {
	assert.deepEqual(
		buildReferencesChain({
			id: "email-1",
			date: "2026-04-15T00:00:00.000Z",
			subject: "Hello",
			sender: "sender@example.com",
			recipient: "to@example.com",
			read: false,
			starred: false,
			message_id: "msg-1",
			email_references: '["ref-1","ref-2"]',
			thread_id: "thread-1",
		}),
		{
			originalMsgId: "msg-1",
			references: ["ref-1", "ref-2", "msg-1"],
			threadId: "thread-1",
		},
	);

	assert.deepEqual(
		buildReferencesChain({
			id: "email-2",
			date: "2026-04-15T00:00:00.000Z",
			subject: "Hello",
			sender: "sender@example.com",
			recipient: "to@example.com",
			read: false,
			starred: false,
			email_references: "not-json",
		}),
		{
			originalMsgId: "email-2",
			references: ["email-2"],
			threadId: "email-2",
		},
	);
});

test("buildThreadingHeaders wraps message ids in angle brackets", () => {
	assert.deepEqual(buildThreadingHeaders("msg-1", ["ref-1", "ref-2"]), {
		"In-Reply-To": "<msg-1>",
		References: "<ref-1> <ref-2>",
	});
	assert.deepEqual(buildThreadingHeaders("msg-1", []), {
		"In-Reply-To": "<msg-1>",
	});
});

test("resolveOriginalEmail follows in_reply_to only for drafts", async () => {
	const original = { id: "original-1" };
	const stub = {
		getEmail: async (id: string) => (id === "original-1" ? original : null),
	};

	assert.equal(
		await resolveOriginalEmail(stub as never, {
			id: "draft-1",
			date: "2026-04-15T00:00:00.000Z",
			subject: "Draft",
			sender: "sender@example.com",
			recipient: "to@example.com",
			read: false,
			starred: false,
			folder_id: Folders.DRAFT,
			in_reply_to: "original-1",
		}),
		original,
	);

	const sent = {
		id: "sent-1",
		date: "2026-04-15T00:00:00.000Z",
		subject: "Sent",
		sender: "sender@example.com",
		recipient: "to@example.com",
		read: false,
		starred: false,
		folder_id: Folders.SENT,
		in_reply_to: "original-1",
	};
	assert.equal(await resolveOriginalEmail(stub as never, sent), sent);
});

test("HTML helper functions escape and sanitize quoted content", () => {
	assert.equal(escapeHtml(`Tom & <Jerry> "O'Malley"`), "Tom &amp; &lt;Jerry&gt; &quot;O&#39;Malley&quot;");
	assert.equal(
		textToHtml("Line 1\nLine <2>"),
		'<div style="white-space:pre-wrap">Line 1<br>Line &lt;2&gt;</div>',
	);
	assert.equal(
		stripHtmlToText('<style>.x{}</style><script>alert(1)</script><p>Hello <strong>there</strong></p>'),
		"Hello there",
	);
	assert.equal(buildQuotedReplyBlock({ body: "" }), "");

	const quoted = buildQuotedReplyBlock({
		date: "2026-04-15T15:42:00.000Z",
		sender: '<Admin "Ops">',
		body: '<script>alert(1)</script><p>Hello <b>team</b></p>',
	});

	assert.ok(
		quoted.includes(
			`On ${formatEmailDate("2026-04-15T15:42:00.000Z")}, &lt;Admin &quot;Ops&quot;&gt; wrote:`,
		),
	);
	assert.ok(!quoted.includes("<script>"));
	assert.ok(quoted.includes("Hello team"));
});

test("getFullEmail returns body_html and plain-text body", async () => {
	const stub = {
		getEmail: async (emailId: string) =>
			emailId === "email-1"
				? {
						id: "email-1",
						date: "2026-04-15T00:00:00.000Z",
						subject: "Hello",
						sender: "sender@example.com",
						recipient: "to@example.com",
						read: false,
						starred: false,
						body: "<p>Hello <b>world</b></p>",
					}
				: null,
	};

	assert.equal(await getFullEmail(stub as never, "missing"), null);
	assert.deepEqual(await getFullEmail(stub as never, "email-1"), {
		id: "email-1",
		date: "2026-04-15T00:00:00.000Z",
		subject: "Hello",
		sender: "sender@example.com",
		recipient: "to@example.com",
		read: false,
		starred: false,
		body: "<p>Hello <b>world</b></p>",
		body_text: "Hello world",
		body_html: "<p>Hello <b>world</b></p>",
	});
});

test("getFullThread sorts messages chronologically and adds plain-text bodies", async () => {
	const stub = {
		getThreadEmails: async () => [
			{
				id: "email-2",
				date: "2026-04-16T00:00:00.000Z",
				subject: "Later",
				sender: "sender@example.com",
				recipient: "to@example.com",
				read: true,
				starred: false,
				body: "<p>Later</p>",
			},
			{
				id: "email-1",
				date: "2026-04-15T00:00:00.000Z",
				subject: "Earlier",
				sender: "sender@example.com",
				recipient: "to@example.com",
				read: false,
				starred: false,
				body: "<p>Earlier</p>",
			},
		],
	};

	assert.deepEqual(await getFullThread(stub as never, "thread-1"), {
		thread_id: "thread-1",
		message_count: 2,
		messages: [
			{
				id: "email-1",
				date: "2026-04-15T00:00:00.000Z",
				subject: "Earlier",
				sender: "sender@example.com",
				recipient: "to@example.com",
				read: false,
				starred: false,
				body: "<p>Earlier</p>",
				body_text: "Earlier",
			},
			{
				id: "email-2",
				date: "2026-04-16T00:00:00.000Z",
				subject: "Later",
				sender: "sender@example.com",
				recipient: "to@example.com",
				read: true,
				starred: false,
				body: "<p>Later</p>",
				body_text: "Later",
			},
		],
	});
});
