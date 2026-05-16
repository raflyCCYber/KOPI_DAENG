export default function Header({ mode, onModeChange, customerName, tableId, backendReady }) {
  return (
    <header className="bg-amber-950 text-amber-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daeng Kopi Management</h1>
          <p className="text-sm text-amber-200">Order, payment, cashier, and realtime table monitoring</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`px-3 py-1 rounded-full ${backendReady ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'}`}>
            {backendReady ? 'Backend online' : 'Backend offline'}
          </span>
          {tableId && <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950">{tableId}</span>}
          {customerName && <span className="px-3 py-1 rounded-full bg-white text-amber-950">{customerName}</span>}
          <button
            onClick={() => onModeChange('customer')}
            className={`px-4 py-2 rounded-full transition ${mode === 'customer' ? 'bg-white text-amber-950' : 'bg-amber-800 text-white hover:bg-amber-700'}`}
          >
            Customer
          </button>
          <button
            onClick={() => onModeChange('admin-login')}
            className={`px-4 py-2 rounded-full transition ${mode.startsWith('admin') ? 'bg-white text-amber-950' : 'bg-amber-800 text-white hover:bg-amber-700'}`}
          >
            Admin
          </button>
        </div>
      </div>
    </header>
  )
}
