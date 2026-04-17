const http = require('http');
const url = require('url');

// In-memory data (IMPORTANT: outside server)
let users = [
  { id: 1, name: "Kings" },
  { id: 2, name: "Alex" }
];

let products = [
  { id: 1, name: "Laptop" },
  { id: 2, name: "Mouse" }
];

const sendJSON = (res, statusCode, data) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // HOME
  if (req.method === "GET" && pathname === "/") {
    return sendJSON(res, 200, { message: "Home route!" });
  }

  // ======================
  // USERS
  // ======================

  // GET USERS
  if (req.method === "GET" && pathname === "/users") {
    let result = users;

    if (query.name) {
      result = result.filter(user =>
        user.name.toLowerCase() === query.name.toLowerCase()
      );
    }

    return sendJSON(res, 200, result);
  }

  // POST USERS
  if (req.method === "POST" && pathname === "/users") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body);

        if (!parsedBody.name) {
          return sendJSON(res, 400, { error: "Name is required" });
        }

        const newUser = {
          id: Date.now(),
          name: parsedBody.name
        };

        users.push(newUser);

        return sendJSON(res, 201, newUser);
      } catch (err) {
        return sendJSON(res, 400, { error: "Invalid JSON" });
      }
    });

    return;
  }

  // ======================
  // PRODUCTS
  // ======================

  // GET PRODUCTS
  if (req.method === "GET" && pathname === "/products") {
    let result = products;

    if (query.name) {
      result = result.filter(product =>
        product.name.toLowerCase() === query.name.toLowerCase()
      );
    }

    return sendJSON(res, 200, result);
  }

  // POST PRODUCTS
  if (req.method === "POST" && pathname === "/products") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body);

        if (!parsedBody.name) {
          return sendJSON(res, 400, { error: "Name is required" });
        }

        const newProduct = {
          id: Date.now(),
          name: parsedBody.name
        };

        products.push(newProduct);

        return sendJSON(res, 201, newProduct);
      } catch (err) {
        return sendJSON(res, 400, { error: "Invalid JSON" });
      }
    });

    return;
  }

  // ======================
  // NOT FOUND
  // ======================

  return sendJSON(res, 404, { error: "Route not found" });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});