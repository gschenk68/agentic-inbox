/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

import {
	FOLDER_DISPLAY_NAMES,
	FOLDER_TOOL_DESCRIPTION,
	Folders,
	MOVE_FOLDER_TOOL_DESCRIPTION,
	SYSTEM_FOLDER_IDS,
	getFolderDisplayName,
} from "./folders";

test("folder constants expose the expected system folders in sidebar order", () => {
	assert.deepEqual(SYSTEM_FOLDER_IDS, [
		Folders.INBOX,
		Folders.SENT,
		Folders.DRAFT,
		Folders.ARCHIVE,
		Folders.TRASH,
	]);
	assert.equal(FOLDER_TOOL_DESCRIPTION, "Folder to list: inbox, sent, draft, archive, trash");
	assert.equal(MOVE_FOLDER_TOOL_DESCRIPTION, "Target folder: inbox, sent, draft, archive, trash");
});

test("getFolderDisplayName uses canonical names case-insensitively", () => {
	assert.equal(getFolderDisplayName("INBOX"), FOLDER_DISPLAY_NAMES[Folders.INBOX]);
	assert.equal(getFolderDisplayName("Spam"), FOLDER_DISPLAY_NAMES[Folders.SPAM]);
});

test("getFolderDisplayName falls back to capitalizing the raw folder id", () => {
	assert.equal(getFolderDisplayName("custom"), "Custom");
});
