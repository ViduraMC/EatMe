import { api } from './client';
import type { ApiSuccess, AuthPayload, LoginInput, RegisterInput, User } from '../types';

/**
 * Auth endpoints. docs/05-api-plan.md.
 *
 * Each module adds its own file next to this one, for example donations.api.ts,
 * so nobody has to touch a shared file to add a request.
 */

export async function registerRequest(input: RegisterInput): Promise<AuthPayload> {
  const { data } = await api.post<ApiSuccess<AuthPayload>>('/auth/register', input);
  return data.data;
}

export async function loginRequest(input: LoginInput): Promise<AuthPayload> {
  const { data } = await api.post<ApiSuccess<AuthPayload>>('/auth/login', input);
  return data.data;
}

export async function meRequest(): Promise<User> {
  const { data } = await api.get<ApiSuccess<{ user: User }>>('/auth/me');
  return data.data.user;
}

/** Closes the signed-in account for good. The server asks for the password again. */
export async function deleteAccountRequest(password: string): Promise<void> {
  await api.delete('/auth/me', { data: { password } });
}
