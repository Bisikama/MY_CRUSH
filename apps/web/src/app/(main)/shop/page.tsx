'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Card } from '@duoquest/ui';
import { actionId, api, loadIdentity } from '../../../lib/client';
import { usePlatform } from '../../../providers/platform-provider';
import styles from './shop.module.css';
interface Item {
  id: string;
  name: string;
  price: number;
  kind: string;
  slot: string | null;
}
interface Owned {
  items: { itemId: string; quantity: number }[];
  loadout: { itemId: string; slot: string }[];
}
export default function ShopPage() {
  const { refreshProfile, identity } = usePlatform();
  const [items, setItems] = useState<Item[]>([]);
  const [owned, setOwned] = useState<Owned>({ items: [], loadout: [] });
  const [balance, setBalance] = useState(0);
  const [message, setMessage] = useState('');
  const [purchaseToast, setPurchaseToast] = useState<{ itemName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const requestIds = useRef(new Map<string, string>());
  const refresh = useCallback(async () => {
    const guest = await loadIdentity();
    if (!guest) throw new Error('Hãy tạo hồ sơ khách ở trang Chơi trước.');
    const [catalog, inventory, profile] = await Promise.all([
      api<Item[]>('/shop/items'),
      api<Owned>('/shop/inventory'),
      api<{ wallet: { balance: number } }>('/players/me'),
    ]);
    setItems(catalog);
    setOwned(inventory);
    setBalance(profile.wallet.balance);
  }, []);
  useEffect(() => {
    void refresh().catch((error: unknown) =>
      setMessage(error instanceof Error ? error.message : 'Không tải được cửa hàng'),
    );
  }, [refresh]);
  useEffect(() => {
    if (!purchaseToast) return;
    const timeout = window.setTimeout(() => setPurchaseToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [purchaseToast]);
  async function purchase({ id: itemId, name: itemName }: Item) {
    setBusy(true);
    setMessage('');
    const requestId = requestIds.current.get(itemId) ?? actionId();
    requestIds.current.set(itemId, requestId);
    try {
      await api('/shop/purchases', { itemId, requestId });
      requestIds.current.delete(itemId);
      setPurchaseToast({ itemName });
      await Promise.all([refresh(), refreshProfile()]).catch(() =>
        setMessage('Đã đổi vật phẩm, nhưng chưa cập nhật được số dư và kho đồ. Hãy tải lại trang.'),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không mua được');
    } finally {
      setBusy(false);
    }
  }
  async function equip(itemId: string) {
    setBusy(true);
    try {
      await api('/shop/equip', { itemId });
      await refresh();
      setMessage('Đã lưu vật phẩm vào loadout. Phần hiển thị skin trong trận còn ở backlog.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không trang bị được');
    } finally {
      setBusy(false);
    }
  }
  const toastAnchor = purchaseToast ? document.getElementById('site-header') : null;
  return (
    <div className="narrow">
      <p className="eyebrow">CỬA HÀNG & KHO ĐỒ</p>
      <h1>
        Một chút <em>cá tính riêng.</em>
      </h1>
      <p className="lead">
        Cosmetic không thay đổi điểm hoặc luật chơi. Bạn đang có <strong>{balance} Coins</strong>.
      </p>
      <div className="sr-only" role="status" aria-atomic="true">
        {purchaseToast && `Đổi vật phẩm thành công. ${purchaseToast.itemName} đã vào kho của bạn.`}
      </div>
      {purchaseToast &&
        toastAnchor &&
        createPortal(
          <div className={styles.toast}>
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="m5 12 4 4L19 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className={styles.copy} aria-hidden="true">
              <strong>Đổi vật phẩm thành công</strong>
              <span>{purchaseToast.itemName} đã vào kho của bạn.</span>
            </div>
            <button
              className={styles.dismiss}
              type="button"
              aria-label="Đóng thông báo đổi vật phẩm"
              onClick={() => setPurchaseToast(null)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>,
          toastAnchor,
        )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="mode-grid">
        {items.map((item) => {
          const quantity = owned.items.find((row) => row.itemId === item.id)?.quantity ?? 0;
          if (item.kind === 'SKILL')
            return (
              <Card key={item.id}>
                <span className="tag">SKILL</span>
                <h2>{item.name}</h2>
                <p>
                  {item.price} Coins · Trong kho: {quantity} lượt
                </p>
                <Button
                  disabled={busy || balance < item.price || identity?.kind !== 'account'}
                  onClick={() => void purchase(item)}
                >
                  Đổi 1 lượt
                </Button>
              </Card>
            );
          const has = quantity > 0;
          const equipped = owned.loadout.some((row) => row.itemId === item.id);
          return (
            <Card key={item.id}>
              <span className="avatar">✦</span>
              <h2>{item.name}</h2>
              <p>{item.price} Coins</p>
              <Button
                disabled={busy || equipped || (!has && balance < item.price)}
                variant={has ? 'outline' : 'default'}
                onClick={() => {
                  if (has) void equip(item.id);
                  else void purchase(item);
                }}
              >
                {equipped ? 'Đang trang bị' : has ? 'Trang bị' : 'Mua vật phẩm'}
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 24 }}>
        Đăng nhập tài khoản để đổi Skill. Mỗi lần đổi thêm một lượt, giữ trong kho đến khi sử dụng.
      </p>
    </div>
  );
}
