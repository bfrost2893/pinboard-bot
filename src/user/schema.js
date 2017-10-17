import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  pinboardToken: String,
  pinboardUsername: String
});

export default mongoose.model("User", UserSchema);
