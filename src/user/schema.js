import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true
  },
  pinboardApiToken: String
});

export default mongoose.model("User", UserSchema);
