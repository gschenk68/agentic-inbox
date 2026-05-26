import assert from "node:assert/strict";
import test from "node:test";

import { storeAttachments } from "./attachments";

test("storeAttachments returns an empty list when no attachments are provided", async () => {
	const stored = await storeAttachments(
		{
			put: async () => undefined,
		} as never,
		"email-1",
		undefined,
	);

	assert.deepEqual(stored, []);
});

test("storeAttachments sanitizes filenames, stores bytes, and returns metadata", async (t) => {
	t.mock.method(globalThis.crypto, "randomUUID", () => "attachment-1");

	const puts: Array<{ key: string; bytes: Uint8Array }> = [];
	const bucket = {
		put: async (key: string, bytes: Uint8Array) => {
			puts.push({ key, bytes });
		},
	};

	const [stored] = await storeAttachments(bucket as never, "email-1", [
		{
			content: "SGVsbG8=",
			filename: 'inva/lid:"name?.txt',
			type: "text/plain",
			disposition: "inline",
			contentId: "<cid-123>",
		},
	]);

	assert.equal(puts.length, 1);
	assert.equal(puts[0].key, "attachments/email-1/attachment-1/inva_lid__name_.txt");
	assert.equal(Buffer.from(puts[0].bytes).toString("utf8"), "Hello");
	assert.deepEqual(stored, {
		id: "attachment-1",
		email_id: "email-1",
		filename: "inva_lid__name_.txt",
		mimetype: "text/plain",
		size: 5,
		content_id: "<cid-123>",
		disposition: "inline",
	});
});
