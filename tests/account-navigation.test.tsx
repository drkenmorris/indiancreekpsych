import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mock = vi.hoisted(() => ({
  signUp: vi.fn(),
  user: true,
  role: "patient" as string | null,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: mock.signUp,
      getUser: async () => ({ data: { user: mock.user ? { id: "synthetic-user" } : null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: mock.role ? { account_type: mock.role } : null,
      error: null,
    }) }) }) }),
  }),
}));

import RegisterPage from "../app/register/page";
import AccountClient from "../app/account/AccountClient";
import AuthMenuAction from "../app/components/AuthMenuAction";

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = true;
  mock.role = "patient";
  mock.signUp.mockResolvedValue({ data: {}, error: { message: "Synthetic submission captured" } });
});
afterEach(cleanup);

test.each(["patient", "guest"])("registration submits %s with Patient first and selected by default", async (type) => {
  render(<RegisterPage />);
  const select = screen.getByRole("combobox", { name: "Account type" }) as HTMLSelectElement;
  expect(select.value).toBe("patient");
  expect(Array.from(select.options, option => option.value)).toEqual(["patient", "guest"]);
  if (type === "guest") fireEvent.change(select, { target: { value: "guest" } });
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Fictional" } });
  fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Example" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "fictional@example.invalid" } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: "synthetic-password-only" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await screen.findByText("Synthetic submission captured");
  expect(mock.signUp).toHaveBeenCalledWith(expect.objectContaining({
    options: expect.objectContaining({ data: expect.objectContaining({ registration_type: type, newsletter_consent: false }) }),
  }));
});

test.each(["patient", "guest", "admin", "staff"] as const)("%s account shows an appointment action", (role) => {
  render(<AccountClient email="fictional@example.invalid" firstName="Fictional" lastName="Example"
    accountType={role} emailVerified={true} newsletterSubscribed={false} />);
  expect(screen.getByRole("link", { name: "Set an Appointment" }).getAttribute("href"))
    .toBe(role === "patient" || role === "admin" ? "/appointments" : "/make-an-appointment");
});

test.each(["patient", "guest", "admin", "staff", null])("signed-in %s navigation links to appointment access", async (role) => {
  mock.role = role;
  render(<AuthMenuAction compact />);
  const link = await screen.findByRole("link", { name: "Set an Appointment" });
  expect(link.getAttribute("href")).toBe(role === "patient" || role === "admin" ? "/appointments" : "/make-an-appointment");
  if (role !== "patient") expect(screen.queryByRole("link", { name: "Psychological Tests" })).toBeNull();
});

test("signed-out navigation still offers sign in", async () => {
  mock.user = false;
  render(<AuthMenuAction />);
  expect((await screen.findByRole("link", { name: "Login" })).getAttribute("href")).toBe("/login?next=/account");
  expect(screen.queryByRole("link", { name: "Set an Appointment" })).toBeNull();
});

// The patient appointment action must also appear outside compact workspace menus.
test.each([false, true])("patient has appointment and testing links when compact=%s", async (compact) => {
  render(<AuthMenuAction compact={compact} />);
  expect((await screen.findByRole("link", { name: "Set an Appointment" })).getAttribute("href")).toBe("/appointments");
  expect(screen.getByRole("link", { name: "Psychological Tests" }).getAttribute("href")).toBe("/patient/psychological-tests");
});
