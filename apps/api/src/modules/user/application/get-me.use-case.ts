import { UserNotFoundError, type User } from '@playplus/shared';

import type { UserRepository } from '../infra/user.repository.ts';

interface GetMeInput {
  userId: string;
}

export class GetMeUseCase {
  private readonly userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async execute(input: GetMeInput): Promise<User> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    return user.toUser();
  }
}
