/**
 * Unit tests for the Oriana Wren timeline engine.
 *
 * Tests cover:
 *   - Date grouping
 *   - Justified layout calculation
 *   - Virtual range computation
 *   - Scrubber entry derivation
 *   - Scroll restoration helpers
 *   - Edge cases: empty media, single item, all same day, unknown dates
 *
 * Behavioral design informed by Immich v3.0.3:
 *   web/src/lib/managers/timeline-manager/timeline-manager.svelte.spec.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// We import the engine directly (pure TS, zero side effects)
import {
  groupMediaByDate,
  computeJustifiedLayout,
  computeTimelineLayout,
  computeVirtualRange,
  computeScrubberEntries,
  formatGroupLabel,
  formatMonthLabel,
  findGroupAtScrollTop,
  scrollRestorationKey,
} from "../src/lib/timeline/engine.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(id, sortDate, width, height) {
  return { id, mediaIndex: 0, sortDate, width, height, aspectRatio: width && height ? width / height : null, mediaType: "image" };
}

function makeItems(dates) {
  return dates.map((sortDate, i) =>
    makeItem(`m${i}`, sortDate, 1200, 900, 4 / 3),
  );
}

const DAY1_ITEMS = [
  makeItem("a", "2026-07-01T10:00:00Z", 1200, 900),
  makeItem("b", "2026-07-01T11:00:00Z", 800, 1200),
  makeItem("c", "2026-07-01T12:00:00Z", 1200, 900),
];

const DAY2_ITEMS = [
  makeItem("d", "2026-07-02T10:00:00Z", 1200, 900),
  makeItem("e", "2026-07-02T11:00:00Z", 1200, 900),
];

const MIXED_ITEMS = [...DAY1_ITEMS, ...DAY2_ITEMS].map((item, i) => ({
  ...item,
  mediaIndex: i,
}));

// ---------------------------------------------------------------------------
// Date grouping
// ---------------------------------------------------------------------------

describe("groupMediaByDate", () => {
  it("returns empty array for empty input", () => {
    const groups = groupMediaByDate([]);
    assert.equal(groups.length, 0);
  });

  it("groups items into correct day buckets", () => {
    const groups = groupMediaByDate(MIXED_ITEMS);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].key, "2026-07-01");
    assert.equal(groups[1].key, "2026-07-02");
    assert.equal(groups[0].mediaIndices.length, 3);
    assert.equal(groups[1].mediaIndices.length, 2);
  });

  it("generates correct month key", () => {
    const groups = groupMediaByDate(MIXED_ITEMS);
    assert.equal(groups[0].monthKey, "2026-07");
    assert.equal(groups[1].monthKey, "2026-07");
  });

  it("handles null sortDate by falling back to epoch", () => {
    const item = makeItem("x", null, 800, 600);
    item.mediaIndex = 0;
    const groups = groupMediaByDate([item]);
    assert.equal(groups.length, 1);
    // epoch key = 1970-01-01
    assert.equal(groups[0].key, "1970-01-01");
  });

  it("single item produces one group", () => {
    const item = { ...DAY1_ITEMS[0], mediaIndex: 0 };
    const groups = groupMediaByDate([item]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].mediaIndices.length, 1);
  });

  it("items spanning months create separate groups", () => {
    const items = makeItems([
      "2026-06-30T23:59:59Z",
      "2026-07-01T00:00:00Z",
    ]).map((item, i) => ({ ...item, mediaIndex: i }));
    const groups = groupMediaByDate(items);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].key, "2026-06-30");
    assert.equal(groups[1].key, "2026-07-01");
    assert.equal(groups[0].monthKey, "2026-06");
    assert.equal(groups[1].monthKey, "2026-07");
  });
});

// ---------------------------------------------------------------------------
// Label formatting
// ---------------------------------------------------------------------------

describe("formatGroupLabel", () => {
  it("formats a known date", () => {
    const label = formatGroupLabel("2026-07-01");
    // Wednesday, 1 July 2026
    assert.ok(label.includes("2026"), `Expected year in: ${label}`);
    assert.ok(label.includes("July") || label.includes("Jul"), `Expected month in: ${label}`);
    assert.ok(label.includes("1"), `Expected day in: ${label}`);
  });

  it("returns key for malformed input", () => {
    assert.equal(formatGroupLabel("not-a-date"), "not-a-date");
  });
});

describe("formatMonthLabel", () => {
  it("formats correctly", () => {
    assert.equal(formatMonthLabel("2026-07"), "July 2026");
    assert.equal(formatMonthLabel("2026-01"), "January 2026");
    assert.equal(formatMonthLabel("2025-12"), "December 2025");
  });
});

// ---------------------------------------------------------------------------
// Justified layout
// ---------------------------------------------------------------------------

describe("computeJustifiedLayout", () => {
  const containerWidth = 1200;
  const opts = { containerWidth, targetRowHeight: 220, gap: 4, headerHeight: 44, groupPaddingBottom: 24 };

  it("returns empty for empty media", () => {
    const rows = computeJustifiedLayout([], opts);
    assert.equal(rows.length, 0);
  });

  it("returns empty for zero containerWidth", () => {
    const rows = computeJustifiedLayout(MIXED_ITEMS, { ...opts, containerWidth: 0 });
    assert.equal(rows.length, 0);
  });

  it("produces rows with cells summing to containerWidth (approx)", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      ...makeItem(`m${i}`, "2026-07-01T10:00:00Z", 1200, 900),
      mediaIndex: i,
    }));
    const rows = computeJustifiedLayout(items, opts);
    assert.ok(rows.length > 0);
    for (const row of rows) {
      const totalWidth = row.cells.reduce((sum, cell) => sum + cell.width, 0) +
        (row.cells.length - 1) * 4; // gap
      // Should be within 1px of containerWidth (accounting for rounding)
      assert.ok(Math.abs(totalWidth - containerWidth) <= 2, `Row width ${totalWidth} should be ~${containerWidth}`);
    }
  });

  it("single item produces one row with one cell", () => {
    const item = { ...makeItem("a", "2026-07-01", 1200, 900), mediaIndex: 0 };
    const rows = computeJustifiedLayout([item], opts);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].cells.length, 1);
  });

  it("cells reference correct mediaIndex", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      ...makeItem(`m${i}`, "2026-07-01T10:00:00Z", 1200, 900),
      mediaIndex: i + 10, // offset to verify
    }));
    const rows = computeJustifiedLayout(items, opts);
    const allCells = rows.flatMap((r) => r.cells);
    const indices = allCells.map((c) => c.mediaIndex).sort((a, b) => a - b);
    assert.deepEqual(indices, [10, 11, 12, 13, 14]);
  });

  it("portrait items get narrower cells", () => {
    const items = [
      { ...makeItem("portrait", "2026-07-01", 800, 1200), aspectRatio: 800 / 1200, mediaIndex: 0 },
      { ...makeItem("landscape", "2026-07-01", 1600, 900), aspectRatio: 1600 / 900, mediaIndex: 1 },
    ];
    const rows = computeJustifiedLayout(items, opts);
    const allCells = rows.flatMap((r) => r.cells);
    const portrait = allCells.find((c) => c.mediaId === "portrait");
    const landscape = allCells.find((c) => c.mediaId === "landscape");
    if (portrait && landscape) {
      assert.ok(portrait.width < landscape.width, "Portrait should be narrower than landscape");
    }
  });

  it("rows have non-negative top offsets in ascending order", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      ...makeItem(`m${i}`, "2026-07-01", 1200, 900),
      mediaIndex: i,
    }));
    const rows = computeJustifiedLayout(items, opts);
    for (let i = 1; i < rows.length; i++) {
      assert.ok(rows[i].top > rows[i - 1].top, "Rows should have ascending top offsets");
    }
  });
});

// ---------------------------------------------------------------------------
// Full layout
// ---------------------------------------------------------------------------

describe("computeTimelineLayout", () => {
  it("returns 0 for empty groups", () => {
    const total = computeTimelineLayout([], [], { containerWidth: 1200 });
    assert.equal(total, 0);
  });

  it("computes increasing group tops", () => {
    const groups = groupMediaByDate(MIXED_ITEMS);
    const total = computeTimelineLayout(groups, MIXED_ITEMS, { containerWidth: 1200, targetRowHeight: 220, gap: 4, headerHeight: 44, groupPaddingBottom: 24 });
    assert.ok(total > 0);
    assert.ok(groups[1].top > groups[0].top);
  });

  it("marks groups as layoutReady", () => {
    const groups = groupMediaByDate(MIXED_ITEMS);
    computeTimelineLayout(groups, MIXED_ITEMS, { containerWidth: 1200, targetRowHeight: 220, gap: 4, headerHeight: 44, groupPaddingBottom: 24 });
    for (const group of groups) {
      assert.equal(group.layoutReady, true);
    }
  });
});

// ---------------------------------------------------------------------------
// Virtual range
// ---------------------------------------------------------------------------

describe("computeVirtualRange", () => {
  function makeGroupsWithTops() {
    const groups = groupMediaByDate(MIXED_ITEMS);
    computeTimelineLayout(groups, MIXED_ITEMS, {
      containerWidth: 1200,
      targetRowHeight: 220,
      gap: 4,
      headerHeight: 44,
      groupPaddingBottom: 24,
    });
    return groups;
  }

  it("returns empty for empty groups", () => {
    const result = computeVirtualRange([], { scrollTop: 0, viewportHeight: 800 }, 0);
    assert.equal(result.visibleGroupIndices.length, 0);
  });

  it("includes groups within viewport", () => {
    const groups = makeGroupsWithTops();
    const totalHeight = groups[groups.length - 1].top + groups[groups.length - 1].height;
    const result = computeVirtualRange(groups, { scrollTop: 0, viewportHeight: 800, overscan: 0 }, totalHeight);
    assert.ok(result.visibleGroupIndices.length > 0);
    assert.ok(result.visibleGroupIndices.includes(0));
  });

  it("includes overscan groups", () => {
    const groups = makeGroupsWithTops();
    const totalHeight = groups[groups.length - 1].top + groups[groups.length - 1].height;
    const resultNoOverscan = computeVirtualRange(groups, { scrollTop: 0, viewportHeight: 100, overscan: 0 }, totalHeight);
    const resultWithOverscan = computeVirtualRange(groups, { scrollTop: 0, viewportHeight: 100, overscan: 2 }, totalHeight);
    assert.ok(resultWithOverscan.visibleGroupIndices.length >= resultNoOverscan.visibleGroupIndices.length);
  });

  it("totalHeight is returned correctly", () => {
    const groups = makeGroupsWithTops();
    const total = groups[groups.length - 1].top + groups[groups.length - 1].height;
    const result = computeVirtualRange(groups, { scrollTop: 0, viewportHeight: 800 }, total);
    assert.equal(result.totalHeight, total);
  });
});

// ---------------------------------------------------------------------------
// Scrubber entries
// ---------------------------------------------------------------------------

describe("computeScrubberEntries", () => {
  it("returns empty for empty groups", () => {
    assert.equal(computeScrubberEntries([]).length, 0);
  });

  it("consolidates same-month groups into one entry", () => {
    const groups = groupMediaByDate(MIXED_ITEMS); // both are 2026-07
    computeTimelineLayout(groups, MIXED_ITEMS, { containerWidth: 1200, targetRowHeight: 220, gap: 4, headerHeight: 44, groupPaddingBottom: 24 });
    const entries = computeScrubberEntries(groups);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].monthKey, "2026-07");
    assert.equal(entries[0].count, MIXED_ITEMS.length);
  });

  it("creates separate entries for different months", () => {
    const items = makeItems([
      "2026-06-30T00:00:00Z",
      "2026-07-01T00:00:00Z",
    ]).map((item, i) => ({ ...item, mediaIndex: i }));
    const groups = groupMediaByDate(items);
    computeTimelineLayout(groups, items, { containerWidth: 1200, targetRowHeight: 220, gap: 4, headerHeight: 44, groupPaddingBottom: 24 });
    const entries = computeScrubberEntries(groups);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].monthKey, "2026-06");
    assert.equal(entries[1].monthKey, "2026-07");
  });
});

// ---------------------------------------------------------------------------
// findGroupAtScrollTop
// ---------------------------------------------------------------------------

describe("findGroupAtScrollTop", () => {
  it("returns null for empty groups", () => {
    assert.equal(findGroupAtScrollTop([], 100), null);
  });

  it("returns first group when scrollTop=0", () => {
    const groups = groupMediaByDate(MIXED_ITEMS);
    computeTimelineLayout(groups, MIXED_ITEMS, { containerWidth: 1200, targetRowHeight: 220, gap: 4, headerHeight: 44, groupPaddingBottom: 24 });
    const result = findGroupAtScrollTop(groups, 0);
    assert.equal(result?.key, "2026-07-01");
  });

  it("returns appropriate group for large scrollTop", () => {
    const groups = groupMediaByDate(MIXED_ITEMS);
    computeTimelineLayout(groups, MIXED_ITEMS, { containerWidth: 1200, targetRowHeight: 220, gap: 4, headerHeight: 44, groupPaddingBottom: 24 });
    const secondGroupTop = groups[1].top;
    const result = findGroupAtScrollTop(groups, secondGroupTop + 1);
    assert.equal(result?.key, "2026-07-02");
  });
});

// ---------------------------------------------------------------------------
// Scroll restoration helpers
// ---------------------------------------------------------------------------

describe("scrollRestorationKey", () => {
  it("produces a stable key", () => {
    const key1 = scrollRestorationKey("album-123", "smart");
    const key2 = scrollRestorationKey("album-123", "smart");
    assert.equal(key1, key2);
  });

  it("differs by albumId", () => {
    const key1 = scrollRestorationKey("a", "smart");
    const key2 = scrollRestorationKey("b", "smart");
    assert.notEqual(key1, key2);
  });

  it("differs by sortMode", () => {
    const key1 = scrollRestorationKey("album", "smart");
    const key2 = scrollRestorationKey("album", "shuffle");
    assert.notEqual(key1, key2);
  });

  it("contains album id", () => {
    const key = scrollRestorationKey("my-album-uuid", "smart");
    assert.ok(key.includes("my-album-uuid"), `Key should contain album id: ${key}`);
  });
});

// ---------------------------------------------------------------------------
// Large-library stress test
// ---------------------------------------------------------------------------

describe("large library (1000 items)", () => {
  function generateLargeLibrary(count) {
    const items = [];
    const baseDate = new Date("2025-01-01T00:00:00Z");
    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate.getTime() + i * 3600 * 1000); // 1 hour apart
      items.push({
        id: `media-${i}`,
        mediaIndex: i,
        sortDate: date.toISOString(),
        width: 1200,
        height: 900,
        aspectRatio: 4 / 3,
        mediaType: "image",
      });
    }
    return items;
  }

  it("groups 1000 items without throwing", () => {
    const items = generateLargeLibrary(1000);
    const groups = groupMediaByDate(items);
    assert.ok(groups.length > 0);
    // 1000 items at 1/hour = ~42 days, each day has items
    assert.ok(groups.length <= 42, `Expected ≤42 groups, got ${groups.length}`);
  });

  it("computes full layout for 1000 items without throwing", () => {
    const items = generateLargeLibrary(1000);
    const groups = groupMediaByDate(items);
    const total = computeTimelineLayout(groups, items, {
      containerWidth: 1200,
      targetRowHeight: 220,
      gap: 4,
      headerHeight: 44,
      groupPaddingBottom: 24,
    });
    assert.ok(total > 0);
    assert.ok(Number.isFinite(total));
  });

  it("virtual range returns bounded subset for large library", () => {
    const items = generateLargeLibrary(1000);
    const groups = groupMediaByDate(items);
    const total = computeTimelineLayout(groups, items, {
      containerWidth: 1200,
      targetRowHeight: 220,
      gap: 4,
      headerHeight: 44,
      groupPaddingBottom: 24,
    });

    const range = computeVirtualRange(
      groups,
      { scrollTop: total / 2, viewportHeight: 800, overscan: 2 },
      total,
    );

    // Should not render all groups (groups.length ≈ 42)
    assert.ok(range.visibleGroupIndices.length < groups.length, "Virtual range should not include all groups");
    // But should include at least some
    assert.ok(range.visibleGroupIndices.length > 0);
  });
});
