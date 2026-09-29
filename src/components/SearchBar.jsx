import React from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Cari habit...' }) {
  return (
    <div className="search-bar">
      <Search className="search-icon" size={18} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Cari habit"
        className="search-input"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="search-clear"
          aria-label="Hapus kata kunci pencarian"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
