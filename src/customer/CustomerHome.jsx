import { useEffect, useState } from 'react'
import { menuAPI } from '../services/api.js'

export default function CustomerHome({ setCurrentPage }) {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
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

    loadMenu()
  }, [])

  return (
    <section className="bg-amber-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-r from-amber-900 to-amber-700 text-white rounded-3xl p-12 shadow-xl mb-12">
          <h1 className="text-5xl font-bold mb-4">Selamat datang di Daeng Kopi</h1>
          <p className="text-lg max-w-2xl">Scan QR atau barcode untuk memulai pemesanan, lihat menu, bayar, dan cek riwayat pesananmu.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button onClick={() => setCurrentPage('qr-scanner')} className="bg-white text-amber-900 rounded-full px-8 py-4 font-semibold hover:bg-amber-100 transition">Scan Meja & Mulai</button>
            <button onClick={() => setCurrentPage('qr-scanner')} className="bg-amber-100 text-amber-900 rounded-full px-8 py-4 font-semibold hover:bg-amber-200 transition">Scan QR / Pesan</button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Menu Populer</h2>
          <p className="text-gray-600">Pilih kopi favoritmu dan pesan langsung dari sini.</p>
        </div>

        {loading ? <p className="text-gray-600">Memuat menu...</p> : error ? <p className="text-red-600">{error}</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white rounded-3xl shadow-md p-6 hover:shadow-lg transition">
                <div className="flex items-center justify-between mb-4"><h3 className="text-2xl font-semibold text-gray-900">{item.name}</h3><span className="text-sm bg-amber-100 text-amber-900 px-3 py-1 rounded-full">{item.category}</span></div>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="flex items-center justify-between"><span className="text-amber-900 font-bold">Rp {item.price.toLocaleString('id-ID')}</span><button onClick={() => setCurrentPage('qr-scanner')} className="bg-amber-900 text-white px-4 py-2 rounded-full hover:bg-amber-800 transition">Pesan</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
