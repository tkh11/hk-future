import { APIError, type CollectionBeforeOperationHook, type EmailAdapter } from "payload";

const unavailable = "Восстановление пароля по почте не настроено. Обратитесь к администратору.";

/** No SMTP is configured. Never fall back to Payload's console email adapter. */
export const disabledEmailAdapter: EmailAdapter = () => ({
  name: "disabled",
  defaultFromAddress: "no-reply@example.invalid",
  defaultFromName: "HEISSKRAFT",
  async sendEmail() {
    throw new APIError(unavailable, 503);
  },
});

// Deny before account lookup/token creation so registered and unknown addresses
// have the same result while email recovery is intentionally unavailable.
export const disableEmailRecovery: CollectionBeforeOperationHook = ({ operation }) => {
  if (operation === "forgotPassword") throw new APIError(unavailable, 503);
};
