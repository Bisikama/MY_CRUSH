'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card } from '@duoquest/ui';
import { actionId, api, loadIdentity } from '../../lib/client';
interface Item {
  id: string;
  name: string;
  price: number;
  slot: string | null;
}
interface Owned {
  items: { itemId: string; quantity: number }[];
  loadout: { itemId: string; slot: string }[];
}
export default function ShopPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [owned, setOwned] = useState<Owned>({ items: [], loadout: [] });
  const [balance, setBalance] = useState(0);
  const [message, setMessage] = useState('');
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
  async function purchase(itemId: string) {
    setBusy(true);
    setMessage('');
    const requestId = requestIds.current.get(itemId) ?? actionId();
    requestIds.current.set(itemId, requestId);
    try {
      await api('/shop/purchases', { itemId, requestId });
      requestIds.current.delete(itemId);
      await refresh();
      setMessage('Vật phẩm đã vào kho của bạn.');
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
  return (
    <div className="narrow">
      <p className="eyebrow">CỬA HÀNG & KHO ĐỒ</p>
      <h1>
        Một chút <em>cá tính riêng.</em>
      </h1>
      <p className="lead">
        Cosmetic không thay đổi điểm hoặc luật chơi. Bạn đang có <strong>{balance} Coins</strong>.
      </p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="mode-grid">
        {items.map((item) => {
          const has = owned.items.some((row) => row.itemId === item.id);
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
                  else void purchase(item.id);
                }}
              >
                {equipped ? 'Đang trang bị' : has ? 'Trang bị' : 'Mua vật phẩm'}
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 24 }}>
        Bản nền tảng có cosmetic cơ bản. Gift, pet và vật phẩm trợ giúp sẽ được bổ sung sau khi chốt
        luật.
      </p>
    </div>
  );
}
