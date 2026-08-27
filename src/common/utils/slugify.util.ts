/**
 * Преобразует произвольный текст (включая русский) в безопасный URL slug (ЧПУ).
 * Пример: "Платья и сарафаны (Новинки!)" -> "platya-i-sarafany-novinki"
 */
export const slugify = (text: string): string => {
  const ruMap: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };

  return text
    .toString()
    .toLowerCase()
    .trim()
    .split('')
    .map((char) => ruMap[char] ?? char)
    .join('')
    .replace(/[^\w\s-]/g, '') /* Удаляем спецсимволы */
    .replace(/[\s_-]+/g, '-') /* Заменяем пробелы и подчеркивания на дефис */
    .replace(/^-+|-+$/g, ''); /* Удаляем дефисы в начале и конце */
};
