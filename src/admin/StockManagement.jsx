import { useEffect, useState } from 'react'
import { menuAPI, stockAPI } from '../services/api.js'

export default function StockManagement() {
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
      setError('Gagal memuat data stok. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  const updateStock = async (item, delta) => {
    try {
      const nextStock = Math.max(0, (item.stock || 0) + delta)
      await stockAPI.update(item.id, nextStock)
      await loadMenu()
    } catch (err) {
      setError('Gagal memperbarui stok.')
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Stok Produk</h2>
        <p className="text-gray-600 mt-2">Pantau stok item menu dan tahu produk mana yang perlu diisi ulang.</p>
      </div>

      {loading ? <div className="text-gray-600">Memuat stok...</div> : error ? <div className="text-red-600">{error}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl shadow-md p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${item.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.stock <= 5 ? 'Stok Rendah' : 'Stok Aman'}</span>
              </div>
              <div className="flex justify-between items-center mb-4"><span className="text-gray-600">Stok tersisa</span><span className="text-2xl font-bold text-amber-900">{item.stock}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-4"><div className="h-3 bg-amber-900 rounded-full" style={{ width: `${Math.min(100, item.stock * 8)}%` }} /></div>
              <div className="flex gap-3">
                <button onClick={() => updateStock(item, 1)} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition">+ Tambah</button>
                <button onClick={() => updateStock(item, -1)} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition">- Kurangi</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
