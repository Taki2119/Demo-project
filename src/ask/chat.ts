// ─────────────────────────────────────────────────────────────────────────────
// Hội thoại của trang Hỏi AI (bản demo). Nằm trong bộ nhớ (zustand) ⇒ rời trang rồi quay lại vẫn
// còn; F5 thì mất (không lưu đâu cả — không có gì cần giữ).
//
// Tin nhắn lưu MÃ câu hỏi + tham số + DỮ LIỆU THÔ, không lưu chữ đã dựng ⇒ đổi ngôn ngữ thì cả
// cuộc trò chuyện dựng lại theo ngôn ngữ mới (câu trả lời là hàm thuần của dữ liệu + ngôn ngữ).
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { apiConfigured, loadSource, type SourceData } from '../data/api';
import type { SourceKey } from '../nav/catalog';
import type { PlanNames, Slots } from './match';
import { resolve, resolveId, type Resolution } from './questions';

export type BotStatus = 'thinking' | 'ready' | 'failed' | 'off';

export type Message =
  | { id: number; role: 'user'; text: string | null; qid: string | null }
  | {
      id: number;
      role: 'bot';
      status: BotStatus;
      kind: 'answer' | 'suggest';
      qid: string | null;
      slots: Slots;
      /** answer ⇒ câu liên quan · suggest ⇒ câu gợi ý */
      more: string[];
      data: Partial<Record<SourceKey, SourceData>>;
    };

/** Thời gian "đang phân tích" tối thiểu — để người xem thấy được bước xử lý (không phải chờ thật). */
export const THINK_MS = 650;

interface ChatState {
  messages: Message[];
  busy: boolean;
  clear: () => void;
  /** Câu gõ tự do. */
  ask: (text: string, names: PlanNames) => Promise<void>;
  /** Bấm câu gợi ý (giữ tham số của câu đang trả lời nếu có). */
  askId: (id: string, slots?: Slots) => Promise<void>;
}

let seq = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useChat = create<ChatState>((set, get) => {
  const patchBot = (id: number, p: Partial<Extract<Message, { role: 'bot' }>>) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id && m.role === 'bot' ? { ...m, ...p } : m)) }));

  async function run(user: Extract<Message, { role: 'user' }>, res: Resolution) {
    const botId = ++seq;
    const base = { id: botId, role: 'bot' as const, status: 'thinking' as const, slots: res.slots, data: {} };
    const bot: Message =
      res.kind === 'answer'
        ? { ...base, kind: 'answer', qid: res.question.id, more: res.related.map((q) => q.id) }
        : { ...base, kind: 'suggest', qid: null, more: res.suggestions.map((q) => q.id) };
    set((s) => ({ messages: [...s.messages, user, bot], busy: true }));
    try {
      if (res.kind === 'suggest') {
        await sleep(THINK_MS / 2);
        patchBot(botId, { status: 'ready' });
        return;
      }
      if (!apiConfigured) {
        await sleep(THINK_MS / 2);
        patchBot(botId, { status: 'off' });
        return;
      }
      const needs = res.question.needs(res.slots);
      const [loaded] = await Promise.all([Promise.all(needs.map((n) => loadSource(n.source, n.params))), sleep(THINK_MS)]);
      const data: Partial<Record<SourceKey, SourceData>> = {};
      needs.forEach((n, i) => (data[n.source] = loaded[i]));
      patchBot(botId, { status: 'ready', data });
    } catch {
      patchBot(botId, { status: 'failed' });
    } finally {
      set({ busy: false });
    }
  }

  return {
    messages: [],
    busy: false,
    clear: () => set({ messages: [] }),
    ask: async (text, names) => {
      const t = text.trim();
      if (!t || get().busy) return;
      await run({ id: ++seq, role: 'user', text: t.slice(0, 300), qid: null }, resolve(t, names));
    },
    askId: async (id, slots) => {
      if (get().busy) return;
      const res = resolveId(id, slots);
      if (!res) return;
      await run({ id: ++seq, role: 'user', text: null, qid: id }, res);
    },
  };
});
