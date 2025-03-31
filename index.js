require("dotenv").config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { databaseConnection } = require("./DB/dbConnect");
const { ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Database Connection
databaseConnection();

// Middleware
const corsOptions = {
  // origin: ["http://localhost:5173", "http://localhost:5174"],
  origin: "https://study-management-system-client.vercel.app",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Custom Middleware: Verify Token
app.get("/verify-token/:token", async (req, res) => {
  const token = req?.params?.token;
  if (!token) {
    return res.send({ isValid: false });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.send({ isValid: false });
    }
    return res.send({ isValid: true, user: decoded.user });
  });
});

// Database Collections
const db = require("./DB/dbConnect").client.db("session-sync");
const usersCollection = db.collection("users");
const studySessionsCollection = db.collection("sessions");
const bookedSessionsCollection = db.collection("bookedSessions");
const notesCollection = db.collection("notes");
const materialsCollection = db.collection("materials");
const reviewsCollection = db.collection("reviews");
const announcementsCollection = db.collection("announcements");

// Welcome Route
app.get("/", (req, res) => {
  res.send("Welcome to the Session Sync API!");
});

// Student API

// Save Booked a session in db
app.post("/book-session", async (req, res) => {
  const { sessionId, sessionTitle, registrationFee, studentEmail, tutorEmail } =
    req.body;

  try {
    // Check if the session already exists in the bookedSessions collection
    const existingBooking = await bookedSessionsCollection.findOne({
      sessionId,
      studentEmail,
    });

    if (existingBooking) {
      return res.status(400).send({
        success: false,
        message: "You have already booked this session.",
      });
    }

    // Insert the booked session into the database
    const result = await bookedSessionsCollection.insertOne({
      sessionId,
      sessionTitle,
      registrationFee,
      studentEmail,
      tutorEmail,
      bookedAt: new Date(),
    });

    if (result.insertedId) {
      res.status(201).send({
        success: true,
        message: "Session booked successfully.",
      });
    } else {
      res.status(500).send({
        success: false,
        message: "Failed to book the session.",
      });
    }
  } catch (error) {
    console.error("Error booking session:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while booking the session.",
    });
  }
});

//  Step 1: Create Payment Intent
app.post("/create-payment-intent", async (req, res) => {
  const { amount, sessionId } = req.body;

  try {
    const session = await studySessionsCollection.findOne({
      _id: new ObjectId(sessionId),
    });
    if (!session) {
      return res.status(404).send({ message: "Session not found." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: "usd",
      metadata: { sessionId },
    });

    res.status(200).send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating PaymentIntent:", error);
    res.status(500).send({ message: "Error creating PaymentIntent." });
  }
});

// Step 2: Confirm Payment and Save Booking
app.post("/confirm-payment", async (req, res) => {
  const { sessionId, studentEmail, registrationFee, paymentIntentId } =
    req.body;

  try {
    // Check if the session already exists in the bookedSessions collection
    const existingBooking = await bookedSessionsCollection.findOne({
      sessionId,
      studentEmail,
    });

    if (existingBooking) {
      return res.status(400).send({
        success: false,
        message: "You have already booked this session.",
      });
    }

    // Fetch session details from the database
    const session = await studySessionsCollection.findOne({
      _id: new ObjectId(sessionId),
    });
    if (!session) {
      return res.status(404).send({ message: "Session not found." });
    }

    // Use sessionTitle from the fetched session if not provided in the request
    const sessionTitle = session.sessionTitle;

    const bookedSession = {
      sessionId,
      sessionTitle, // Ensure this is stored
      studentEmail,
      tutorEmail: session.tutorEmail,
      registrationFee, // Ensure this is stored
      paymentIntentId,
      bookedAt: new Date(),
    };

    // Insert the booked session into the database
    await bookedSessionsCollection.insertOne(bookedSession);

    res
      .status(200)
      .send({ success: true, message: "Session booked successfully." });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).send({ message: "Error confirming payment." });
  }
});

// Fetch Booked Sessions in student dashboard
app.get("/get-booked-sessions", async (req, res) => {
  const { studentEmail } = req.query;
  if (!studentEmail) {
    return res.status(400).send({ message: "Student email is required." });
  }

  try {
    const sessions = await bookedSessionsCollection
      .find({ studentEmail })
      .toArray();
    res.status(200).send(sessions);
  } catch (error) {
    console.error("Error fetching booked sessions:", error);
    res.status(500).send({ message: "Error fetching booked sessions." });
  }
});

