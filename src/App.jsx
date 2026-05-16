import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import { API_BASE, clearAdminSession, getAdminSession, setAdminSession } from './services/api.js'
import AdminLogin from './admin/AdminLogin'
import Dashboard from './admin/Dashboard'
import Kasir from './admin/Kasir'
import MenuManagement from './admin/MenuManagement'
import Reports from './admin/Reports'
import StockManagement from './admin/StockManagement'
import Transactions from './admin/Transactions'
import CustomerHome from './customer/CustomerHome'
import CustomerHistory from './customer/CustomerHistory'
import CustomerInfo from './customer/CustomerInfo'
import CustomerMenu from './customer/CustomerMenu'
import CustomerOrder from './customer/CustomerOrder'
import CustomerPayment from './customer/CustomerPayment'
import CustomerQRScanner from './customer/CustomerQRScanner'

function getOrCreateCustomerDeviceId() {
  const key = 'daeng-kopi-device-id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = `device-${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(key, next)
  return next
}

export default function App() {
  const existingAdminSession = getAdminSession()
  const [currentPage, setCurrentPage] = useState('home')
  const [adminPage, setAdminPage] = useState('dashboard')
  const [adminUser, setAdminUser] = useState(existingAdminSession?.admin || null)
  const [customerName, setCustomerName] = useState(localStorage.getItem('daeng-kopi-customer-name') || '')
  const [tableId, setTableId] = useState(localStorage.getItem('daeng-kopi-table-id') || '')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('pay-later')
  const [backendReady, setBackendReady] = useState(true)
  const [backendMessage, setBackendMessage] = useState('')
  const [deviceId] = useState(getOrCreateCustomerDeviceId)

  useEffect(() => {
    localStorage.setItem('daeng-kopi-customer-name', customerName)
  }, [customerName])

  useEffect(() => {
    localStorage.setItem('daeng-kopi-table-id', tableId)
  }, [tableId])

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`)
        if (!response.ok) throw new Error('Backend unavailable')
        setBackendReady(true)
        setBackendMessage('')
      } catch (error) {
        setBackendReady(false)
        setBackendMessage('Backend tidak terhubung. Jalankan API server sebelum menguji semua fitur.')
      }
    }

    checkBackend()
  }, [])

  const handleModeChange = (mode) => {
    if (mode === 'customer') {
      setCurrentPage('home')
      return
    }
    setCurrentPage('admin-login')
  }

  const handleScanned = (scannedTableId) => {
    setTableId(scannedTableId)
    if (customerName) {
      setCurrentPage('menu')
    } else {
      setCurrentPage('customer-info')
    }
  }

  const handleCustomerBack = () => {
    const previousMap = {
      menu: 'home',
      order: 'menu',
      payment: 'order',
      history: 'home',
      'customer-info': 'qr-scanner',
      'qr-scanner': 'home'
    }
    setCurrentPage(previousMap[currentPage] || 'home')
  }

  const renderCustomerPage = () => {
    switch (currentPage) {
      case 'home':
        return <CustomerHome setCurrentPage={setCurrentPage} />
      case 'qr-scanner':
        return <CustomerQRScanner onScanned={handleScanned} setCurrentPage={setCurrentPage} currentTableId={tableId} />
      case 'customer-info':
        return <CustomerInfo setCurrentPage={setCurrentPage} setCustomerName={setCustomerName} nextPage="menu" tableId={tableId} initialName={customerName} />
      case 'menu':
        return <CustomerMenu setCurrentPage={setCurrentPage} tableId={tableId} customerName={customerName} />
      case 'order':
        return <CustomerOrder setCurrentPage={setCurrentPage} setSelectedOrder={setSelectedOrder} customerName={customerName} paymentMethod={paymentMethod} tableId={tableId} />
      case 'payment':
        return <CustomerPayment setCurrentPage={setCurrentPage} customerName={customerName} setPaymentMethod={setPaymentMethod} paymentMethod={paymentMethod} order={selectedOrder} tableId={tableId} deviceId={deviceId} />
      case 'history':
        return <CustomerHistory deviceId={deviceId} tableId={tableId} customerName={customerName} />
      default:
        return <CustomerHome setCurrentPage={setCurrentPage} />
    }
  }

  const renderAdminPage = () => {
    if (!adminUser) {
      return <AdminLogin onLoginSuccess={(session) => {
        const storedSession = setAdminSession(session)
        setAdminUser(storedSession?.admin || null)
        setCurrentPage('admin')
        setAdminPage('dashboard')
      }} />
    }

    const tabs = [
      ['dashboard', 'Dashboard'],
      ['transactions', 'Transaksi'],
      ['kasir', 'Kasir'],
      ['menu', 'Menu'],
      ['stock', 'Stok'],
      ['reports', 'Laporan']
    ]

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-md p-4 mb-6 flex flex-wrap gap-2">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setAdminPage(key)} className={`px-4 py-2 rounded-full transition ${adminPage === key ? 'bg-amber-900 text-white' : 'bg-amber-100 text-amber-900 hover:bg-amber-200'}`}>{label}</button>
          ))}
          <button onClick={() => { clearAdminSession(); setAdminUser(null); setCurrentPage('home') }} className="ml-auto px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">Logout</button>
        </div>

        {adminPage === 'dashboard' && <Dashboard />}
        {adminPage === 'transactions' && <Transactions />}
        {adminPage === 'kasir' && <Kasir />}
        {adminPage === 'menu' && <MenuManagement />}
        {adminPage === 'stock' && <StockManagement />}
        {adminPage === 'reports' && <Reports />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <Header mode={currentPage.startsWith('admin') || currentPage === 'admin-login' ? 'admin' : 'customer'} onModeChange={handleModeChange} customerName={customerName} tableId={tableId} backendReady={backendReady} />
      {!backendReady && <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-red-700">{backendMessage}</div>}

      {currentPage !== 'home' && !currentPage.startsWith('admin') && currentPage !== 'admin-login' && (
        <div className="max-w-7xl mx-auto px-4 pt-6"><button onClick={handleCustomerBack} className="px-4 py-2 rounded-full bg-white border border-amber-300 text-amber-900 hover:bg-amber-50">Kembali</button></div>
      )}

      {currentPage === 'admin-login' || currentPage === 'admin' ? renderAdminPage() : renderCustomerPage()}
      <Footer />
    </div>
  )
}
