import mongoose, { Schema, Document, Model } from 'mongoose';
import { createHybridModel } from '@/lib/db/hybridModel';

export interface ISetting extends Document {
  key: string;
  value: string;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const MongooseSetting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);

const Setting = createHybridModel<ISetting>('settings', MongooseSetting);

export default Setting;
