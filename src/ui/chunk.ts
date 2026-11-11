// Nạp động chunk biểu đồ (kit 01 §1): deploy mới xoá chunk cũ ⇒ tab đang mở gọi import() lỗi.
//   · lỗi ⇒ reload trang ĐÚNG 1 lần (cờ trong sessionStorage);
//   · không reload khi offline hoặc không có storage (tránh vòng lặp vô hạn) ⇒ ném lỗi cho ErrorBoundary;
//   · đã quyết reload ⇒ trả promise không bao giờ xong để <Suspense> giữ vòng chờ.
// Môi trường truyền qua `env` (bẫy #13: hàm thuần không đọc thẳng biến toàn cục).

export interface ChunkEnv {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  online: boolean;
  reload: () => void;
}

const FLAG = 'saas-analytics.chunk-reload';

function browserEnv(): ChunkEnv {
  let storage: ChunkEnv['storage'] = null;
  try {
    storage = window.sessionStorage;
    storage.getItem(FLAG);
  } catch {
    storage = null;
  }
  return { storage, online: navigator.onLine, reload: () => window.location.reload() };
}

export function boardChunk<T>(key: string, load: () => Promise<T>, env: () => ChunkEnv = browserEnv): () => Promise<T> {
  const flag = `${FLAG}:${key}`;
  return () =>
    load().then(
      (mod) => {
        env().storage?.removeItem(flag);
        return mod;
      },
      (err: unknown) => {
        const e = env();
        if (!e.online || !e.storage || e.storage.getItem(flag)) throw err;
        e.storage.setItem(flag, '1');
        e.reload();
        return new Promise<T>(() => {});
      },
    );
}
