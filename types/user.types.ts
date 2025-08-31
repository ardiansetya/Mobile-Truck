export interface ProfileResponse {
  id: string;
  username: string;
  refreshToken: string;
  email: string;
  role: string;
  phone_number: string;
  age: number;
}

export interface UpdateProfilePayload {
  username: string;
  email: string;
  phone_number: string;
  age: number;
}

export interface UpdatePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  phone_number: string;
  age: number;
}

export interface UserAvailableResponse {
  id: string;
  username: string;
}
