import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';

type AuthInput = { email: string; password: string };

type SignInData = { id: string; email: string };

type AuthResult = { id: string; email: string; token: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
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
  async signIn(user: SignInData): Promise<AuthResult> {
    const payload = { sub: user.id, email: user.email };

    return {
      id: user.id,
      email: user.email,
      token: this.jwtService.sign(payload),
    };
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
