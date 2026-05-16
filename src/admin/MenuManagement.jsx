import { useEffect, useState } from 'react'
import { menuAPI } from '../services/api.js'

export default function MenuManagement() {
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
      setError('Gagal memuat data menu. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  const handleDelete = async (id) => {
    try {
      await menuAPI.delete(id)
      await loadMenu()
    } catch (err) {
      setError('Gagal menghapus item menu.')
    }
  }

  const handleEdit = async (item) => {
    const description = prompt('Deskripsi baru:', item.description)
    if (!description) return

    try {
      await menuAPI.update(item.id, { description })
      await loadMenu()
    } catch (err) {
      setError('Gagal memperbarui item menu.')
    }
  }

  const handleAdd = async () => {
    const name = prompt('Nama menu baru:')
    if (!name) return
    const price = Number(prompt('Harga menu (angka):', '25000'))
    if (!price || isNaN(price)) return
    const category = prompt('Kategori menu:', 'Coffee') || 'Coffee'
    const description = prompt('Deskripsi menu:', 'Deskripsi singkat') || ''

    try {
      await menuAPI.create({ name, price, category, description, stock: 10 })
      await loadMenu()
    } catch (err) {
      setError('Gagal menambahkan item baru.')
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold">Menu Management</h2>
          <p className="text-gray-600 mt-2">Kelola menu langsung lewat backend.</p>
        </div>
        <button onClick={handleAdd} className="bg-amber-900 text-white px-6 py-3 rounded-full hover:bg-amber-800 transition">+ Add New Item</button>
      </div>

      {loading ? <div className="text-center text-gray-600">Memuat menu...</div> : error ? <div className="text-center text-red-600">{error}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <h3 className="text-xl font-bold mb-2">{item.name}</h3>
              <p className="text-gray-600 text-sm mb-3">{item.category}</p>
              <p className="text-gray-700 mb-4">{item.description}</p>
              <div className="mb-4"><span className="text-sm text-gray-500">Stok:</span><span className="font-semibold ml-2">{item.stock ?? '-'}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-amber-900">Rp {item.price.toLocaleString('id-ID')}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
