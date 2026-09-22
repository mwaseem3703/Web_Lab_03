const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const products = require("./data/products");
const errorHandler = require("./middleware/error");

const app = express();
app.use(express.json());

// ==========================================
// 1. GRAPHQL ENDPOINT (Solves Over-fetching)
// ==========================================
const schema = buildSchema(`
  type Product {
    id: ID!
    name: String!
    price: Float!
    category: String!
  }

  type Query {
    product(id: ID!): Product
    products: [Product]
  }
`);

const root = {
  product: ({ id }) => products.find((p) => p.id === id),
  products: () => products,
};

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true, // Enables the interactive UI at /graphql
  }),
);

// ==========================================
// 2. RESTful API ENDPOINTS
// ==========================================

// GET: Retrieve all products
app.get("/api/v1/products", (req, res) => {
  res
    .status(200)
    .json({ success: true, count: products.length, data: products });
});

// GET: Retrieve single product
app.get("/api/v1/products/:id", (req, res, next) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return next({
      statusCode: 404,
      message: `Product not found with id of ${req.params.id}`,
    });
  }
  res.status(200).json({ success: true, data: product });
});

// POST: Create a new product
app.post("/api/v1/products", (req, res, next) => {
  const { name, price, category } = req.body;
  if (!name || !price || !category) {
    return next({
      statusCode: 400,
      message: "Please provide name, price, and category",
    });
  }

  const newProduct = {
    id: Date.now().toString(), // Simple ID generation
    name,
    price,
    category,
  };

  products.push(newProduct);
  res.status(201).json({ success: true, data: newProduct });
});

// PUT: Update a product (Idempotent - replaces full resource)
app.put("/api/v1/products/:id", (req, res, next) => {
  const index = products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return next({
      statusCode: 404,
      message: `Product not found with id of ${req.params.id}`,
    });
  }

  const { name, price, category } = req.body;
  if (!name || !price || !category) {
    return next({
      statusCode: 400,
      message:
        "PUT requires full resource replacement: name, price, and category",
    });
  }

  products[index] = { id: req.params.id, name, price, category };
  res.status(200).json({ success: true, data: products[index] });
});

// DELETE: Remove a product (Idempotent)
app.delete("/api/v1/products/:id", (req, res, next) => {
  const index = products.findIndex((p) => p.id === req.params.id);

  // Idempotent: If it's already deleted (or doesn't exist), we can still return 204 No Content
  if (index !== -1) {
    products.splice(index, 1);
  }

  res.status(204).send(); // 204 No Content for successful deletion
});

// ==========================================
// 3. ERROR HANDLING
// ==========================================
// Handle 404 for undefined routes
app.use((req, res, next) => {
  next({ statusCode: 404, message: "Route not found" });
});

// Standard Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
