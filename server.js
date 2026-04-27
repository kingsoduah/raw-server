const http = require('http');
const url = require('url');

const routes = {
  GET: {},
  POST: {}
};

const router = {
  get: (path, handler) => {
    routes.GET[path] = handler;
  },
  post: (path, handler) => {
    routes.POST[path] = handler;
  }
};

const sessions = {};

const authenticate = (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    sendJSON(res, 401, { error: "Unauthorized" });
    return null;
  }

  const token = authHeader.split(" ")[1];

  const session = sessions[token];

  if (!session) {
    sendJSON(res, 401, { error: "Invalid token" });
    return null;
  }

  return session;
};

// ======================
// DATA (PERSISTENT)
// ======================

let users = [
  { id: 1, name: "Kings", password: "1234", role: "admin" },
  { id: 2, name: "Alex", password: "abcd", role: "user" }
];

let products = [
  { id: 1, name: "Laptop" },
  { id: 2, name: "Mouse" }
];

// ======================
// RESPONSE HELPER
// ======================

const sendJSON = (res, statusCode, data) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

// ======================
// ROUTE DEFINITIONS (IMPORTANT: OUTSIDE SERVER)
// ======================

// USERS
router.get("/users", (req, res, { query }) => {
  const session = authenticate(req, res);
  if (!session) return;

  let result = users.map(u => ({
    id: u.id,
    name: u.name
  }));

  if (query.name) {
    result = result.filter(user =>
      user.name.toLowerCase() === query.name.toLowerCase()
    );
  }

  return sendJSON(res, 200, result);
});

router.post("/login", (req, res, { body }) => {
  const { name, password } = body;

  const user = users.find(u => u.name === name && u.password === password);

  if (!user) {
    return sendJSON(res, 401, { error: "Authentication failed" });
  }

  // Generate simple token
  const token = "token_" + Date.now();

  sessions[token] = {
    userId: user.id,
    role: user.role
  };

  return sendJSON(res, 200, { token });
});

// PRODUCTS
router.get("/products", (req, res, { query }) => {
  let result = products;

  if (query.name) {
    result = result.filter(product =>
      product.name.toLowerCase() === query.name.toLowerCase()
    );
  }

  return sendJSON(res, 200, result);
});

router.post("/products", (req, res, { body }) => {
  const session = authenticate(req, res);
  if (!session) return;

  // Authorization check
  if (session.role !== "admin") {
    return sendJSON(res, 403, { error: "Forbidden" });
  }

  if (!body.name) {
    return sendJSON(res, 400, { error: "Name is required" });
  }

  const newProduct = {
    id: Date.now(),
    name: body.name
  };

  products.push(newProduct);

  return sendJSON(res, 201, newProduct);
});

// ======================
// SERVER (RUNTIME ONLY)
// ======================

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  const routeHandler = routes[method]?.[pathname];

  if (!routeHandler) {
    return sendJSON(res, 404, { error: "Route not found" });
  }

  // POST handling
  if (method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body || "{}");

        routeHandler(req, res, {
          query,
          body: parsedBody
        });
      } catch (err) {
        return sendJSON(res, 400, { error: "Invalid JSON" });
      }
    });

    return;
  }

  // GET handling
  routeHandler(req, res, { query });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});