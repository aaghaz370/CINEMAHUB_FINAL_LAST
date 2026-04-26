import mongoose, { Schema, Document } from 'mongoose';

export interface ISourceLink {
  label: string;
  url: string;
  type: 'stream' | 'download';
  provider: string; // e.g., 'animesalt', 'moviebox'
  quality?: string;
  language?: string;
}

export interface IContent extends Document {
  tmdb_id: number;
  imdb_id?: string;
  type: 'movie' | 'tv';
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  genres: string[];
  release_date: string;
  last_scraped: Date;
  sources: ISourceLink[];
  updatedAt: Date;
}

const SourceLinkSchema = new Schema({
  label: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['stream', 'download'], default: 'stream' },
  provider: { type: String, required: true },
  quality: { type: String },
  language: { type: String },
});

const ContentSchema: Schema = new Schema({
  tmdb_id: { type: Number, required: true, unique: true },
  imdb_id: { type: String },
  type: { type: String, enum: ['movie', 'tv'], required: true },
  title: { type: String, required: true },
  overview: { type: String },
  poster_path: { type: String },
  backdrop_path: { type: String },
  genres: [{ type: String }],
  release_date: { type: String },
  last_scraped: { type: Date, default: Date.now },
  sources: [SourceLinkSchema],
}, { timestamps: true });

export default mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);
