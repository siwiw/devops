const request = require("supertest");
const app = require("./app");

describe("GET /", () => {
  it("should return Hello CI Pipeline!", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Hello CI Pipeline!");
  });
});

describe("GET /health", () => {
  it("should return status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});