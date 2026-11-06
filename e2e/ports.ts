// The e2e run uses its own ports and its own Next build folder, so it can never pick up
// a `bun dev` you already have running (which may be talking to the real API).
export const PORT = Number(process.env.E2E_PORT ?? 3101);
export const STUB_PORT = Number(process.env.E2E_STUB_PORT ?? 4011);
export const STUB_API = `http://localhost:${STUB_PORT}/api/v1`;