// Save session review data in db
app.post("/post-review", async (req, res) => {
  const { sessionId, studentEmail, comment, rating } = req.body;

  try {
    const result = await reviewsCollection.insertOne({
      sessionId,
      studentEmail,
      comment,
      rating,
      reviewedAt: new Date(),
    });

    if (result.insertedId) {
      res
        .status(201)
        .send({ success: true, message: "Review posted successfully." });
    } else {
      res
        .status(500)
        .send({ success: false, message: "Failed to post review." });
    }
  } catch (error) {
    console.error("Error posting review:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while posting the review.",
    });
  }
});

// Fetch reviews data
app.get("/get-reviews", async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).send({ message: "Session ID is required." });
  }

  try {
    const reviews = await reviewsCollection.find({ sessionId }).toArray();
    res.status(200).send(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).send({ message: "Error fetching reviews." });
  }
});

// Save a Note data in db
app.post("/create-note", async (req, res) => {
  try {
    const note = req.body;
    const result = await notesCollection.insertOne(note);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to insert Note" });
  }
});

// Fetch Notes
app.get("/get-notes", async (req, res) => {
  const { studentEmail } = req.query;
  if (!studentEmail) {
    return res.status(400).send({ message: "studentEmail is required." });
  }
  try {
    // Case-insensitive query
    const notes = await notesCollection
      .find({
        "student.studentEmail": studentEmail,
      })
      .toArray();

    res.status(200).send(notes);
  } catch (error) {
    res.status(500).send({ message: "Error fetching notes." });
  }
});

// Delete a note by ID
app.delete("/delete-note/:id", async (req, res) => {
  const id = req.params.id; // Get the note ID from the URL parameter
  const query = { _id: new ObjectId(id) }; // Create a query to find the note by ID

  try {
    const result = await notesCollection.deleteOne(query); // Delete the note
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Note not found." });
    }
    res.status(200).send({ message: "Note deleted successfully." });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).send({ message: "Error deleting note." });
  }
});

// Update a note by ID
app.put("/update-note/:id", async (req, res) => {
  const { id } = req.params; // Get the note ID from URL
  const { title, description } = req.body; // Get updated data from request body

  try {
    const result = await notesCollection.updateOne(
      { _id: new ObjectId(id) }, // Correctly filter the note by ID
      { $set: { title, description } } // Use $set to update fields
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Note not found." });
    }

    const updatedNote = await notesCollection.findOne({
      _id: new ObjectId(id),
    }); // Fetch updated note

    res.status(200).send(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).send({ message: "Error updating note." });
  }
});

