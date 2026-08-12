import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  currentUser: null as null | { getIdToken: ReturnType<typeof vi.fn> },
}));

vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return state.currentUser;
    },
  },
}));

import { authenticatedJsonRequest } from "@/lib/authenticated-api";
import { ApiRequestError } from "@/lib/api-errors";

function response(status: number, body: Record<string, unknown>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  state.currentUser = { getIdToken: vi.fn() };
  vi.stubGlobal("fetch", vi.fn());
});

describe("authenticatedJsonRequest", () => {
  it("forces one token refresh after a 401 and repeats the request once", async () => {
    state.currentUser!.getIdToken
      .mockResolvedValueOnce("cached-token")
      .mockResolvedValueOnce("refreshed-token");
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(401, { error: "La sesión expiró." }))
      .mockResolvedValueOnce(response(200, { ok: true }));

    await expect(authenticatedJsonRequest<{ ok: boolean }>("/api/fixture", {
      method: "POST",
    })).resolves.toEqual({ ok: true });

    expect(state.currentUser!.getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(state.currentUser!.getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(new Headers(vi.mocked(fetch).mock.calls[1][1]?.headers).get("Authorization"))
      .toBe("Bearer refreshed-token");
  });

  it("returns a typed session error when the refreshed token is also rejected", async () => {
    state.currentUser!.getIdToken.mockResolvedValue("expired-token");
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(401, { error: "La sesión expiró." }))
      .mockResolvedValueOnce(response(401, { error: "La sesión expiró." }));

    const error = await authenticatedJsonRequest("/api/fixture").catch((reason) => reason);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 401, message: "La sesión expiró." });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails locally without sending a request when there is no active session", async () => {
    state.currentUser = null;
    const error = await authenticatedJsonRequest("/api/fixture").catch((reason) => reason);
    expect(error).toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
