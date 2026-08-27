import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { getResetPasswordTemplate } from './lib/templates';

@Injectable()
export class MailService {
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'App <onboarding@resend.dev>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      Logger.warn(
        'RESEND_API_KEY не задан в переменных окружения. В режиме разработки ссылки будут выводиться в консоль.',
        'MailService',
      );
    }
  }

  /**
   * Отправка письма для восстановления пароля.
   */
  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3044';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const { subject, html } = getResetPasswordTemplate(resetLink);

    if (!this.resend) {
      Logger.log(
        `[DEV MODE] Ссылка для сброса пароля (${email}): ${resetLink}`,
        'MailService',
      );
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html,
      });

      if (response.error) {
        throw new BadRequestException(
          'Не удалось отправить письмо для сброса пароля. Попробуйте позже.',
        );
      }
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Произошла ошибка при отправке письма. Пожалуйста, попробуйте позже.',
      );
    }
  }
}
