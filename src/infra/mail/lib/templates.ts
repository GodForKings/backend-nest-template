export interface EmailTemplate {
  subject: string;
  html: string;
}

/**
 * Генерирует премиальный HTML-шаблон письма для восстановления пароля в стиле Vercel / Linear.
 */
export const getResetPasswordTemplate = (resetLink: string): EmailTemplate => {
  return {
    subject: 'Восстановление доступа к аккаунту',
    html: `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Сброс пароля</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #171717;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Основной контейнер -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; border: 1px solid #eaeaea; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); overflow: hidden;">

          <!-- Верхний акцент (градиентная полоса Vercel) -->
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #000000 0%, #404040 50%, #000000 100%);"></td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding: 40px 36px 36px 36px;">

              <!-- Логотип / Иконка -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="width: 40px; height: 40px; background-color: #000000; border-radius: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L4 18H20L12 4Z" fill="#ffffff" />
                    </svg>
                  </td>
                </tr>
              </table>

              <!-- Заголовок -->
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.5px; color: #000000; line-height: 1.3;">
                Восстановление доступа
              </h1>

              <!-- Описание -->
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 24px; color: #666666;">
                Мы получили запрос на сброс пароля для вашей учетной записи. Нажмите кнопку ниже, чтобы задать новый пароль:
              </p>

              <!-- Кнопка действия (CTA) -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #000000;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: -0.2px;">
                      Сбросить пароль →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Блок безопасности / Информация -->
              <div style="background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; line-height: 19px; color: #737373;">
                  ⏳ <b>Срок действия:</b> ссылка активна в течение <b>1 часа</b>. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                </p>
              </div>

              <!-- Разделитель -->
              <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 0 0 24px 0;" />

              <!-- Прямая ссылка -->
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a3a3a3; word-break: break-all;">
                Если кнопка не открывается, скопируйте ссылку в браузер:<br />
                <a href="${resetLink}" target="_blank" style="color: #525252; text-decoration: underline;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Футер карточки -->
          <tr>
            <td style="padding: 18px 36px; background-color: #fafafa; border-top: 1px solid #eaeaea; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                Автоматическое системное уведомление безопасности
              </p>
            </td>
          </tr>
        </table>

        <!-- Нижний копирайт -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; margin-top: 24px;">
          <tr>
            <td align="center" style="font-size: 12px; color: #a3a3a3;">
              © ${new Date().getFullYear()} Все права защищены.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
};
