import type { User, UserRole } from '@playplus/shared';

type PasswordVerifier = (plain: string, hash: string) => Promise<boolean>;

interface UserPersistenceProps {
  id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: Date;
}

export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: Date;

  private readonly passwordHash: string;

  private constructor(props: UserPersistenceProps) {
    this.id = props.id;
    this.email = props.email;
    this.role = props.role;
    this.passwordHash = props.passwordHash;
    this.createdAt = props.createdAt;
  }

  static fromPersistence(props: UserPersistenceProps): UserEntity {
    return new UserEntity(props);
  }

  toUser(): User {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt.toISOString(),
    };
  }

  verifyPassword(plain: string, verify: PasswordVerifier): Promise<boolean> {
    return verify(plain, this.passwordHash);
  }
}
