const http = require('http');
const url = require('url');

// INFRASTRUCTURE

const routes = { GET: {}, POST: {} };
const middlewares = [];

const router = {
  get: (path, handler) => { routes.GET[path] = handler; },
  post: (path, handler) => { routes.POST[path] = handler; }
};

const use = (middleware) => {
  middlewares.push(middleware);
};

const runMiddlewares = (req, res, context, done) => {
  let index = 0;

  const next = () => {
    if (index >= middlewares.length) return done();
    const middleware = middlewares[index++];
    middleware(req, res, context, next);
  };

  next();
};

 const matchRoute = (method, pathname) => {
  const methodRoutes = routes[method] || {};

  // Exact match first
  if (methodRoutes[pathname]) {
    return {
      handler: methodRoutes[pathname],
      params: {}
    };
  }

  // Dynamic route matching
  for (const routePath in methodRoutes) {

    const routeParts = routePath.split("/");
    const pathParts = pathname.split("/");

    if (routeParts.length !== pathParts.length) {
      continue;
    }

    let isMatch = true;
    const params = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith(":")) {
        const paramName = routePart.slice(1);
        params[paramName] = pathPart;
      } else if (routePart !== pathPart) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return {
        handler: methodRoutes[routePath],
        params
      };
    }
  }

  return null;
};

// HELPERS 

const sendJSON = (res, statusCode, data) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

const validate = (schema, data) => {
  const errors = [];

  for (const field in schema) {
    const rules = schema[field];
    const value = data[field];

    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value === undefined) continue;

    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} must be a ${rules.type}`);
      continue;
    }

    if (rules.minLength && typeof value === "string" && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
      errors.push(`${field} must be at most ${rules.maxLength} characters`);
    }
  }

  return errors;
};

const transform = (data) => {
  const transformed = { ...data };

  if (transformed.name) {
    transformed.name = transformed.name.trim();
  }

  return transformed;
};


// DATA

let users = [
  { id: 1, name: "Kings", password: "1234", role: "admin" },
  { id: 2, name: "Alex", password: "abcd", role: "user" }
];

let products = [
  { id: 1, name: "Laptop" },
  { id: 2, name: "Mouse" }
];

const sessions = {};


// REPOSITORIES

const userRepository = {
  findByCredentials: (name, password) => {
    return users.find(
      user => user.name === name && user.password === password
    );
  },

  getAll: () => {
    return users.map(user => ({
      id: user.id,
      name: user.name
    }));
  }
};

const productRepository = {
  getAll: () => {
    return products;
  },

  findById: (id) => {
    return products.find(product => product.id === id);
  },

  create: (productData) => {
    const newProduct = {
      id: Date.now(),
      ...productData
    };

    products.push(newProduct);

    return newProduct;
  }
};


// SERVICES

const authService = {
  login: ({ name, password }) => {
    const user = userRepository.findByCredentials(name, password);

    if (!user) {
      return null;
    }

    const token = "token_" + Date.now();

    sessions[token] = {
      userId: user.id,
      role: user.role
    };

    return { token };
  }
};

const productService = {
  createProduct: (productData) => {
    return productRepository.create(productData);
  },

  getProducts: ({ page, limit }) => {
    const allProducts = productRepository.getAll();

    const finalLimit = limit || allProducts.length;

    const start = (page - 1) * finalLimit;
    const end = start + finalLimit;

    return {
      data: allProducts.slice(start, end),
      total: allProducts.length,
      page,
      totalPages: Math.ceil(allProducts.length / finalLimit)
    };
  },

  getProductById: (id) => {
    return productRepository.findById(id);
  }
};

const userService = {
  getUsers: (query) => {
    let users = userRepository.getAll();

    if (query.name) {
      users = users.filter(user =>
        user.name.toLowerCase() === query.name.toLowerCase()
      );
    }

    return users;
  }
};


// MIDDLEWARES

use((req, res, context, next) => {
  const publicRoutes = ["/login"];

  if (publicRoutes.includes(context.pathname)) {
   return next();
  }

  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return sendJSON(res, 401, { error: "Unauthorized" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return sendJSON(res, 401, { error: "Invalid authorization format" });
  }

  const token = parts[1];
  const session = sessions[token];

  if (!session) {
    return sendJSON(res, 401, { error: "Invalid token" });
  }

  context.user = session;
  next();
});

// CONTROLLERS/ROUTES

router.post("/login", (req, res, { body }) => {

  const transformedBody = transform(body);

  const errors = validate({
    name: { required: true, type: "string", minLength: 2 },
    password: { required: true, type: "string", minLength: 3 }
  }, transformedBody);

  if (errors.length > 0) {
    return sendJSON(res, 400, { errors });
  }

  const result = authService.login(transformedBody);

  if (!result) {
    return sendJSON(res, 401, {
      error: "Authentication failed"
    });
  }

  return sendJSON(res, 200, result);
});

router.get("/users", (req, res, context) => {

  const result = userService.getUsers(context.query);

  return sendJSON(res, 200, result);
});

router.get("/products", (req, res, { query }) => {

  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 10;

  if (isNaN(page) || isNaN(limit)) {
    return sendJSON(res, 400, {
      error: "page and limit must be numbers"
    });
  }

  const result = productService.getProducts({
    page,
    limit
  });

  return sendJSON(res, 200, result);
});

router.get("/products/:id", (req, res, context) => {

  const id = Number(context.params.id);

  if (isNaN(id)) {
    return sendJSON(res, 400, {
      error: "Product ID must be a number"
    });
  }

  const product = productService.getProductById(id);

  if (!product) {
    return sendJSON(res, 404, {
      error: "Product not found"
    });
  }

  return sendJSON(res, 200, product);
});

router.post("/products", (req, res, context) => {

  if (context.user.role !== "admin") {
    return sendJSON(res, 403, { error: "Forbidden" });
  }

  const transformedBody = transform(context.body);

  const errors = validate({
    name: { required: true, type: "string", minLength: 2 }
  }, transformedBody);

  if (errors.length > 0) {
    return sendJSON(res, 400, { errors });
  }

  const product = productService.createProduct(transformedBody);

  return sendJSON(res, 201, product);
});

// SERVER

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method.toUpperCase();

  const matchedRoute = matchRoute(method, pathname);

if (!matchedRoute) {
  return sendJSON(res, 404, { error: "Route not found" });
}

const routeHandler = matchedRoute.handler;

  if (method === "POST") {
    let body = "";

    req.on("data", chunk => body += chunk.toString());

    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body || "{}");

        const context = { query, body: parsedBody, pathname, params: matchedRoute.params };

        runMiddlewares(req, res, context, () => {
          routeHandler(req, res, context);
        });

      } catch {
        return sendJSON(res, 400, { error: "Invalid JSON" });
      }
    });

    return;
  }

  const context = { query, pathname, params: matchedRoute.params };

  runMiddlewares(req, res, context, () => {
    routeHandler(req, res, context);
  });

});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});