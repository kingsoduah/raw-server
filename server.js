const http = require('http');
const url = require('url');

const sendJSON = (res, statusCode, data) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

//create a server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    if (req.method === "GET" && req.url === "/") {
        sendJSON(res, 200, { message: 'Home route!' });
    }
    else if (req.method === "GET" && pathname === "/users") {
        console.log(query); // See query in terminal

    let users = [
      { id: 1, name: "Kings" },
      { id: 2, name: "Alex" }
    ];

     // Simple filtering
    if (query.name) {
      users = users.filter(user => 
        user.name.toLowerCase() === query.name.toLowerCase() );
    }

    sendJSON(res, 200, users);
  } 

  else if (req.method === "GET" && pathname === "/products") {
    console.log(query); // See query in terminal

    let products = [
      { id: 1, name: "Laptop" },
      { id: 2, name: "Mouse" }
    ];

     // Simple filtering
    if (query.name) {
      products = products.filter(product => product.name === query.name);
    }

    sendJSON(res, 200, products);
  } 

  else {
    sendJSON(res, 404, { error: "Route not found" });
  }
});

//start the server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});