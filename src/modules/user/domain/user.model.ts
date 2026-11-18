export class User {
  id!: string;
  email!: string;
  /** bcrypt hash; null for accounts without a password (e.g. Google sign-in). */
  password!: string | null;
  name!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
