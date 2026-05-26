import assert from "node:assert/strict";
import test from "node:test";

import {
	formatDetailDate,
	formatListDate,
	formatQuotedDate,
	formatShortDate,
} from "./dates";

const RealDate = Date;

function withFixedNow(now: string, fn: () => void) {
	const fixedNow = new RealDate(now);

	class MockDate extends RealDate {
		constructor(value?: string | number | Date) {
			if (arguments.length === 0) {
				super(fixedNow);
				return;
			}
			super(value as string | number | Date);
		}

		static now() {
			return fixedNow.getTime();
		}

		static parse = RealDate.parse;
		static UTC = RealDate.UTC;
	}

	globalThis.Date = MockDate as unknown as DateConstructor;
	try {
		fn();
	} finally {
		globalThis.Date = RealDate;
	}
}

test("formatListDate formats today's messages as a time", () => {
	withFixedNow("2026-04-15T17:30:00.000Z", () => {
		const input = "2026-04-15T08:05:00.000Z";
		const expected = new RealDate(input).toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		});

		assert.equal(formatListDate(input), expected);
	});
});

test("formatListDate formats older messages in the current year without a year", () => {
	withFixedNow("2026-10-15T17:30:00.000Z", () => {
		const input = "2026-04-15T08:05:00.000Z";
		const expected = new RealDate(input).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});

		assert.equal(formatListDate(input), expected);
	});
});

test("formatListDate formats prior-year messages with a year and leaves invalid dates unchanged", () => {
	withFixedNow("2026-10-15T17:30:00.000Z", () => {
		const input = "2025-04-15T08:05:00.000Z";
		const expected = new RealDate(input).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

		assert.equal(formatListDate(input), expected);
		assert.equal(formatListDate("not-a-date"), "not-a-date");
	});
});

test("detail, short, and quoted date helpers use the expected formatting", () => {
	const input = "2026-04-15T15:42:00.000Z";

	assert.equal(
		formatDetailDate(input),
		new RealDate(input).toLocaleDateString(undefined, {
			weekday: "short",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		}),
	);
	assert.equal(
		formatShortDate(input),
		new RealDate(input).toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		}),
	);
	assert.equal(
		formatQuotedDate(input),
		new RealDate(input).toLocaleString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		}),
	);
	assert.equal(formatQuotedDate(undefined), "");
	assert.equal(formatQuotedDate("not-a-date"), "not-a-date");
});
