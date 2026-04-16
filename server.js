const http = require('http');

const sendJSON = (res, statusCode, data) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

//create a server
const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") {
        sendJSON(res, 200, { message: 'Home route!' });
    }
    else if (req.method === "GET" && req.url === "/users") {
    sendJSON(res, 200, [
      { id: 1, name: "Kings" },
      { id: 2, name: "Alex" }
    ]);
  } 
  else {
    sendJSON(res, 404, { error: "Route not found" });
  }
});

//start the server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});