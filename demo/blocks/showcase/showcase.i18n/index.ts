import en from './en.js';
import ru from './ru.js';
import { keyset } from '../../i18n/i18n.js';

export function messages(language?: string): typeof en {
    return keyset({ ru, en }, language);
}
