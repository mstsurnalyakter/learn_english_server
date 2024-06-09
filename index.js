const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//building middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://learn-english-e286d.web.app",
    "https://learn-english-e286d.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());

//custom middleware
const verifyToken = (req, res, next) => {
  // console.log("inside verify token",req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access." });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access." });
    }
    req.user = decoded;
    next();
  });
};




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jimwvxl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("learnEnglish");
    const usersCollection = db.collection("users");
    const studySessionsCollection = db.collection("studySessions");
    const reviewsCollection = db.collection("reviews");
    const bookedSessionsCollection = db.collection("bookedSessions");
    const notesCollection = db.collection("notes");
    const materialsCollection = db.collection("materials");

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      console.log("admin middleware");
      const user = req.user;
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);

      if (!result || result?.role !== "admin") {
        return res.status(401).send({ message: "unauthorized access." });
      }

      next();
    };

    // verify tutor middleware
    const verifyTutor = async (req, res, next) => {
      console.log("tutor middleware");
      const user = req.user;
      const query = { email: user?.email };
      const result = await usersCollection.findOne(query);

      if (!result || result?.role !== "tutor") {
        return res.status(401).send({ message: "unauthorized access." });
      }

      next();
    };

    //jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // create-payment-intent
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      const registrationFee = req.body.registrationFee;
      const priceInCent = parseFloat(registrationFee) * 100;
      if (!registrationFee || priceInCent < 1) return;
      // generate clientSecret
      const { client_secret } = await stripe.paymentIntents.create({
        amount: priceInCent,
        currency: "usd",
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      });
      // send clientSecret as response
      res.send({ clientSecret: client_secret });
    });

    // save a user data in database
    app.put("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user?.email };
      // check if user already exists in db
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        return res.send(isExist);
      }

      // save user for the first time
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);

      //   // welcome new user
      //   sendEmail(user?.email, {
      //     subject: "Welcome to LearnEnglish!",
      //     message: `Hope you will find you destination`,
      //   });
      res.send(result);
    });

    //----------------------- general api -----------------------------//
    app.get("/session/:id", verifyToken, async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await studySessionsCollection.findOne(query);
      res.send(result);
    });

    app.get("/tutors/:tutor", async (req, res) => {
      const query = { role: req.params.tutor };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/sessions/:approved", async (req, res) => {
      const query = { status: req.params.approved };
      const result = await studySessionsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    //---------------------- student related api-------------------------//
    app.post("/review", verifyToken, async (req, res) => {
      const result = await reviewsCollection.insertOne(req.body);
      res.send(result);
    });

    app.post("/note", verifyToken, async (req, res) => {
      const result = await notesCollection.insertOne(req.body);
      res.send(result);
    });

    app.get("/note/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await notesCollection.find({ email }).toArray();
      res.send(result);
    });

    app.delete("/note/:id", verifyToken, async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await notesCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/note/:id", verifyToken, async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: req.body,
      };
      const result = await notesCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/reviews/:id",verifyToken, async (req, res) => {
      const query = { sessionID: req.params.id };
      const result = await reviewsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/booking", verifyToken, async (req, res) => {
      const bookingInfo = req.body;
      const id = bookingInfo?.sessionID;

      const alreadyBooked = await bookedSessionsCollection.findOne({
        "student.email": bookingInfo?.student?.email,
        sessionID: id,
      });

      // check student already booked the session
      if (alreadyBooked) {
        return res.status(400).send(`You have already booked this season`);
      }

      const result = await bookedSessionsCollection.insertOne(bookingInfo);

      const updateDoc = {
        $inc: { students: 1 },
      };
      const query = { _id: new ObjectId(id) };

      await studySessionsCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    app.get("/bookingSession/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "student.email": email };
      const result = await bookedSessionsCollection.find(query).toArray();
      res.send(result);
    });

    //---------------------- tutor related api-------------------------//
    app.post("/create-study-session", verifyToken,verifyTutor, async (req, res) => {
      const result = await studySessionsCollection.insertOne(req.body);
      res.send(result);
    });

    app.post("/upload-material", verifyToken, verifyTutor, async (req, res) => {
      console.log(req.body);
      const result = await materialsCollection.insertOne(req.body);
      res.send(result);
    });

    app.get(
      "/tutorMaterials/:email",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const result = await materialsCollection
          .find({ email: req.params.email })
          .toArray();
        res.send(result);
      }
    );

    app.get("/material/:id", verifyToken, verifyTutor, async (req, res) => {
      const result = await materialsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      res.send(result);
    });

    app.put(
      "/material/update/:id",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const query = { _id: new ObjectId(req.params.id) };
        console.log(req.body);
        const updateDoc = {
          $set: req.body,
        };
        const result = await materialsCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    app.delete("/material/:id", verifyToken, verifyTutor, async (req, res) => {
      const result = await materialsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.get(
      "/study-session/:email",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const result = await studySessionsCollection
          .find({ "user.email": req.params.email })
          .toArray();
        res.send(result);
      }
    );

    app.get(
      "/sessions/approved/:email",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const query = {
          "user.email": req.params.email,
          status: "approved",
        };

        console.log(query);
        const result = await studySessionsCollection.find(query).toArray();
        res.send(result);
      }
    );

    // Update status
    app.patch(
      "/study-session/:id",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const id = req.params.id;
        const status = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: status,
        };
        const result = await studySessionsCollection.updateOne(
          query,
          updateDoc
        );
        res.send(result);
      }
    );

    // --------------------admin related api------------------------//

    //get all session
    app.get("/study-sessions", verifyToken, verifyAdmin, async (req, res) => {
      const result = await studySessionsCollection.find().toArray();
      res.send(result);
    });

    app.delete(
      "/allMaterial/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const result = await materialsCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      }
    );

    app.get("/allMaterials", verifyToken, verifyAdmin, async (req, res) => {
      // const result = await materialsCollection.find().toArray();
      // res.send(result);
      const page = parseInt(req.query.page) - 1;
      const size = parseInt(req.query.size);

      const result = await materialsCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });


      app.get(
        "/materials-count",
        verifyToken,
        verifyAdmin,
        async (req, res) => {
          const count = await materialsCollection.countDocuments();
          res.send({ count });
        }
      );



    //get all users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/all-users",verifyToken,verifyAdmin, async(req,res)=>{
      const page = parseInt(req.query.page) - 1;
      const size = parseInt(req.query.size);

      const result = await usersCollection
        .find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

      app.get("/users-count", verifyToken, verifyAdmin, async (req, res) => {
        const count = await usersCollection.countDocuments();
        res.send({ count });
      });

    // Update registrationFee
    app.patch(
      "/study-session-registrationFee/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const registrationFee = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: registrationFee,
        };
        const result = await studySessionsCollection.updateOne(
          query,
          updateDoc
        );
        res.send(result);
      }
    );

    //update user role
    app.patch("/users/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email };
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from LearnEnglish Server..");
});

app.listen(port, () => {
  console.log(`LearnEnglish is running at : http://localhost:${port}`);
});
