'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditUtilitiesModal, { type UtilityProperty } from './EditUtilitiesModal'

export default function EditUtilitiesButton({ property }: { property: UtilityProperty }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#1C7BC0] hover:bg-[#1669A8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        Edit Utilities
      </button>
      {open && (
        <EditUtilitiesModal
          property={property}
          onClose={() => setOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  )
}
