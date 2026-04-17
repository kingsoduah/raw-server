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

// ======================
// DATA (PERSISTENT)
// ======================

let users = [
  { id: 1, name: "Kings" },
  { id: 2, name: "Alex" }
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
  let result = users;

  if (query.name) {
    result = result.filter(user =>
      user.name.toLowerCase() === query.name.toLowerCase()
    );
  }

  return sendJSON(res, 200, result);
});

router.post("/users", (req, res, { body }) => {
  if (!body.name) {
    return sendJSON(res, 400, { error: "Name is required" });
  }

  const newUser = {
    id: Date.now(),
    name: body.name
  };

  users.push(newUser);

  return sendJSON(res, 201, newUser);
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