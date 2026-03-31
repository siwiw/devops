const request = require("supertest");
const app = require("../app");
test("GET / should return Hello CI Pipeline", async () => {
  const res = await request(app).get("/");
  expect(res.statusCode).toBe(200);
  expect(res.text).toBe("Hello CI Pipeline!");
});