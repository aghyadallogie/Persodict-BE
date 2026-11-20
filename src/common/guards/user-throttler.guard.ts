import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limits per logged-in user instead of per IP (many users share one IP behind a mobile
 * carrier or office network, and one user can switch IPs). Put it after the JWT guard so that
 * `request.user` is already set; it falls back to the IP only if it is not.
 *
 * The counters live in memory, so each server instance counts separately: on a serverless host
 * like Vercel this bounds sustained abuse rather than giving an exact limit.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    return Promise.resolve(user?.userId ?? String(req.ip));
  }
}