// GET /materials
app.get("/materials", async (req, res) => {
  const { sessionId } = req.query;

  try {
    const materials = await materialsCollection.find({ sessionId }).toArray();
    res.status(200).send(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Tutor API

// Create Study Session (POST) data in db
app.post("/create-session", async (req, res) => {
  const sessionData = req.body;
  try {
    const result = await studySessionsCollection.insertOne(sessionData);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Error creating study session" });
  }
});

// Fetch Approved Study Sessions in Home Page
app.get("/get-sessions", async (req, res) => {
  try {
    const result = await studySessionsCollection
      .find({ status: "approved" })
      .sort({ registrationEndDate: -1 })
      .limit(6)
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error fetching study sessions" });
  }
});
// Fetch All Approved Study Sessions in Home Page
app.get("/get-all-sessions", async (req, res) => {
  try {
    const result = await studySessionsCollection
      .find({ status: "approved" })
      .sort({ registrationEndDate: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error fetching study sessions" });
  }
});

// View Study Session Details by ID
app.get("/session-details/:id", async (req, res) => {
  try {
    const sessionId = req.params.id;
    const query = { _id: new ObjectId(sessionId) };
    const result = await studySessionsCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error fetching session details" });
  }
});

// Fetch all sessions to tutor dashboard
app.get("/get-tutor-sessions", async (req, res) => {
  const { tutorEmail } = req.query;
  if (!tutorEmail) {
    return res.status(400).send({ message: "Tutor email is required." });
  }

  try {
    const sessions = await studySessionsCollection
      .find({ tutorEmail })
      .toArray();
    res.status(200).send(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).send({ message: "Error fetching sessions." });
  }
});

// Re-request Approval (Change Rejected → Pending)
app.patch("/re-request-approval/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const result = await studySessionsCollection.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { status: "pending" } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Session not found." });
    }

    res.status(200).send({ message: "Approval request sent successfully." });
  } catch (error) {
    console.error("Error re-requesting approval:", error);
    res.status(500).send({ message: "Error re-requesting approval." });
  }
});

// Save a Material data in db
app.post("/upload-material", async (req, res) => {
  try {
    const material = req.body;
    const result = await materialsCollection.insertOne(material);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to insert material" });
  }
});

// Fetch materials for a specific tutor
app.get("/materials", async (req, res) => {
  const { tutorEmail } = req.query;

  if (!tutorEmail) {
    return res.status(400).send({ message: "Tutor Email is required." });
  }

  try {
    const materials = await materialsCollection.find({ tutorEmail }).toArray();
    res.status(200).send(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// GET materials by study session ID
app.get("/sessionId-material", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).send({ message: "Study session ID is required" });
    }

    const materials = await materialsCollection
      .find({ sessionId: id })
      .toArray();

    // Return an empty array if no materials are found
    res.status(200).send(materials || []);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Fetch single material
app.get("/single-material/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send({ message: "Material ID is required." });
  }

  try {
    const material = await materialsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!material) {
      return res.status(404).send({ message: "Material not found." });
    }

    res.status(200).send(material);
  } catch (error) {
    console.error("Error fetching material:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Update a material
app.put("/update-material/:id", async (req, res) => {
  const materialId = req.params.id;

  if (!ObjectId.isValid(materialId)) {
    return res.status(400).send({ message: "Invalid Material ID." });
  }

  const updatedMaterial = req.body;

  try {
    const result = await materialsCollection.updateOne(
      { _id: new ObjectId(materialId) }, // Convert to ObjectId
      { $set: updatedMaterial }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .send({ message: "Material not found or no changes made." });
    }

    res.status(200).send({ message: "Material updated successfully." });
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Delete a material
app.delete("/delete-material/:id", async (req, res) => {
  const materialId = req.params.id;

  try {
    const result = await materialsCollection.deleteOne({
      _id: new ObjectId(materialId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Material not found." });
    }

    res.status(200).send({ message: "Material deleted successfully." });
  } catch (error) {
    res.status(500).send({ message: "Internal server error" });
  }
});

// Fetch reviews for a specific session
app.get("/reviews", async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).send({ message: "Session ID is required." });
  }

  try {
    const reviews = await reviewsCollection.find({ sessionId }).toArray();
    res.status(200).send(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Fetch approved study sessions for a specific tutor
app.get("/select-study-sessions", async (req, res) => {
  const { tutorEmail, status } = req.query;

  if (!tutorEmail || !status) {
    return res
      .status(400)
      .send({ message: "Tutor email and status are required." });
  }

  try {
    const approvedSessions = await studySessionsCollection
      .find({ tutorEmail, status })
      .toArray();

    res.status(200).send(approvedSessions);
  } catch (error) {
    console.error("Error fetching approved sessions:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Fetch study sessions with pagination
app.get("/study-sessions", async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default page = 1, limit = 10

  try {
    const skip = (page - 1) * limit;
    const sessions = await studySessionsCollection
      .find()
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const totalSessions = await studySessionsCollection.countDocuments();
    res.status(200).send({ sessions, totalSessions });
  } catch (error) {
    console.error("Error fetching study sessions:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Admin API

// Create announcement (Admin only)
app.post("/create-announcement", async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and Description are required" });
    }

    const newAnnouncement = await announcementsCollection.insertOne({
      title,
      description,
    });

    res.status(201).json({
      message: "Announcement created successfully",
      announcement: newAnnouncement,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

// 📌 API Route to Fetch All Public Announcements
app.get("/public-announcements", async (req, res) => {
  try {
    const announcements = await announcementsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray(); // Convert Cursor to Array

    res.status(200).json(announcements);
  } catch (error) {
    console.error("❌ Error fetching announcements:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

// Save or Update User
app.post("/users", async (req, res) => {
  try {
    const userData = req.body;
    console.log("Received user data", userData);

    let user = await usersCollection.findOne({ email: userData.email });

    if (!user) {
      user = {
        role: "Student", // Default role for new users
        timestamp: Date.now(),
        ...userData,
      };
      await usersCollection.insertOne(user);
    }

    // Generate JWT
    const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET);
    res.send({ token, user });
  } catch (err) {
    console.error("Error in /users route:", err.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Fetch all users in manage users route
app.get("/all-users/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: { $ne: email } };
  try {
    const users = await usersCollection.find(query).toArray();
    res.status(200).send(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Error fetching users." });
  }
});

// Update user role
app.patch("/update-user-role/:id", async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  try {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role } }
    );

    if (result.modifiedCount > 0) {
      res.status(200).send({ message: "User role updated successfully." });
    } else {
      res.status(404).send({ message: "User not found." });
    }
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).send({ message: "Error updating user role." });
  }
});

// manage all study sessions
app.get("/manage-sessions", async (req, res) => {
  try {
    const result = await studySessionsCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error fetching study sessions" });
  }
});

// GET /sessions/:sessionId in manage all study sessions
app.get("/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await studySessionsCollection.findOne({
      _id: new ObjectId(sessionId),
    });

    if (!session) {
      return res.status(404).send({ message: "Session not found." });
    }

    res.status(200).send(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// update study session in admin dashboard
app.patch("/update-study-session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const updatedData = req.body;

  try {
    const result = await studySessionsCollection.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Session not found." });
    }

    res.status(200).send({ message: "Session updated successfully." });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// PATCH /approve-session/:sessionId
app.patch("/session-approve/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { isPaid, amount: registrationFee } = req.body;

  try {
    // Validate input
    if (!sessionId || isPaid === undefined || registrationFee === undefined) {
      return res.status(400).send({ message: "Required fields are missing." });
    }

    // Validate sessionId as a valid ObjectId
    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).send({ message: "Invalid session ID." });
    }

    // Validate amount based on isPaid
    if (
      isPaid &&
      (typeof registrationFee !== "number" || registrationFee <= 0)
    ) {
      return res
        .status(400)
        .send({ message: "Invalid amount for paid session." });
    }

    if (!isPaid && registrationFee !== 0) {
      return res
        .status(400)
        .send({ message: "Amount must be 0 for free sessions." });
    }

    // Update registrationFee and session status
    const result = await studySessionsCollection.updateOne(
      { _id: new ObjectId(sessionId) },
      {
        $set: {
          status: "approved",
          isPaid,
          registrationFee, // Update the existing registrationFee field
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Session not found." });
    }

    res.status(200).send({ message: "Session approved successfully." });
  } catch (error) {
    console.error("Error approving session:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// PATCH /reject-session/:sessionId
app.patch("/reject-session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Validate input
    if (!sessionId) {
      return res.status(400).send({ message: "Session ID is required." });
    }

    // Update session status to "rejected"
    const result = await studySessionsCollection.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { status: "rejected" } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Session not found." });
    }

    res.status(200).send({ message: "Session rejected successfully." });
  } catch (error) {
    console.error("Error rejecting session:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// DELETE /delete-session/:sessionId
app.delete("/delete-session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Validate input
    if (!sessionId) {
      return res.status(400).send({ message: "Session ID is required." });
    }

    // Delete the session
    const result = await studySessionsCollection.deleteOne({
      _id: new ObjectId(sessionId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Session not found." });
    }

    res.status(200).send({ message: "Session deleted successfully." });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// fetch all materials in admin dashboard
app.get("/all-materials", async (req, res) => {
  try {
    const result = await materialsCollection.find().toArray();
    res.status(200).send(result);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// DELETE /delete-material/:materialId
app.delete("/delete-material/:materialId", async (req, res) => {
  const { materialId } = req.params;

  try {
    // Validate input
    if (!materialId) {
      return res.status(400).send({ message: "Material ID is required." });
    }

    // Delete the material
    const result = await materialsCollection.deleteOne({
      _id: new ObjectId(materialId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Material not found." });
    }

    res.status(200).send({ message: "Material deleted successfully." });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Fetch All Tutors in Home Page
app.get("/get-tutors", async (req, res) => {
  try {
    const tutors = await usersCollection.find({ role: "Tutor" }).toArray(); // Filtering by role
    if (tutors.length === 0) {
      return res.status(404).send({ message: "No tutors found." }); // If no tutors are found
    }
    res.status(200).send(tutors);
  } catch (error) {
    console.error("Error fetching tutors:", error);
    res.status(500).send({ message: "Error fetching tutors." });
  }
});

// Get Tutor by ID
app.get("/tutor-details/:id", async (req, res) => {
  try {
    const tutorId = req.params.id;
    const query = { _id: new ObjectId(tutorId) };
    const tutor = await tutorsCollection.findOne(query);
    if (tutor) {
      res.status(200).send(tutor);
    } else {
      res.status(404).send({ message: "Tutor not found." });
    }
  } catch (error) {
    res.status(500).send({ message: "Error fetching tutor details." });
  }
});

// Save Tutor Review
app.post("/post-tutor-review", async (req, res) => {
  const { tutorId, studentEmail, comment, rating } = req.body;

  try {
    const result = await reviewsCollection.insertOne({
      tutorId,
      studentEmail,
      comment,
      rating,
      reviewedAt: new Date(),
    });

    if (result.insertedId) {
      res
        .status(201)
        .send({ success: true, message: "Review posted successfully." });
    } else {
      res
        .status(500)
        .send({ success: false, message: "Failed to post review." });
    }
  } catch (error) {
    console.error("Error posting review:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred while posting the review.",
    });
  }
});

// Fetch Reviews for Tutor
app.get("/get-tutor-reviews", async (req, res) => {
  const { tutorId } = req.query;

  if (!tutorId) {
    return res.status(400).send({ message: "Tutor ID is required." });
  }

  try {
    const reviews = await reviewsCollection.find({ tutorId }).toArray();
    res.status(200).send(reviews);
  } catch (error) {
    console.error("Error fetching tutor reviews:", error);
    res.status(500).send({ message: "Error fetching reviews." });
  }
});

// Server Listening
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
