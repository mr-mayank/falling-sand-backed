import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const secret = "battleArena";

export const signin = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    let oldUser;

    if (email) {
      oldUser = await User.findOne({ email });
    } else {
      oldUser = await User.findOne({ username });
    }

    if (!oldUser) {
      return res.status(403).json({
        Status: "failure",
        Error: {
          message:
            "Email or password seems to be wrong, please try again with valid credentials.",
          name: "ValidationError",
          code: "EX-00101",
        },
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, oldUser.password);

    if (!isPasswordCorrect) {
      return res.status(403).json({
        Status: "failure",
        Error: {
          message:
            "Email or password seems to be wrong, please try again with valid credentials.",
          name: "ValidationError",
          code: "EX-00101",
        },
      });
    }

    const token = jwt.sign(
      { username: oldUser.username, id: oldUser._id },
      secret,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({
      Status: "success",
      Data: {
        id: oldUser._id,
        username: oldUser.username || "",
        email: oldUser.email || "",
        token,
      },
    });
  } catch (err) {
    res.status(500).json({
      Status: "failure",
      Error: {
        message: "Something went wrong, please try again later.",
        name: "ServerError",
        code: "EX-500",
      },
    });
  }
};

export const signup = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    let oldUser;

    if (email) {
      oldUser = await User.findOne({ email });
    } else {
      oldUser = await User.findOne({ username });
    }

    if (oldUser) {
      return res.status(403).json({
        Status: "failure",
        Error: {
          message: "User already exists",
          name: "DuplicateError",
          code: "EX-00102",
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await User.create({
      email: email || "",
      password: hashedPassword,
      username: username || "",
    });

    const token = jwt.sign(
      { username: result.username, id: result._id },
      secret,
      {
        expiresIn: "1h",
      }
    );

    res.status(201).json({
      Status: "success",
      Data: {
        id: result._id,
        username: result.username,
        email: result.email || "",
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      Status: "failure",
      Error: {
        message: "Something went wrong, please try again later.",
        name: "ServerError",
        code: "EX-500",
      },
    });

    console.log(error);
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const token = req.headers["accesstoken"]?.split(" ")[1]; // Extract token from header
    if (!token) {
      return res.status(403).json({
        Status: "failure",
        Error: {
          message: "Unauthorized. Token is required.",
          name: "AuthenticationError",
          code: "EX-00103",
        },
      });
    }

    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select("username email");
    if (!user) {
      return res.status(403).json({
        Status: "failure",
        Error: {
          message: "User not found.",
          name: "NotFoundError",
          code: "EX-00104",
        },
      });
    }

    res.status(200).json({
      Status: "success",
      Data: {
        id: user._id,
        name: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      Status: "failure",
      Error: {
        message: "Something went wrong, please try again later.",
        name: "ServerError",
        code: "EX-500",
      },
    });
  }
};
