import { useMemo, useState } from 'react'
import { menuItems } from '../data/data.js'
import { ordersAPI } from '../services/api.js'

export default function Kasir() {
  const [cart, setCart] = useState([])
  const [processingPayment, setProcessingPayment] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const addItem = (item) => {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id)

      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        )
      }

      return [...prev, { ...item, qty: 1 }]
    })
  }

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  }, [cart])

  const handleProcessPayment = async () => {
    if (cart.length === 0) {
      setError('Tambahkan minimal satu item sebelum memproses pembayaran.')
      setMessage('')
      return
    }

    setProcessingPayment(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        customerName: 'Walk-in Kasir',
        tableId: 'KASIR',
        items: cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
        total,
        status: 'completed',
        paymentMethod: 'cash',
        paymentStatus: 'paid_at_cashier',
        cashierNote: 'Pembayaran diproses langsung oleh kasir.',
        date: new Date().toLocaleDateString('id-ID'),
        timestamp: new Date().toISOString()
      }

      const createdOrder = await ordersAPI.create(payload)
      setMessage(`Pembayaran berhasil diproses. Order ${createdOrder.id} sudah tersimpan.`)
      setCart([])
    } catch (err) {
      setError('Gagal memproses pembayaran kasir. Pastikan backend aktif.')
    } finally {
      setProcessingPayment(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Menu Kasir</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <div key={item.id} className="border rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-lg">{item.name}</h2>
                  <p className="text-gray-500 text-sm">Rp {item.price.toLocaleString('id-ID')}</p>
                </div>

                <button
                  onClick={() => addItem(item)}
                  className="bg-amber-900 text-white px-4 py-2 rounded-xl hover:bg-amber-800 transition"
                >
                  Tambah
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 h-fit">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pesanan</h2>

          <div className="space-y-3 mb-6">
            {cart.length === 0 && (
              <p className="text-gray-500">Belum ada pesanan.</p>
            )}

            {cart.map((item) => (
              <div key={item.id} className="flex justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.qty} x Rp {item.price.toLocaleString('id-ID')}</p>
                </div>

                <p className="font-semibold">Rp {(item.qty * item.price).toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Total</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {message && <p className="mb-3 text-sm text-green-700">{message}</p>}

            <button
              onClick={handleProcessPayment}
              disabled={processingPayment || cart.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingPayment ? 'Memproses Pembayaran...' : 'Proses Pembayaran'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
