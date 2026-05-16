import { useEffect, useState } from 'react'
import { menuAPI, ordersAPI, reportsAPI, settingsAPI, tablesAPI } from '../services/api.js'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [tableStatus, setTableStatus] = useState(null)
  const [whatsAppNumber, setWhatsAppNumber] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadWarning, setLoadWarning] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    setLoadWarning('')

    const results = await Promise.allSettled([
      reportsAPI.getStats(),
      menuAPI.getAll(),
      ordersAPI.getAll(),
      settingsAPI.get(),
      tablesAPI.getStatus()
    ])

    const [statsResult, menuResult, ordersResult, settingsResult, tablesResult] = results
    if (statsResult.status === 'fulfilled') setStats(statsResult.value)
    if (menuResult.status === 'fulfilled') setMenuItems(menuResult.value)
    if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value)
    if (settingsResult.status === 'fulfilled') setWhatsAppNumber(settingsResult.value.whatsappNumber || '')
    if (tablesResult.status === 'fulfilled') setTableStatus(tablesResult.value)

    const failedCount = results.filter((result) => result.status === 'rejected').length
    if (failedCount === results.length) {
      setError('Gagal memuat data dashboard. Coba lagi nanti.')
    } else if (failedCount > 0) {
      setLoadWarning('Sebagian data dashboard gagal dimuat, tetapi halaman tetap bisa digunakan.')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveWhatsAppNumber = async (event) => {
    event.preventDefault()
    setSettingsMessage('')
    try {
      await settingsAPI.update({ whatsappNumber: whatsAppNumber })
      setSettingsMessage('Nomor WhatsApp berhasil disimpan.')
    } catch (err) {
      setSettingsMessage('Gagal menyimpan nomor WhatsApp.')
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Admin</h2>
        <p className="text-gray-600 mt-2">Ringkasan operasional toko, meja realtime, dan pengaturan admin.</p>
      </div>

      {loading ? <p className="text-gray-600">Memuat dashboard...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}
      {loadWarning ? <p className="text-amber-700 mb-4">{loadWarning}</p> : null}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-3xl shadow-md p-6"><p className="text-sm text-gray-500">Revenue</p><p className="text-3xl font-bold text-emerald-600">Rp {Number(stats?.totalRevenue || 0).toLocaleString('id-ID')}</p></div>
            <div className="bg-white rounded-3xl shadow-md p-6"><p className="text-sm text-gray-500">Completed</p><p className="text-3xl font-bold text-blue-600">{stats?.completedOrders || 0}</p></div>
            <div className="bg-white rounded-3xl shadow-md p-6"><p className="text-sm text-gray-500">Pending</p><p className="text-3xl font-bold text-orange-600">{stats?.pendingOrders || 0}</p></div>
            <div className="bg-white rounded-3xl shadow-md p-6"><p className="text-sm text-gray-500">Menu</p><p className="text-3xl font-bold text-amber-700">{menuItems.length}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-3xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">Status 14 Meja</h3>
              <p className="text-sm text-gray-600 mb-4">Tersedia: {tableStatus?.available ?? '-'} | Terpakai: {tableStatus?.occupied ?? '-'}</p>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {(tableStatus?.tables || []).map((table) => (
                  <div key={table.tableId} className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${table.status === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {table.tableId.replace('MEJA-', '')}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={saveWhatsAppNumber} className="bg-white rounded-3xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">Pengaturan WhatsApp</h3>
              <p className="text-sm text-gray-600 mb-4">Nomor ini dipakai customer untuk mengirim bukti pembayaran online.</p>
              <input
                value={whatsAppNumber}
                onChange={(e) => setWhatsAppNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 mb-4"
                placeholder="08xxxxxxxxxx"
              />
              <button className="bg-amber-900 text-white px-6 py-3 rounded-full hover:bg-amber-800 transition">Simpan Nomor</button>
              {settingsMessage && <p className="mt-3 text-sm text-gray-700">{settingsMessage}</p>}
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Pesanan Terbaru</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                  <div>
                    <p className="font-semibold">{order.id} - {order.customerName || order.customer || 'Pelanggan'}</p>
                    <p className="text-sm text-gray-500">{order.tableId || '-'} | {order.paymentMethod || '-'} | {order.status}</p>
                  </div>
                  <p className="font-bold text-amber-900">Rp {Number(order.total || 0).toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
