import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import App from "../src/App";
afterEach(cleanup);
it("offers accessible import and changes library views", async () => {
  render(<App />);
  await screen.findByText("Every good session starts with a song.");
  expect(screen.getByLabelText("Import Guitar Pro files")).toHaveAttribute(
    "multiple",
  );
  fireEvent.change(screen.getByLabelText("Search title or artist"), {
    target: { value: "test" },
  });
  expect(screen.getByLabelText("Clear search")).toBeVisible();
  fireEvent.click(screen.getByLabelText("Clear search"));
  expect(screen.getByLabelText("Search title or artist")).toHaveValue("");
  fireEvent.click(screen.getByLabelText("Favourites"));
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "The ones you love.",
    ),
  );
});
