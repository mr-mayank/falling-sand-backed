import jwt from "jsonwebtoken";

const secret = "battleArena";

const auth = async (req, res, next) => {
  try {
    const token = req.headers["accesstoken"]?.split(" ")[1];

    if (!token) {
      return res.status(403).json({
        Status: "failure",
        Error: {
          message: "Unauthorized. No token provided.",
          name: "AuthenticationError",
          code: "EX-00103",
        },
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user_Id = decoded.id; // Attach user ID to request
    next();
  } catch (error) {
    res.status(403).json({
      Status: "failure",
      Error: {
        message: "Invalid or expired token.",
        name: "AuthenticationError",
        code: "EX-00105",
      },
    });
  }
};

export default auth;
