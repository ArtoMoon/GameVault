import mongoose, { Document, Model, Schema } from 'mongoose';
import { createHybridModel } from '@/lib/db/hybridModel';

export interface ICategory {
  /** Kategori adı (örn: "Main", "Smurf", "Dereceli", "ARAM") */
  name: string;
  /** Rozet rengi (hex veya tailwind renk kodu, örn: "#3b82f6", "#eab308") */
  color: string;
  /** İkon veya emoji (örn: "⭐", "💼", "🔥", "🎮", "📁") */
  icon: string;
  /** İsteğe bağlı açıklama */
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICategoryDocument extends ICategory, Document {}

const CategorySchema = new Schema<ICategoryDocument>(
  {
    name: {
      type: String,
      required: [true, 'Kategori adı zorunludur'],
      unique: true,
      trim: true,
      maxlength: [40, 'Kategori adı en fazla 40 karakter olabilir'],
    },
    color: {
      type: String,
      default: '#3b82f6',
      trim: true,
    },
    icon: {
      type: String,
      default: '📁',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Açıklama en fazla 200 karakter olabilir'],
    },
  },
  {
    timestamps: true,
    collection: 'categories',
  }
);

delete mongoose.models.Category;
const MongooseCategory: Model<ICategoryDocument> =
  mongoose.model<ICategoryDocument>('Category', CategorySchema);

const Category = createHybridModel<ICategoryDocument>('categories', MongooseCategory);

export default Category;
