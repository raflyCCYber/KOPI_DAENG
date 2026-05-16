import { useEffect, useState } from 'react'
import { ordersAPI } from '../services/api.js'

const normalizeText = (value) => String(value || '').trim().toLowerCase()

export default function CustomerHistory({ deviceId, tableId, customerName }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ordersAPI.getAll()
      const filteredOrders = data.filter((order) => {
        const matchDevice = deviceId ? order.deviceId === deviceId : true
        const matchTable = tableId ? normalizeText(order.tableId) === normalizeText(tableId) : true
        const matchName = customerName ? normalizeText(order.customerName || order.customer) === normalizeText(customerName) : true
        return matchDevice && matchTable && matchName
      })
      setOrders(filteredOrders)
    } catch (err) {
      setError('Gagal memuat riwayat pesanan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const intervalId = setInterval(loadOrders, 5000)
    return () => clearInterval(intervalId)
  }, [deviceId, tableId, customerName])

  const pendingOrders = orders.filter(order => order.status === 'pending')
  const completedOrders = orders.filter(order => order.status === 'completed')
  const preparingOrders = orders.filter(order => order.status === 'preparing')

  const OrderSection = ({ title, orders: orderList, bgColor }) => (
    <div className="mb-8">
      <h3 className={`text-2xl font-bold ${bgColor} text-white px-4 py-2 rounded-lg mb-4`}>{title}</h3>
      {orderList.length === 0 ? <p className="text-gray-500 text-center py-8">Tidak ada pesanan {title.toLowerCase()}</p> : <div className="space-y-4">{orderList.map((order) => <div key={order.id} className="bg-white rounded-3xl shadow-md p-6"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><p className="text-sm text-gray-500">Order ID</p><h3 className="text-xl font-semibold text-gray-900">{order.id}</h3></div><div className="text-right"><p className="text-sm text-gray-500">Status</p><span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{order.status}</span></div></div><div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-600"><div><p className="text-sm">Pelanggan</p><p className="font-medium">{order.customerName || order.customer || 'Pelanggan'}</p></div><div><p className="text-sm">Tanggal</p><p className="font-medium">{order.date || order.timestamp?.split('T')[0]}</p></div><div><p className="text-sm">Meja</p><p className="font-medium">{order.tableId || '-'}</p></div><div><p className="text-sm">Pembayaran</p><p className="font-medium">{order.paymentMethod || order.payment || 'Tunai'}</p></div><div><p className="text-sm">Verifikasi</p><p className="font-medium">{order.paymentProofStatus || order.paymentStatus || '-'}</p></div></div>{order.cashierNote && <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-200 p-4"><p className="text-sm text-blue-700 font-semibold mb-1">Info dari Kasir</p><p className="text-sm text-blue-900">{order.cashierNote}</p></div>}<div className="mt-4"><p className="text-sm text-gray-500 mb-2">Items:</p><ul className="list-disc list-inside text-gray-700">{Array.isArray(order.items) ? order.items.map((item, index) => <li key={index}>{typeof item === 'string' ? item : item.name ? `${item.name}${item.qty ? ` x${item.qty}` : ''}` : JSON.stringify(item)}</li>) : <li>{String(order.items)}</li>}</ul></div></div>)}</div>}
    </div>
  )

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8"><h2 className="text-3xl font-bold text-gray-900">Riwayat Pesanan</h2><p className="text-gray-600 mt-2">Riwayat dengan filter gabungan HP + meja + nama pelanggan.</p><div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full">HP: {deviceId || '-'}</span><span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Meja: {tableId || '-'}</span><span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">Nama: {customerName || '-'}</span></div></div>
      {loading ? <p className="text-gray-600">Memuat riwayat pesanan...</p> : error ? <p className="text-red-600">{error}</p> : <><OrderSection title="Pesanan Pending" orders={pendingOrders} bgColor="bg-yellow-500" /><OrderSection title="Sedang Dipersiapkan" orders={preparingOrders} bgColor="bg-blue-500" /><OrderSection title="Pesanan Selesai" orders={completedOrders} bgColor="bg-green-500" /></>}
    </section>
  )
}
