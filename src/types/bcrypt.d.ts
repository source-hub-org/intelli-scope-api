// src/types/bcrypt.d.ts
declare module 'bcrypt' {
  /**
   * Generate a salt
   * @param rounds Number of rounds to use, defaults to 10 if omitted
   * @param callback Callback receiving the error, if any, and the generated salt
   */
  export function genSalt(rounds?: number): Promise<string>;
  export function genSalt(
    rounds: number,
    callback: (err: Error | null, salt: string) => void,
  ): void;
  export function genSalt(
    callback: (err: Error | null, salt: string) => void,
  ): void;

  /**
   * Generate a hash for the plaintext password
   * @param data The plaintext password to hash
   * @param saltOrRounds The salt or number of rounds to use
   * @param callback Callback receiving the error, if any, and the generated hash
   */
  export function hash(
    data: string,
    saltOrRounds: string | number,
  ): Promise<string>;
  export function hash(
    data: string,
    saltOrRounds: string | number,
    callback: (err: Error | null, encrypted: string) => void,
  ): void;

  /**
   * Compare the plaintext password with the hash
   * @param data The plaintext password to compare
   * @param encrypted The hash to compare against
   * @param callback Callback receiving the error, if any, and the comparison result
   */
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function compare(
    data: string,
    encrypted: string,
    callback: (err: Error | null, same: boolean) => void,
  ): void;

  /**
   * Get the number of rounds used to encrypt a hash
   * @param encrypted Hash from which to extract the number of rounds used
   * @param callback Callback receiving the error, if any, and the number of rounds
   */
  export function getRounds(encrypted: string): number;
}
