import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicTelegramContact } from "../src/lib/contact/telegram.ts";

const link = (url, enabled = true) => [{ id: "telegram", platform: "TeLeGrAm", url, enabled, order: 1 }];

test("normalizes supported public Telegram values", () => {
  for (const value of ["@orianawren", "orianawren", "https://t.me/orianawren"]) {
    assert.deepEqual(resolvePublicTelegramContact(link(value)), {
      username: "orianawren", displayUsername: "@orianawren", href: "https://t.me/orianawren",
    });
  }
});

test("omits disabled and unsafe Telegram values", () => {
  assert.equal(resolvePublicTelegramContact(link("@orianawren", false)), null);
  for (const value of ["http://t.me/orianawren", "https://t.me.example.com/orianawren", "https://t.me/+invite", "https://t.me/oriana/extra", "https://t.me/orianawren?start=x", "https://t.me/orianawren#bio"]) {
    assert.equal(resolvePublicTelegramContact(link(value)), null);
  }
});
