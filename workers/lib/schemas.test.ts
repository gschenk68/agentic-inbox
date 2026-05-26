import assert from "node:assert/strict";
import test from "node:test";

import { SendEmailRequestSchema, SendEmailResponseSchema } from "./schemas";

test("SendEmailRequestSchema accepts valid html and text payloads", () => {
	assert.deepEqual(
		SendEmailRequestSchema.parse({
			to: "to@example.com",
			from: "from@example.com",
			subject: "Hello",
			html: "<p>Hello</p>",
		}),
		{
			to: "to@example.com",
			from: "from@example.com",
			subject: "Hello",
			html: "<p>Hello</p>",
		},
	);

	assert.deepEqual(
		SendEmailRequestSchema.parse({
			to: ["to@example.com", "cc@example.com"],
			cc: "copy@example.com",
			from: { email: "from@example.com", name: "Sender" },
			subject: "Hello",
			text: "Hello",
			attachments: [
				{
					content: "SGVsbG8=",
					filename: "hello.txt",
					type: "text/plain",
					disposition: "attachment",
				},
			],
		}),
		{
			to: ["to@example.com", "cc@example.com"],
			cc: "copy@example.com",
			from: { email: "from@example.com", name: "Sender" },
			subject: "Hello",
			text: "Hello",
			attachments: [
				{
					content: "SGVsbG8=",
					filename: "hello.txt",
					type: "text/plain",
					disposition: "attachment",
				},
			],
		},
	);
});

test("SendEmailRequestSchema rejects missing bodies and invalid emails", () => {
	assert.equal(
		SendEmailRequestSchema.safeParse({
			to: "to@example.com",
			from: "from@example.com",
			subject: "Hello",
		}).success,
		false,
	);

	assert.equal(
		SendEmailRequestSchema.safeParse({
			to: ["valid@example.com", "invalid-email"],
			from: "from@example.com",
			subject: "Hello",
			text: "Hello",
		}).success,
		false,
	);
});

test("SendEmailResponseSchema requires id and status strings", () => {
	assert.deepEqual(SendEmailResponseSchema.parse({ id: "email-1", status: "sent" }), {
		id: "email-1",
		status: "sent",
	});
	assert.equal(SendEmailResponseSchema.safeParse({ id: "email-1", status: 200 }).success, false);
});
