import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';

export type TelegramActionType = 'business' | 'product' | 'payment' | 'promotion';
export type TelegramAction = { type: TelegramActionType; id: string };
type TelegramResult = { ok: boolean; status: number; description?: string; result?: unknown };

async function recordNotification(title: string, status: 'sent' | 'failed' | 'skipped', attempts: number, providerStatus?: number, providerDescription?: string) {
  try {
    const { db } = getAdminServices();
    await db.collection('notifications').doc().create({
      channel: 'telegram', title, status, attempts,
      ...(typeof providerStatus === 'number' ? { providerStatus } : {}),
      ...(providerDescription ? { providerDescription: providerDescription.slice(0, 500) } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) { console.error('[telegram] notification log failed', error); }
}

export function telegramActionKeyboard(action?: TelegramAction) {
  if (!action || !/^[A-Za-z0-9_-]{1,32}$/.test(action.id)) return undefined;
  const approve = `lokava|${action.type}|${action.id}|approve`;
  const reject = `lokava|${action.type}|${action.id}|reject`;
  if (approve.length > 64 || reject.length > 64) return undefined;
  return { inline_keyboard: [[
    { text: '✅ Setujui', callback_data: approve },
    { text: '❌ Tolak', callback_data: reject },
  ]] };
}

export async function telegramApiRequest(method: string, payload: Record<string, unknown>): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, status: 0, description: 'TELEGRAM_BOT_TOKEN belum diatur.' };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(8000), cache: 'no-store',
    });
    const body = await response.json().catch(() => null) as { ok?: boolean; description?: string; result?: unknown } | null;
    return { ok: response.ok && body?.ok !== false, status: response.status, description: body?.description, result: body?.result };
  } catch (error) {
    return { ok: false, status: 0, description: error instanceof Error ? error.message : 'Koneksi ke Telegram gagal.' };
  }
}

async function sendTelegram(method: 'sendMessage' | 'sendPhoto', payload: Record<string, unknown>, title: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.info('[telegram] notification skipped: bot or chat is not configured');
    void recordNotification(title, 'skipped', 0, undefined, 'TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur.');
    return false;
  }
  let last: TelegramResult = { ok: false, status: 0, description: 'Tidak ada respons dari Telegram.' };
  for (let attempt = 1; attempt <= 2; attempt++) {
    last = await telegramApiRequest(method, { chat_id: chatId, ...payload });
    if (last.ok) {
      void recordNotification(title, 'sent', attempt, last.status, last.description);
      return true;
    }
    console.error(`[telegram] ${method} failed`, last.status, last.description, 'attempt', attempt);
    if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  void recordNotification(title, 'failed', 2, last.status || undefined, last.description);
  return false;
}

/** Best-effort group notification; a Telegram outage must never roll back a saved business operation. */
export async function notifyAdminTelegram(message: string, action?: TelegramAction): Promise<boolean> {
  const title = (message.split('\n')[0] || 'LOKAVA notification').slice(0, 120);
  const replyMarkup = telegramActionKeyboard(action);
  return sendTelegram('sendMessage', {
    text: message.slice(0, 3500),
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  }, title);
}

/** Sends the private Cloudinary proof through a signed delivery URL to the configured admin group. */
export async function notifyAdminTelegramPhoto(photoUrl: string, caption: string, action: TelegramAction): Promise<boolean> {
  const title = (caption.split('\n')[0] || 'Bukti pembayaran LOKAVA').slice(0, 120);
  const replyMarkup = telegramActionKeyboard(action);
  if (!photoUrl || !replyMarkup) return notifyAdminTelegram(caption, action);
  const sent = await sendTelegram('sendPhoto', {
    photo: photoUrl,
    caption: caption.slice(0, 900),
    reply_markup: replyMarkup,
  }, title);
  if (sent) return true;
  return sendTelegram('sendMessage', { text: `${caption}\nFoto bukti tidak dapat dilampirkan otomatis. Periksa bukti melalui dashboard admin.`, reply_markup: replyMarkup }, title);
}
