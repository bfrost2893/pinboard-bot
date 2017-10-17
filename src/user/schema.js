import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    require: true
  },
  pinboardToken: String,
  pinboardUsername: String
});

export default mongoose.model("User", UserSchema);
