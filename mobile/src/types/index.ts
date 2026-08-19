/**
 * Shapes returned by the API.
 *
 * These mirror server/src/types/auth.ts and the envelope in
 * docs/05-api-plan.md. They are written by hand rather than generated, so if
 * the API changes, change them here in the same pull request.
 */

export type UserRole = 'admin' | 'coordinator' | 'donor' | 'recipient' | 'driver';

/** The roles a person can pick on the register screen. Admin is not one. */
export type RegisterableRole = Exclude<UserRole, 'admin'>;

export type UserStatus = 'active' | 'inactive';

export interface User {
  userId: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  organisationName: string | null;
  isAvailable: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  user: User;
  token: string;
}

/** Success envelope: { success: true, data: T } */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Error envelope: { success: false, message: string } */
export interface ApiFailure {
  success: false;
  message: string;
  details?: Record<string, string[]>;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: RegisterableRole;
  organisationName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

//driver
export * from './driver';
