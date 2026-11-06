import { describe, expect, it } from "vitest";
import { DoveError, toLinkProblem } from "./dove-errors";
import { detectInstallContext } from "./install";
import { maskEmail } from "./mask";
import { isWeakPin, validateNewPin } from "./pin";
import { formatForDisplay, toE164, toInputValue } from "./phone";
import {
  changePinSchemaFor,
  loginSchema,
  newPinSchema,
  profileSchema,
  profileSchemaFor,
  toIdentifier,
  toUpdatePayload,
  type ProfileFormInput,
} from "./validation";
import { buildVCard, waMeUrl } from "./whatsapp";

describe("toE164", () => {
  it.each([
    ["08034567890", "+2348034567890"],
    ["8034567890", "+2348034567890"],
    ["0803 456 7890", "+2348034567890"],
    ["+234 803 456 7890", "+2348034567890"],
    ["+2340803456789 0", "+2348034567890"],
    ["2348034567890", "+2348034567890"],
    ["07012345678", "+2347012345678"],
    ["09087654321", "+2349087654321"],
    ["+44 7700 900123", "+447700900123"],
  ])("%s → %s", (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(["", "80345", "0603456789", "12345678901", "+12"])("rejects %j", (input) => {
    expect(toE164(input)).toBeNull();
  });
});

describe("phone display", () => {
  it("shows national digits next to the +234 prefix", () => {
    expect(toInputValue("+2348034567890")).toBe("803 456 7890");
    expect(toInputValue("08034567890")).toBe("803 456 7890");
    expect(toInputValue(null)).toBe("");
    expect(toInputValue("+447700900123")).toBe("+447700900123");
  });

  it("formats E.164 for display", () => {
    expect(formatForDisplay("+2348034567890")).toBe("+234 803 456 7890");
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("sarah.adeyemi@example.com")).toBe("s•••@example.com");
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});

describe("toLinkProblem", () => {
  it("prefers Dove's code", () => {
    expect(toLinkProblem(new DoveError("x", 400, "PROFILE_LINK_EXPIRED"))).toBe(
      "PROFILE_LINK_EXPIRED",
    );
  });

  it("falls back to Dove's current messages", () => {
    expect(
      toLinkProblem(new DoveError("Magic link has expired. Please request a new one.", 400)),
    ).toBe("PROFILE_LINK_EXPIRED");
    expect(toLinkProblem(new DoveError("Invalid or expired magic link", 400))).toBe(
      "PROFILE_LINK_INVALID",
    );
  });

  it("ignores unrelated errors", () => {
    expect(toLinkProblem(new DoveError("Internal server error", 500))).toBeNull();
    expect(toLinkProblem(new Error("boom"))).toBeNull();
  });
});

describe("profileSchema", () => {
  const base: ProfileFormInput = {
    firstName: "Sarah",
    lastName: "Adeyemi",
    gender: "FEMALE",
    dateOfBirth: "1990-12-04",
    email: "Sarah@Example.com",
    phone: "803 456 7890",
    address: "",
    membershipStatus: "WORKER",
    departmentIds: ["choir"],
  };

  it("accepts a valid worker", () => {
    expect(profileSchema.safeParse(base).success).toBe(true);
  });

  it("requires a department for workers", () => {
    const result = profileSchema.safeParse({ ...base, departmentIds: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["departmentIds"]);
  });

  it.each(["LEADER", "PASTOR", "MEMBER", "VISITOR"] as const)(
    "does not require departments for %s",
    (membershipStatus) => {
      expect(
        profileSchema.safeParse({ ...base, membershipStatus, departmentIds: [] }).success,
      ).toBe(true);
    },
  );

  it("rejects future dates of birth and bad phones", () => {
    expect(profileSchema.safeParse({ ...base, dateOfBirth: "2999-01-01" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, phone: "80345" }).success).toBe(false);
  });

  it("lets workers save when the church has no departments yet", () => {
    const lenient = profileSchemaFor({ departmentsAvailable: false });
    expect(lenient.safeParse({ ...base, departmentIds: [] }).success).toBe(true);
  });

  it("requires names", () => {
    expect(profileSchema.safeParse({ ...base, lastName: "  " }).success).toBe(false);
  });
});

describe("toUpdatePayload", () => {
  const values = profileSchema.parse({
    firstName: " Sarah ",
    lastName: "Adeyemi",
    gender: "",
    dateOfBirth: "",
    email: "Sarah@Example.com",
    phone: "",
    address: "",
    membershipStatus: "MEMBER",
    departmentIds: ["choir"],
  });

  it("omits empty optionals and clears hidden departments", () => {
    expect(toUpdatePayload(values)).toEqual({
      firstName: "Sarah",
      lastName: "Adeyemi",
      email: "sarah@example.com",
      address: "",
      membershipStatus: "MEMBER",
      departmentIds: [],
    });
  });

  it("sends E.164 phones and keeps departments for leaders", () => {
    const payload = toUpdatePayload({
      ...values,
      phone: "0803 456 7890",
      membershipStatus: "LEADER",
    });
    expect(payload.phone).toBe("+2348034567890");
    expect(payload.departmentIds).toEqual(["choir"]);
  });
});

describe("detectInstallContext", () => {
  const iphoneSafari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  const androidChrome =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
  const androidWebView =
    "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36";
  const instagram = `${iphoneSafari} Instagram 300.0`;

  it("detects each context", () => {
    expect(detectInstallContext({ userAgent: androidChrome, standalone: true, hasPrompt: false })).toBe("installed");
    expect(detectInstallContext({ userAgent: androidChrome, standalone: false, hasPrompt: true })).toBe("prompt");
    expect(detectInstallContext({ userAgent: iphoneSafari, standalone: false, hasPrompt: false })).toBe("ios");
    expect(detectInstallContext({ userAgent: instagram, standalone: false, hasPrompt: false })).toBe("in-app");
    expect(detectInstallContext({ userAgent: androidWebView, standalone: false, hasPrompt: false })).toBe("in-app");
    expect(detectInstallContext({ userAgent: androidChrome, standalone: false, hasPrompt: false })).toBe("unsupported");
  });
});

describe("whatsapp helpers", () => {
  it("builds wa.me links", () => {
    expect(waMeUrl("+2348012345678", "Hello Amazing Grace!")).toBe(
      "https://wa.me/2348012345678?text=Hello%20Amazing%20Grace!",
    );
  });

  it("builds an importable vCard", () => {
    const card = buildVCard({
      name: "Amazing Grace",
      organization: "Abiding Word Of Grace Missions",
      phone: "+2348012345678",
      url: "https://abwog.org",
    });
    expect(card).toContain("BEGIN:VCARD\r\nVERSION:3.0\r\n");
    expect(card).toContain("TEL;TYPE=CELL:+2348012345678");
    expect(card.endsWith("END:VCARD\r\n")).toBe(true);
  });
});

describe("PIN rules", () => {
  it.each(["0000", "1111", "9999", "1234", "4321", "0123", "6789", "9876", "1212", "2580", "0852"])(
    "%s is too weak",
    (pin) => {
      expect(isWeakPin(pin)).toBe(true);
      expect(validateNewPin(pin)).toMatch(/too easy/);
    },
  );

  it.each(["4729", "8153", "1357", "2468", "1990"])("%s is acceptable", (pin) => {
    expect(isWeakPin(pin)).toBe(false);
    expect(validateNewPin(pin)).toBeNull();
  });

  it.each(["", "123", "12345", "12a4", "abcd"])("%j is not a 4-digit PIN", (pin) => {
    expect(validateNewPin(pin)).toBe("Your PIN must be exactly 4 digits.");
  });
});

describe("new PIN form", () => {
  it("requires the two entries to match", () => {
    const result = newPinSchema.safeParse({ pin: "4729", confirmPin: "4728" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPin"]);
    expect(newPinSchema.safeParse({ pin: "4729", confirmPin: "4729" }).success).toBe(true);
  });

  it("rejects weak PINs on the pin field", () => {
    const result = newPinSchema.safeParse({ pin: "1234", confirmPin: "1234" });
    expect(result.error?.issues[0].path).toEqual(["pin"]);
  });
});

describe("change PIN form", () => {
  const input = { currentPin: "", pin: "4729", confirmPin: "4729" };

  it("only asks for the current PIN when one exists", () => {
    expect(changePinSchemaFor({ hasPin: false }).safeParse(input).success).toBe(true);
    const result = changePinSchemaFor({ hasPin: true }).safeParse(input);
    expect(result.error?.issues[0].path).toEqual(["currentPin"]);
    expect(changePinSchemaFor({ hasPin: true }).safeParse({ ...input, currentPin: "8153" }).success).toBe(
      true,
    );
  });
});

describe("login form", () => {
  it.each(["sarah@example.com", "08034567890", "+2348034567890", "803 456 7890"])(
    "accepts %s",
    (identifier) => {
      expect(loginSchema.safeParse({ identifier, pin: "4729" }).success).toBe(true);
    },
  );

  it.each(["", "sarah@", "12345", "not a number"])("rejects identifier %j", (identifier) => {
    const result = loginSchema.safeParse({ identifier, pin: "4729" });
    expect(result.error?.issues[0].path).toEqual(["identifier"]);
  });

  it("needs a 4-digit PIN", () => {
    const result = loginSchema.safeParse({ identifier: "sarah@example.com", pin: "47" });
    expect(result.error?.issues[0].path).toEqual(["pin"]);
  });

  it("sends phones as E.164 and emails lower-cased", () => {
    expect(toIdentifier(" 0803 456 7890 ")).toBe("+2348034567890");
    expect(toIdentifier("Sarah.Adeyemi@Example.com")).toBe("sarah.adeyemi@example.com");
  });
});
