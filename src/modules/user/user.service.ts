import { ConflictException, Injectable } from '@nestjs/common';
import { User } from './domain/user.model';
import { UserRepository } from './repository/user.repository';

@Injectable()
export class UserService {
    constructor(private readonly repo: UserRepository) { }

    async register(data: {
        email: string;
        password: string;
        name?: string;
    }): Promise<User> {
        const exists = await this.repo.findByEmail(data.email);
        if (exists) throw new ConflictException('Email already registered');
        return this.repo.create({
            email: data.email,
            password: data.password,
            name: data.name ?? '',
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.repo.findByEmail(email);
    }

    async getById(id: string): Promise<User | null> {
        return this.repo.findById(id);
    }
}