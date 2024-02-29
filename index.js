const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("disasterCareHub");
    const usersCollection = db.collection("users");
    const supplyCollection = db.collection("supplies");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await usersCollection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // WRITE YOUR CODE HERE

    // Create supply
    app.post("/create-supply", async (req, res) => {
      const supply = req.body;
      const result = await supplyCollection.insertOne(supply);
      res.send(result);
    });

    // Get supplies
    app.get("/supplies", async (req, res) => {
      const limit = parseInt(req.query.limit);

      let result;
      if (limit) {
        result = await supplyCollection.find().limit(limit).toArray();
      } else {
        result = await supplyCollection.find().toArray();
      }

      res.send(result);
    });

    // Get supply by id
    app.get("/supplies/:id", async (req, res) => {
      const id = req.params.id;
      const supplyId = new ObjectId(id);
      const query = { _id: supplyId };
      const result = await supplyCollection.findOne(query);
      res.send(result);
    });

    // Delete a supply
    app.delete("/delete-supply/:id", async (req, res) => {
      const id = req.params.id;
      const supplyId = new ObjectId(id);
      const filter = { _id: supplyId };
      let result;
      if (id) {
        result = await supplyCollection.deleteOne(filter);
      }
      res.send(result);
    });

    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});