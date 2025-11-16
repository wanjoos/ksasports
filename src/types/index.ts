// Environment bindings
export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  profile_image_url?: string;
  height_cm?: number;
  created_at: string;
  updated_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

// Workout types
export type WorkoutType = 'RUN' | 'WALK' | 'BIKE' | 'BADMINTON' | 'WEIGHT' | 'OTHER';

export interface Workout {
  id: string;
  user_id: string;
  workout_type: WorkoutType;
  started_at: string;
  duration_min: number;
  distance_km?: number;
  pace_sec_per_km?: number;
  calories?: number;
  memo?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutWithUser extends Workout {
  user: User;
  images: string[];
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

// Comment types
export interface Comment {
  id: string;
  workout_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface CommentWithUser extends Comment {
  user: User;
}

// Like types
export interface Like {
  id: string;
  workout_id: string;
  user_id: string;
  created_at: string;
}

// Weight log types
export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  created_at: string;
}

// Stats types
export interface WorkoutStats {
  range: 'weekly' | 'monthly';
  total_distance_km: number;
  total_duration_min: number;
  workout_count: number;
  by_date: Array<{
    date: string;
    distance_km: number;
    duration_min: number;
  }>;
  by_type: Array<{
    workout_type: WorkoutType;
    distance_km: number;
    duration_min: number;
    count: number;
  }>;
}

export interface Highlights {
  longest_distance_km: number;
  longest_duration_min: number;
  streak_days: number;
}

// JWT Payload
export interface JWTPayload {
  sub: string; // user id
  email: string;
  exp: number;
}
