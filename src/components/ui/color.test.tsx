import assert from "node:assert/strict";
import test from "node:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ColorControl } from "./color";

test.afterEach(() => cleanup());

test("color control synchronizes a normalized outer draft with its popover", () => {
  const changes: string[] = [];
  const commits: string[] = [];

  render(
    <ColorControl
      acceptedValue="#112233"
      id="color"
      label="Color"
      value="#112233"
      onChange={(value) => changes.push(value)}
      onCommit={(value) => commits.push(value)}
    />,
  );

  const input = screen.getByRole("textbox", { name: "Color" }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "#abc" } });
  assert.equal(input.value, "#abc");
  assert.deepEqual(changes, []);

  fireEvent.change(input, { target: { value: "#abcdef" } });
  fireEvent.blur(input);
  assert.deepEqual(changes, ["#ABCDEF"]);
  assert.deepEqual(commits, ["#ABCDEF"]);

  fireEvent.click(screen.getByRole("button", { name: "Color" }));
  assert.ok(screen.getByRole("dialog", { name: "Color" }));
  const inputs = screen.getAllByRole("textbox", { name: "Color" });
  assert.equal(inputs.length, 2);
  fireEvent.input(inputs[1], { target: { value: "#445566" } });
  fireEvent.blur(inputs[1]);
  assert.deepEqual(changes, ["#ABCDEF", "#445566"]);
  assert.deepEqual(commits, ["#ABCDEF", "#445566"]);
});

test("color control commits a popup hex value on Enter", () => {
  const commits: string[] = [];

  render(
    <ColorControl
      acceptedValue="#112233"
      id="color"
      label="Color"
      value="#112233"
      onChange={() => undefined}
      onCommit={(value) => commits.push(value)}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Color" }));
  const popup_input = screen.getAllByRole("textbox", { name: "Color" })[1];
  fireEvent.input(popup_input, { target: { value: "#445566" } });
  fireEvent.keyDown(popup_input, { key: "Enter" });

  assert.deepEqual(commits, ["#445566"]);
});

test("color control does not recommit a popup hex value already accepted", () => {
  const commits: string[] = [];
  const on_commit = (value: string) => commits.push(value);
  const { rerender } = render(
    <ColorControl
      acceptedValue="#112233"
      id="color"
      label="Color"
      value="#112233"
      onChange={() => undefined}
      onCommit={on_commit}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Color" }));
  const popup_input = screen.getAllByRole("textbox", { name: "Color" })[1];
  fireEvent.input(popup_input, { target: { value: "#445566" } });
  fireEvent.blur(popup_input);
  assert.deepEqual(commits, ["#445566"]);

  rerender(
    <ColorControl
      acceptedValue="#445566"
      id="color"
      label="Color"
      value="#445566"
      onChange={() => undefined}
      onCommit={on_commit}
    />,
  );
  fireEvent.blur(popup_input);

  assert.deepEqual(commits, ["#445566"]);
});
