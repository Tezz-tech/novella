import bcrypt from 'bcryptjs';

/** bcrypt with 12 rounds (CLAUDE.md). bcryptjs is the pure-JS build of the same algorithm. */
export const BCRYPT_ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
