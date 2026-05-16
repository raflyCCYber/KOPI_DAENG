import { useEffect, useState } from 'react'
import { menuAPI } from '../services/api.js'

export default function CustomerMenu({ setCurrentPage, tableId, customerName }) {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMenu = async () => {
    setLoading(true)
    setError('')
    try {
      const items = await menuAPI.getAll()
      setMenuItems(items)
    } catch (err) {
      setError('Gagal memuat menu. Coba lagi nanti.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMenu() }, [])

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Menu Pelanggan</h2>
        <p className="text-gray-600 mt-2">Lihat pilihan menu kopi kami dan cari minuman favoritmu.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full">{tableId ? `Meja: ${tableId}` : 'Meja belum discan'}</span>
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">{customerName ? `Nama: ${customerName}` : 'Nama belum diisi'}</span>
        </div>
        {!tableId && <button onClick={() => setCurrentPage('qr-scanner')} className="mt-4 bg-amber-900 text-white px-4 py-2 rounded-full hover:bg-amber-800 transition">Scan Meja Dulu</button>}
      </div>

      {loading ? <p className="text-gray-600">Memuat menu...</p> : error ? <p className="text-red-600">{error}</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl shadow-md overflow-hidden hover:shadow-lg transition">
              <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3"><h3 className="text-xl font-semibold text-gray-900">{item.name}</h3><span className="text-sm bg-amber-100 text-amber-900 px-3 py-1 rounded-full">{item.category}</span></div>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="flex items-center justify-between"><span className="text-amber-900 font-bold">Rp {item.price.toLocaleString('id-ID')}</span><button onClick={() => setCurrentPage('order')} disabled={!tableId} className="bg-amber-900 text-white px-4 py-2 rounded-full hover:bg-amber-800 transition disabled:opacity-50">{tableId ? 'Pesan' : 'Scan Meja'}</button></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
