import { useEffect, useState } from 'react'
import { ordersAPI } from '../services/api.js'

export default function Transactions() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')
  const [noteDrafts, setNoteDrafts] = useState({})

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ordersAPI.getAll()
      setOrders(data)
      setNoteDrafts(Object.fromEntries(data.map((order) => [order.id, order.cashierNote || ''])))
    } catch (err) {
      setError('Gagal memuat transaksi. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [])

  const statusOptions = ['pending', 'preparing', 'completed', 'rejected']

  const updateOrder = async (order, updates) => {
    setSavingId(order.id)
    setError('')
    try {
      await ordersAPI.update(order.id, updates)
      await loadOrders()
    } catch (err) {
      setError('Gagal memperbarui status transaksi.')
    } finally {
      setSavingId('')
    }
  }

  const getDraftNote = (order) => (noteDrafts[order.id] ?? order.cashierNote ?? '').trim()
  const isOnlinePayment = (order) => order.paymentMethod === 'online'
  const isOnlineVerified = (order) => order.paymentProofStatus === 'verified' || order.paymentStatus === 'paid_verified_by_cashier'
  const isCashierPayment = (order) => order.paymentMethod === 'pay-later' || order.paymentMethod === 'cash'
  const isCashierPaid = (order) => order.paymentStatus === 'paid_at_cashier' || order.status === 'completed'

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Kelola Transaksi</h2>
        <p className="text-gray-600 mt-2">Lihat status transaksi pelanggan dan perbarui jika diperlukan.</p>
      </div>

      {loading ? <div className="text-gray-600">Memuat transaksi...</div> : error ? <div className="text-red-600 mb-6">{error}</div> : (
        <div className="bg-white rounded-3xl shadow-md overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-amber-900 text-white rounded-t-3xl"><tr><th className="px-6 py-4 text-left">Order ID</th><th className="px-6 py-4 text-left">Pelanggan</th><th className="px-6 py-4 text-left">Items</th><th className="px-6 py-4 text-left">Total</th><th className="px-6 py-4 text-left">Tanggal</th><th className="px-6 py-4 text-left">Meja</th><th className="px-6 py-4 text-left">Bayar</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-left">Aksi</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-b-0 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-gray-900">{order.customer || order.customerName || 'Pelanggan'}</td>
                  <td className="px-6 py-4 text-gray-600">{Array.isArray(order.items) ? order.items.map((item) => typeof item === 'string' ? item : item.name ? `${item.name}${item.qty ? ` x${item.qty}` : ''}` : JSON.stringify(item)).join(', ') : order.items}</td>
                  <td className="px-6 py-4 font-bold text-amber-900">Rp {Number(order.total || 0).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-gray-600">{order.date || order.timestamp?.split('T')[0]}</td>
                  <td className="px-6 py-4 text-gray-700">{order.tableId || '-'}</td>
                  <td className="px-6 py-4 text-gray-700"><div className="text-sm"><p className="font-medium">{order.paymentMethod || '-'}</p><p className="text-xs text-gray-500">{order.paymentProofStatus || order.paymentStatus || '-'}</p></div></td>
                  <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-sm ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'preparing' ? 'bg-blue-100 text-blue-800' : order.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span></td>
                  <td className="px-6 py-4"><div className="space-y-2 min-w-[220px]">
                    <select value={order.status} onChange={(e) => updateOrder(order, { status: e.target.value })} disabled={savingId === order.id} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                    <textarea value={noteDrafts[order.id] ?? ''} rows={2} placeholder="Catatan kasir untuk customer" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" onChange={(e) => setNoteDrafts((current) => ({ ...current, [order.id]: e.target.value }))} onBlur={(e) => { const nextNote = e.target.value.trim(); if ((order.cashierNote || '') === nextNote) return; updateOrder(order, { cashierNote: nextNote }) }} />
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateOrder(order, { paymentProofStatus: 'verified', paymentStatus: 'paid_verified_by_cashier', cashierNote: getDraftNote(order) || 'Pembayaran online sudah diverifikasi kasir.' })} disabled={savingId === order.id || !isOnlinePayment(order) || isOnlineVerified(order)} className="w-full bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{isOnlineVerified(order) ? 'Bukti Online Sudah Diverifikasi' : 'Verifikasi Bukti Online'}</button>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => updateOrder(order, { paymentStatus: 'paid_at_cashier', status: order.status === 'pending' ? 'completed' : order.status, cashierNote: getDraftNote(order) || 'Pembayaran diterima langsung di kasir.' })} disabled={savingId === order.id || !isCashierPayment(order) || isCashierPaid(order)} className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">{isCashierPaid(order) ? 'Sudah Dibayar di Kasir' : 'Tandai Bayar di Kasir'}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
