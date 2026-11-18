import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';

type AuthInput = { email: string; password: string };

type SignInData = { id: string; email: string };

type AuthResult = { id: string; email: string; token: string };

@Injectable()
export class AuthService {
  /** Verifies Google ID tokens (signature, expiry, audience) against Google's public keys. */
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) { }

  /**
   * Validates user credentials against stored data
   * @param {AuthInput} input - User credentials to validate
   * @returns {Promise<SignInData | null>} User data if credentials are valid, null otherwise
   * @example
   * const userData = await authService.validateUser({
   *   email: 'user@example.com',
   *   password: 'userpassword'
   * });
   */
  async validateUser(input: AuthInput): Promise<SignInData | null> {
    const user = await this.userService.findByEmail(input.email);
    if (!user || !user.password) {
      return null;
    }

    const isMatch = await bcrypt.compare(input.password, user.password);

    if (!isMatch) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  /**
   * Authenticates user credentials and returns JWT token
   * @param {AuthInput} input - User credentials (email and password)
   * @returns {Promise<AuthResult>} Authentication result with user details and JWT token
   * @throws {UnauthorizedException} When credentials are invalid
   * @example
   * const result = await authService.authenticate({
   *   email: 'user@example.com',
   *   password: 'userpassword'
   * });
   */
  async authenticate(input: AuthInput): Promise<AuthResult> {
    const validUser = await this.validateUser(input);
    if (!validUser) throw new UnauthorizedException('Invalid credentials');

    return this.signIn(validUser);
  }

  /**
   * Generates JWT token for an authenticated user
   * @param {SignInData} user - User data containing id and email for token generation
   * @returns {Promise<AuthResult>} Authentication result with user details and JWT token
   * @example
   * const result = await authService.signIn({
   *   id: 'user123',
   *   email: 'user@example.com'
   * });
   */
  signIn(user: SignInData): AuthResult {
    const payload = { sub: user.id, email: user.email };

    return {
      id: user.id,
      email: user.email,
      token: this.jwtService.sign(payload),
    };
  }

  /**
   * Signs a user in with a Google ID token, creating the account on first use.
   * The token must be issued for our Web OAuth client (`GOOGLE_WEB_CLIENT_ID`) and carry a
   * verified email. The email is the identity: an existing password account with the same email
   * is signed in as-is (including accounts that have no password), otherwise a new Google-only
   * account is created. Google-only accounts have a null password, which `validateUser` never
   * accepts, so they cannot be logged into with email + password.
   * @param {string} idToken - Google ID token sent by the mobile app
   * @returns {Promise<AuthResult>} Authentication result with user details and JWT token
   * @throws {UnauthorizedException} When the token is invalid, expired or for another client
   * @throws {BadRequestException} When the Google email is not verified
   * @throws {InternalServerErrorException} When `GOOGLE_WEB_CLIENT_ID` is not configured
   */
  async authenticateWithGoogle(idToken: string): Promise<AuthResult> {
    const audience = this.config.get<string>('GOOGLE_WEB_CLIENT_ID');
    if (!audience) {
      throw new InternalServerErrorException(
        'Google sign-in is not configured',
      );
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new BadRequestException('Your Google email is not verified');
    }

    // Identity only (id + email): sign-in must not depend on the rest of the row being complete.
    const user =
      (await this.userService.findIdentityByEmail(payload.email)) ??
      (await this.userService.register({
        email: payload.email,
        name: payload.name,
        password: null,
      }));

    return this.signIn({ id: user.id, email: user.email });
  }

  /**
   * Registers a new user and returns authentication token
   * @param {RegisterDto} input - User registration data
   * @returns {Promise<AuthResult>} Authentication result with user details and JWT token
   * @throws {BadRequestException} When email is already registered
   * @example
   * const result = await authService.register({
   *   email: 'user@example.com',
   *   password: 'securepassword',
   *   name: 'John Doe',
   * });
   */
  async register(input: RegisterDto): Promise<AuthResult> {
    const existing = await this.userService.findByEmail(input.email);
    if (existing) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(input.password, 10);

    const user = await this.userService.register({
      email: input.email,
      name: input.name,
      password: hashed,
    });

    return this.signIn({ id: user.id, email: user.email });
  }
}
