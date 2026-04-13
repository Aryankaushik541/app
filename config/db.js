import mongoose from "mongoose";
import colors from "colors";
import { seedStoreData } from "../utils/seedData.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await seedStoreData();

    console.log(
      `MongoDB Connected ${mongoose.connection.host}`.bgGreen.white
    );
  } catch (error) {
    console.log(`MongoDB Error ${error}`.bgRed.white);
    process.exit(1);
  }
};

export default connectDB;
