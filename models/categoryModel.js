import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "category  is required"],
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    icon: String,
    image: String,
    accent: String,
  },
  { timestamps: true }
);

export const categoryModel = mongoose.model("Category", categorySchema);
export default categoryModel;
