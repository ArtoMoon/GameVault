import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPlatformGame {
  slug: string;
  name: string;
  icon: string;
  description?: string;
}

export interface IPlatform {
  /** Benzersiz kimlik / URL slug (örn: 'riot', 'steam', 'epic', 'custom') */
  slug: string;
  /** Platform adı (örn: "Riot Games", "Steam", "Epic Games", "Ubisoft") */
  name: string;
  /** Platform simgesi veya emojisi (örn: "🔴", "💨", "⚡", "🎮") */
  icon: string;
  /** Tema / Vurgu rengi (örn: "#ef4444", "#38bdf8") */
  color: string;
  /** İsteğe bağlı açıklama */
  description?: string;
  /** Platforma ait oyunlar */
  games: IPlatformGame[];
  /** Varsayılan / Sistem platformu mu? */
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPlatformDocument extends IPlatform, Document {}

const PlatformGameSchema = new Schema<IPlatformGame>(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: '🎮',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const PlatformSchema = new Schema<IPlatformDocument>(
  {
    slug: {
      type: String,
      required: [true, 'Platform slug zorunludur'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Platform adı zorunludur'],
      trim: true,
      maxlength: [50, 'Platform adı en fazla 50 karakter olabilir'],
    },
    icon: {
      type: String,
      default: '🎮',
      trim: true,
    },
    color: {
      type: String,
      default: '#3b82f6',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Açıklama en fazla 200 karakter olabilir'],
    },
    games: {
      type: [PlatformGameSchema],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'platforms',
  }
);

delete mongoose.models.Platform;
const Platform: Model<IPlatformDocument> =
  mongoose.model<IPlatformDocument>('Platform', PlatformSchema);

export default Platform;
