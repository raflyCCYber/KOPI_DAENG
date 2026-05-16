import { useEffect, useState } from 'react'
import { menuAPI } from '../services/api.js'

export default function CustomerOrder({ setCurrentPage, setSelectedOrder, customerName, paymentMethod, tableId }) {
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true)
      setError('')
      try {
        const items = await menuAPI.getAll()
        setCart(items.map((item) => ({ ...item, qty: 0 })))
      } catch (err) {
        setError('Gagal memuat menu. Coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    loadMenu()
  }, [])

  const updateQty = (id, delta) => {
    setCart((current) => current.map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
  }

  const orderItems = cart.filter((item) => item.qty > 0)
  const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  const handleCheckout = () => {
    if (orderItems.length === 0) {
      setError('Pilih setidaknya satu item untuk memesan.')
      return
    }

    setError('')
    setSelectedOrder({
      id: `ORD${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customerName || 'Pelanggan',
      tableId: tableId || 'walk-in',
      items: orderItems.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      total,
      status: 'pending',
      date: new Date().toLocaleDateString('id-ID'),
      paymentMethod: paymentMethod || 'pay-later',
      timestamp: new Date().toISOString()
    })
    setCurrentPage('payment')
  }

  if (!tableId) {
    return <section className="max-w-4xl mx-auto px-4 py-12"><div className="bg-white rounded-3xl shadow-md p-8 text-center"><p className="text-gray-700 mb-4">Anda harus scan barcode meja sebelum membuat pesanan.</p><button onClick={() => setCurrentPage('qr-scanner')} className="bg-amber-900 text-white px-6 py-3 rounded-full hover:bg-amber-800 transition">Scan Meja</button></div></section>
  }

  if (!customerName) {
    return <section className="max-w-4xl mx-auto px-4 py-12"><div className="bg-white rounded-3xl shadow-md p-8 text-center"><p className="text-gray-700 mb-4">Isi nama pelanggan terlebih dahulu sebelum pesan.</p><button onClick={() => setCurrentPage('customer-info')} className="bg-amber-900 text-white px-6 py-3 rounded-full hover:bg-amber-800 transition">Isi Nama</button></div></section>
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Pesan Sekarang</h2>
        <p className="text-gray-600 mt-2">Pilih menu kopi, atur kuantitas, lalu lanjutkan ke pembayaran.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full">Meja: {tableId}</span><span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">Nama: {customerName}</span></div>
      </div>

      {loading ? <p className="text-gray-600">Memuat menu...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl shadow-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h3 className="text-xl font-semibold text-gray-900">{item.name}</h3><p className="text-gray-600">{item.description}</p><p className="text-amber-900 font-bold mt-2">Rp {item.price.toLocaleString('id-ID')}</p></div>
                <div className="flex items-center gap-3"><button onClick={() => updateQty(item.id, -1)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition">-</button><span className="w-10 text-center text-lg font-semibold">{item.qty}</span><button onClick={() => updateQty(item.id, 1)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition">+</button></div>
              </div>
            ))}
          </div>

          <aside className="bg-white rounded-3xl shadow-md p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ringkasan Pesanan</h3>
            <div className="space-y-3 mb-6">{orderItems.length === 0 ? <p className="text-gray-600">Belum ada item yang dipilih.</p> : orderItems.map((item) => <div key={item.id} className="flex justify-between"><span>{item.name} x{item.qty}</span><span className="font-semibold">Rp {(item.price * item.qty).toLocaleString('id-ID')}</span></div>)}</div>
            <div className="border-t border-gray-200 pt-4"><div className="flex justify-between font-semibold mb-4"><span>Total</span><span>Rp {total.toLocaleString('id-ID')}</span></div>{error && <p className="text-sm text-red-600 mb-4">{error}</p>}<button onClick={handleCheckout} className="w-full bg-amber-900 text-white rounded-full py-3 font-semibold hover:bg-amber-800 transition">Lanjut ke Pembayaran</button></div>
          </aside>
        </div>
      )}
    </section>
  )
}
